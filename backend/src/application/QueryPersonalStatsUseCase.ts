import { MS_PER_HOUR } from '@music-livereview/shared';
import type {
  StatsFilter,
  OverviewResponse,
  TopArtistEntry,
  TopTrackEntry,
  TimelinePoint,
  HeatmapResponse,
  ArtistTimelineResponse,
  TrackTimelineResponse,
  DiscoveryRatePoint,
  SkippedTrackEntry,
  ArtistSkipRateEntry,
  BackButtonTrackEntry,
  ContentSplitPoint,
  ObsessionPhasePoint,
  TrackObsessionPoint,
  SessionStaminaResponse,
  ArtistIntentEntry,
  TrackIntentEntry,
  PersonalityInputsResponse,
  ShuffleSerendipityEntry,
  IntroTestEntry,
  ArtistDiscoveryEntry,
  WeekdayWeekendResponse,
  AlbumListenerEntry,
  SkipGraveyardEntry,
  SeasonalArtistEntry,
  ReboundArtistEntry,
  MarathonEntry,
} from '@music-livereview/shared';
import type { QueryPersonalStats } from '../domain/port/inbound/QueryPersonalStats.js';
import type { UploadSessionRepository } from '../domain/port/outbound/UploadSessionRepository.js';
import type { StreamEntryRepository } from '../domain/port/outbound/StreamEntryRepository.js';

export class QueryPersonalStatsUseCase implements QueryPersonalStats {
  // Cache token → session ID for 60s to avoid a DB round-trip on every endpoint call
  private readonly sessionIdCache = new Map<string, { id: string; expiresAt: number }>();

  constructor(
    private readonly sessionRepo: UploadSessionRepository,
    private readonly entryRepo: StreamEntryRepository,
  ) {}

  private async resolveSessionId(token: string): Promise<string | null> {
    const cached = this.sessionIdCache.get(token);
    if (cached && cached.expiresAt > Date.now()) return cached.id;

    const session = await this.sessionRepo.findByToken(token);
    if (!session || session.status !== 'completed') return null;

    this.sessionIdCache.set(token, { id: session.id, expiresAt: Date.now() + 60_000 });
    return session.id;
  }

  async getOverview(token: string, _filters: StatsFilter): Promise<OverviewResponse | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    // Read from pre-computed session_summaries — avoids full scan of stream_entries on every page load
    const summary = await this.entryRepo.getSessionSummary(sessionId);
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

  async getTopTracksOverTime(token: string, limit: number, filters: StatsFilter): Promise<TrackTimelineResponse | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const result = await this.entryRepo.getTopTracksOverTime(sessionId, limit, filters);

    return {
      periods: result.periods,
      tracks: result.tracks.map(t => ({
        name: t.name,
        artistName: t.artistName,
        values: t.values.map(v => Math.round(v / MS_PER_HOUR * 10) / 10),
      })),
    };
  }

  async getTrackCumulative(token: string, limit: number, filters: StatsFilter): Promise<TrackTimelineResponse | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const result = await this.entryRepo.getTrackCumulative(sessionId, limit, filters);

    return {
      periods: result.periods,
      tracks: result.tracks.map(t => ({
        name: t.name,
        artistName: t.artistName,
        values: t.values.map(v => Math.round(v / MS_PER_HOUR * 10) / 10),
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

  async getTrackObsessionTimeline(token: string, filters: StatsFilter): Promise<TrackObsessionPoint[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getTrackObsessionTimeline(sessionId, filters);
    return rows.map(r => ({
      period: r.period,
      trackName: r.trackName,
      artistName: r.artistName,
      trackHours: Math.round(r.trackMs / MS_PER_HOUR * 10) / 10,
      totalHours: Math.round(r.totalMs / MS_PER_HOUR * 10) / 10,
      percentage: r.percentage,
    }));
  }

  async getArtistIntent(token: string, filters: StatsFilter): Promise<ArtistIntentEntry[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getArtistIntent(sessionId, filters);
    return rows.map(r => ({
      name: r.artistName,
      totalPlays: r.totalPlays,
      deliberatePlays: r.deliberatePlays,
      servedPlays: r.servedPlays,
      deliberateRate: r.deliberateRate,
    }));
  }

  async getTrackIntent(token: string, filters: StatsFilter, limit: number): Promise<TrackIntentEntry[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getTrackIntent(sessionId, filters, limit);
    return rows.map(r => ({
      name: r.trackName,
      artistName: r.artistName,
      totalPlays: r.totalPlays,
      deliberatePlays: r.deliberatePlays,
      servedPlays: r.servedPlays,
      deliberateRate: r.deliberateRate,
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

  async getPersonalityInputs(token: string): Promise<PersonalityInputsResponse | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;
    return this.entryRepo.getPersonalityInputs(sessionId);
  }

  async recordPersonality(token: string, personalityId: string): Promise<boolean> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return false;
    await this.entryRepo.upsertPersonalityRecord(sessionId, personalityId);
    return true;
  }

  async getShuffleSerendipity(token: string, limit: number): Promise<ShuffleSerendipityEntry[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getShuffleSerendipity(sessionId, limit);
    return rows.map(r => ({
      name: r.trackName,
      artistName: r.artistName,
      shufflePlays: r.shufflePlays,
      completionRate: r.completionRate,
      totalPlays: r.totalPlays,
    }));
  }

  async getIntroTestTracks(token: string, limit: number): Promise<IntroTestEntry[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getIntroTestTracks(sessionId, limit);
    return rows.map(r => ({
      name: r.trackName,
      artistName: r.artistName,
      totalPlays: r.totalPlays,
      shortPlayCount: r.shortPlayCount,
      completionCount: r.completionCount,
    }));
  }

  async getArtistDiscovery(token: string, filters: StatsFilter): Promise<ArtistDiscoveryEntry[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getArtistDiscovery(sessionId, filters);
    return rows.map(r => ({
      name: r.artistName,
      discoveryYear: r.discoveryYear,
      totalHours: Math.round(r.totalMs / MS_PER_HOUR * 10) / 10,
    }));
  }

  async getAlbumListeners(token: string, filters: StatsFilter): Promise<AlbumListenerEntry[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getAlbumListeners(sessionId, filters);
    return rows.map(r => ({
      name: r.artistName,
      totalPlays: r.totalPlays,
      uniqueTracks: r.uniqueTracks,
      albumCount: r.albumCount,
      topTrackName: r.topTrackName,
      topTrackPct: r.topTrackPct,
      avgTracksPerAlbum: r.avgTracksPerAlbum,
    }));
  }

  async getSkipGraveyard(token: string, limit: number): Promise<SkipGraveyardEntry[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getSkipGraveyard(sessionId, limit);
    return rows.map(r => ({
      name: r.trackName,
      artistName: r.artistName,
      fwdSkipCount: r.fwdSkipCount,
      totalPlays: r.totalPlays,
      fwdSkipRate: r.fwdSkipRate,
      avgListenSec: r.avgListenSec,
    }));
  }

  async getSeasonalArtists(token: string): Promise<SeasonalArtistEntry[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getSeasonalArtists(sessionId);
    return rows.map(r => ({
      name: r.artistName,
      season: r.season as SeasonalArtistEntry['season'],
      peakPlays: r.peakPlays,
      totalPlays: r.totalPlays,
      peakPct: r.peakPct,
      activeYears: r.activeYears,
    }));
  }

  async getReboundArtists(token: string, limit: number): Promise<ReboundArtistEntry[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getReboundArtists(sessionId, limit);
    return rows.map(r => ({
      artistName: r.artistName,
      peakMonth: r.peakMonth,
      peakPlays: r.peakPlays,
      cooldownMonths: r.cooldownMonths,
      revivalMonth: r.revivalMonth,
      revivalPlays: r.revivalPlays,
      reboundScore: r.reboundScore,
    }));
  }

  async getMarathons(token: string, filters: StatsFilter): Promise<MarathonEntry[] | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const rows = await this.entryRepo.getMarathons(sessionId, filters);
    return rows.map(r => {
      const mood = r.skipRate < 10 ? 'In the Zone' : r.skipRate < 25 ? 'Exploratory' : 'Restless';
      const date = r.startTime.toISOString().slice(0, 10);
      return {
        rank: r.rank,
        date,
        durationMinutes: Math.round(r.durationMs / 60000),
        playCount: r.playCount,
        skipRate: r.skipRate,
        mood,
        topArtist: r.topArtist,
        topTrack: r.topTrack,
        topTrackArtist: r.topTrackArtist,
      };
    });
  }

  async getWeekdayWeekend(token: string, filters: StatsFilter): Promise<WeekdayWeekendResponse | null> {
    const sessionId = await this.resolveSessionId(token);
    if (!sessionId) return null;

    const row = await this.entryRepo.getWeekdayWeekend(sessionId, filters);

    const mapSlice = (s: typeof row.weekday) => ({
      totalHours: Math.round(s.totalMs / MS_PER_HOUR * 10) / 10,
      avgSessionLength: s.avgSessionLength,
      skipRate: s.skipRate,
      topArtists: s.topArtists,
    });

    return { weekday: mapSlice(row.weekday), weekend: mapSlice(row.weekend) };
  }
}
