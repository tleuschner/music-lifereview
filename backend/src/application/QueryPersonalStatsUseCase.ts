import { MS_PER_HOUR } from '@music-livereview/shared';
import type {
  StatsFilter,
  OverviewResponse,
  TopArtistEntry,
  TopTrackEntry,
  TimelinePoint,
  HeatmapResponse,
  ArtistTimelineResponse,
  DiscoveryRatePoint,
  SkippedTrackEntry,
  ArtistSkipRateEntry,
  BackButtonTrackEntry,
  ContentSplitPoint,
  ObsessionPhasePoint,
  SessionStaminaResponse,
} from '@music-livereview/shared';
import type { QueryPersonalStats } from '../domain/port/inbound/QueryPersonalStats.js';
import type { UploadSessionRepository } from '../domain/port/outbound/UploadSessionRepository.js';
import type { StreamEntryRepository } from '../domain/port/outbound/StreamEntryRepository.js';

export class QueryPersonalStatsUseCase implements QueryPersonalStats {
  constructor(
    private readonly sessionRepo: UploadSessionRepository,
    private readonly entryRepo: StreamEntryRepository,
  ) {}

  private async resolveSessionId(token: string): Promise<string | null> {
    const session = await this.sessionRepo.findByToken(token);
    if (!session || session.status !== 'completed') return null;
    return session.id;
  }

  async getOverview(token: string, _filters: StatsFilter): Promise<OverviewResponse | null> {
    const session = await this.sessionRepo.findByToken(token);
    if (!session || session.status !== 'completed') return null;

    // Read from pre-computed session_summaries — avoids full scan of stream_entries on every page load
    const summary = await this.entryRepo.getSessionSummary(session.id);
    if (!summary) return null;
    const totalHours = summary.totalMsPlayed / MS_PER_HOUR;

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      totalDays: Math.round(totalHours / 24 * 10) / 10,
      totalPlays: summary.totalEntries,
      uniqueTracks: summary.uniqueTracks,
      uniqueArtists: summary.uniqueArtists,
      uniqueAlbums: summary.uniqueAlbums,
      dateFrom: summary.dateFrom.toISOString(),
      dateTo: summary.dateTo.toISOString(),
    };
  }

  async getTopArtists(token: string, filters: StatsFilter): Promise<TopArtistEntry[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getTopArtists(sessionId, filters);
    return rows.map(r => ({
      name: r.artistName,
      playCount: Number(r.playCount),
      totalHours: Math.round(Number(r.totalMs) / MS_PER_HOUR * 10) / 10,
    }));
  }

  async getTopTracks(token: string, filters: StatsFilter): Promise<TopTrackEntry[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getTopTracks(sessionId, filters);
    return rows.map(r => ({
      name: r.trackName,
      artistName: r.artistName,
      playCount: Number(r.playCount),
      totalHours: Math.round(Number(r.totalMs) / MS_PER_HOUR * 10) / 10,
    }));
  }

  async getTimeline(token: string, filters: StatsFilter): Promise<TimelinePoint[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getTimeline(sessionId, filters);
    return rows.map(r => ({
      period: r.period,
      totalHours: Math.round(Number(r.totalMs) / MS_PER_HOUR * 10) / 10,
      totalPlays: Number(r.totalPlays),
    }));
  }

  async getHeatmap(token: string, filters: StatsFilter): Promise<HeatmapResponse | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getHeatmap(sessionId, filters);

    // Build 7×24 matrix (Mon=0 to Sun=6, 0h to 23h)
    const data: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const row of rows) {
      // PostgreSQL DOW: 0=Sun, 1=Mon..6=Sat → remap to Mon=0..Sun=6
      const dayIndex = row.dayOfWeek === 0 ? 6 : row.dayOfWeek - 1;
      data[dayIndex][row.hourOfDay] = Math.round(Number(row.totalMs) / MS_PER_HOUR * 10) / 10;
    }

    return { data };
  }

  async getTopArtistsOverTime(token: string, limit: number, filters: StatsFilter): Promise<ArtistTimelineResponse | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const result = await this.entryRepo.getTopArtistsOverTime(sessionId, limit, filters);

    // Convert ms to hours
    return {
      periods: result.periods,
      artists: result.artists.map(a => ({
        name: a.name,
        values: a.values.map(v => Math.round(v / MS_PER_HOUR * 10) / 10),
      })),
    };
  }

  async getDiscoveryRate(token: string, filters: StatsFilter): Promise<DiscoveryRatePoint[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getDiscoveryRate(sessionId, filters);
    return rows.map(r => {
      const total = r.newSongs + r.repeats;
      return {
        period: r.period,
        newSongs: r.newSongs,
        repeats: r.repeats,
        discoveryRate: total > 0 ? Math.round(r.newSongs / total * 1000) / 10 : 0,
      };
    });
  }

  async getSkippedTracks(token: string, limit: number): Promise<SkippedTrackEntry[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getSkippedTracks(sessionId, limit);
    return rows.map(r => ({
      name: r.trackName,
      artistName: r.artistName,
      skipCount: Number(r.skipCount),
      totalPlays: Number(r.totalPlays),
      skipRate: Number(r.skipRate),
      avgListenSec: Number(r.avgListenSec),
    }));
  }

  async getArtistLoyalty(token: string, filters: StatsFilter): Promise<ArtistSkipRateEntry[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getArtistSkipRates(sessionId, filters);
    return rows.map(r => ({
      name: r.artistName,
      totalPlays: Number(r.totalPlays),
      totalSkips: Number(r.totalSkips),
      skipRate: Number(r.skipRate),
    }));
  }

  async getBackButtonTracks(token: string, limit: number): Promise<BackButtonTrackEntry[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getBackButtonTracks(sessionId, limit);
    return rows.map(r => ({
      name: r.trackName,
      artistName: r.artistName,
      backCount: Number(r.backCount),
      totalPlays: Number(r.totalPlays),
      replayRate: Number(r.replayRate),
    }));
  }

  async getArtistCumulative(token: string, limit: number, filters: StatsFilter): Promise<ArtistTimelineResponse | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const result = await this.entryRepo.getArtistCumulative(sessionId, limit, filters);

    return {
      periods: result.periods,
      artists: result.artists.map(a => ({
        name: a.name,
        values: a.values.map(v => Math.round(v / MS_PER_HOUR * 10) / 10),
      })),
    };
  }

  async getContentSplit(token: string, filters: StatsFilter): Promise<ContentSplitPoint[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getContentSplit(sessionId, filters);
    return rows.map(r => ({
      period: r.period,
      musicHours: Math.round(r.musicMs / MS_PER_HOUR * 10) / 10,
      podcastHours: Math.round(r.podcastMs / MS_PER_HOUR * 10) / 10,
      musicPlays: r.musicPlays,
      podcastPlays: r.podcastPlays,
    }));
  }

  async getObsessionTimeline(token: string, filters: StatsFilter): Promise<ObsessionPhasePoint[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getObsessionTimeline(sessionId, filters);
    return rows.map(r => ({
      period: r.period,
      artistName: r.artistName,
      artistHours: Math.round(r.artistMs / MS_PER_HOUR * 10) / 10,
      totalHours: Math.round(r.totalMs / MS_PER_HOUR * 10) / 10,
      percentage: r.percentage,
    }));
  }

  async getSessionStamina(token: string, filters: StatsFilter): Promise<SessionStaminaResponse | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getSessionStamina(sessionId, filters);

    // Build 7×24 matrix (Mon=0..Sun=6, 0h..23h)
    const data: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let totalChains = 0;
    let totalLength = 0;

    for (const row of rows) {
      const dayIndex = row.dayOfWeek === 0 ? 6 : row.dayOfWeek - 1;
      const avg = row.chainCount > 0
        ? Math.round(row.totalChainLength / row.chainCount * 10) / 10
        : 0;
      data[dayIndex][row.hourOfDay] = avg;
      totalChains += row.chainCount;
      totalLength += row.totalChainLength;
    }

    const overallAverage = totalChains > 0
      ? Math.round(totalLength / totalChains * 10) / 10
      : 0;

    return { data, overallAverage };
  }
}
