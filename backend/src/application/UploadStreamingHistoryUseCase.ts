import { randomUUID, createHash } from 'crypto';
import type { SpotifyStreamEntry, UploadResponse } from '@music-livereview/shared';
import type { UploadStreamingHistory, UploadOptions } from '../domain/port/inbound/UploadStreamingHistory.js';
import type { UploadSessionRepository } from '../domain/port/outbound/UploadSessionRepository.js';
import type {
  StreamEntryRepository,
  AggregatedIngestData,
  SessionSummary,
  MonthlyArtistBucket,
  MonthlyTrackBucket,
  MonthlyHeatmapBucket,
  TrackFirstPlay,
  MonthlyTotalBucket,
  MonthlyStaminaBucket,
} from '../domain/port/outbound/StreamEntryRepository.js';
import type { TokenGenerator } from '../domain/port/outbound/TokenGenerator.js';
import type { AggregatedStatsStore } from '../domain/port/outbound/AggregatedStatsStore.js';
import { UploadSession } from '../domain/model/UploadSession.js';
import { ShareToken } from '../domain/model/ShareToken.js';
import { ListeningPeriod } from '../domain/model/ListeningPeriod.js';

export class UploadStreamingHistoryUseCase implements UploadStreamingHistory {
  constructor(
    private readonly sessionRepo: UploadSessionRepository,
    private readonly entryRepo: StreamEntryRepository,
    private readonly tokenGenerator: TokenGenerator,
    private readonly statsStore: AggregatedStatsStore,
  ) {}

  async execute(rawEntries: SpotifyStreamEntry[], options?: UploadOptions): Promise<UploadResponse> {
    const tokenValue = this.tokenGenerator.generate();
    const shareToken = ShareToken.fromGenerated(tokenValue);
    const sessionId = randomUUID();
    const optOut = options?.optOut ?? false;

    // Prefer the hash computed in the browser; fall back to extracting from entries
    // (backend safety net in case the frontend didn't strip the field yet)
    const userHash = options?.userHash
      ?? (() => {
        const username = rawEntries.find(e => e.username)?.username ?? null;
        return username ? createHash('sha256').update(username).digest('hex') : null;
      })();

    const session = UploadSession.create(sessionId, shareToken, userHash, !optOut);

    await this.sessionRepo.save(session);

    // Process in background (non-blocking)
    this.processEntries(session, rawEntries).catch(err => {
      console.error(`Processing failed for session ${sessionId}:`, err);
    });

    return { shareToken: tokenValue, status: 'processing' };
  }

  async getStatus(token: string): Promise<{ status: string; entryCount?: number; dateFrom?: string; dateTo?: string } | null> {
    const session = await this.sessionRepo.findByToken(token);
    if (!session) return null;

    return {
      status: session.status,
      entryCount: session.entryCount ?? undefined,
      dateFrom: session.period?.from.toISOString(),
      dateTo: session.period?.to.toISOString(),
    };
  }

  private async processEntries(session: UploadSession, rawEntries: SpotifyStreamEntry[]): Promise<void> {
    try {
      session.markProcessing();
      await this.sessionRepo.save(session);

      const { summary, aggregated } = this.aggregateEntries(rawEntries);

      await this.entryRepo.saveAggregatedData(session.id, aggregated);
      await this.entryRepo.saveSessionSummary(session.id, summary);

      const period = new ListeningPeriod(summary.dateFrom, summary.dateTo);
      session.markCompleted(summary.totalEntries, summary.totalMsPlayed, period);
      await this.sessionRepo.save(session);

      // Deactivate older sessions from the same user so only this one counts in community stats.
      // Skip when opted out — the new session is already inactive, old ones should stay as-is.
      if (session.userHash && session.isActive) {
        await this.sessionRepo.deactivatePreviousSessions(session.userHash, session.id);
      }

      // Refresh community stats in background — don't await, failure is non-fatal
      this.statsStore.refreshMaterializedViews().catch(err => {
        console.warn('Materialized view refresh failed (non-fatal):', err);
      });
    } catch (err) {
      session.markFailed();
      await this.sessionRepo.save(session);
      throw err;
    }
  }

  private aggregateEntries(rawEntries: SpotifyStreamEntry[]): { summary: SessionSummary; aggregated: AggregatedIngestData } {
    // Accumulation maps
    const artistMonthly = new Map<string, { playCount: number; msPlayed: number; skipCount: number; deliberateCount: number; servedCount: number; weekdayPlayCount: number; weekendPlayCount: number; weekdaySkipCount: number; weekendSkipCount: number }>();
    const trackMonthly = new Map<string, { trackName: string; artistName: string; albumName: string | null; spotifyTrackUri: string | null; playCount: number; msPlayed: number; skipCount: number; backCount: number; shufflePlayCount: number; shuffleTrackdoneCount: number; deliberateCount: number; servedCount: number; shortPlayCount: number; trackdoneCount: number; fwdSkipCount: number }>();
    const heatmapMonthly = new Map<string, number>();
    const trackFirstPlayMap = new Map<string, Date>();
    const monthlyTotals = new Map<string, { playCount: number; msPlayed: number; podcastPlayCount: number; podcastMsPlayed: number; shuffleCount: number }>();

    // Summary accumulators
    let totalMs = 0;
    let totalEntries = 0;
    const uniqueTracks = new Set<string>();
    const uniqueArtists = new Set<string>();
    const uniqueAlbums = new Set<string>();
    let dateFrom: Date | null = null;
    let dateTo: Date | null = null;

    for (const e of rawEntries) {
      if (!e.ts || e.ms_played == null) continue;

      const ts = new Date(e.ts);
      const monthDate = new Date(Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), 1));
      const monthStr = monthDate.toISOString().slice(0, 10); // "YYYY-MM-01"
      const dow = ts.getUTCDay();
      const hour = ts.getUTCHours();
      const skipped = e.skipped ?? false;
      const wentBack = e.reason_start === 'backbtn';
      const isShufflePlay = e.shuffle === true;
      const isShuffleTrackdone = isShufflePlay && e.reason_end === 'trackdone';
      const isPodcast = !e.master_metadata_track_name && (e.episode_name != null || e.spotify_episode_uri != null);
      const isDeliberate = e.reason_start === 'clickrow' || e.reason_start === 'playbtn' || e.reason_start === 'backbtn';
      const isServed = e.reason_start === 'trackdone' || e.reason_start === 'fwdbtn';
      const isShortPlay = e.ms_played < 30000;
      const isTrackdone = e.reason_end === 'trackdone';
      const isFwdSkip = e.reason_end === 'fwdbtn';

      // Summary
      totalEntries++;
      totalMs += e.ms_played;
      if (e.spotify_track_uri) uniqueTracks.add(e.spotify_track_uri);
      if (e.master_metadata_album_artist_name) uniqueArtists.add(e.master_metadata_album_artist_name);
      if (e.master_metadata_album_album_name) uniqueAlbums.add(e.master_metadata_album_album_name);
      if (!dateFrom || ts < dateFrom) dateFrom = ts;
      if (!dateTo || ts > dateTo) dateTo = ts;

      // Artist monthly
      const isWeekend = dow === 0 || dow === 6;
      if (e.master_metadata_album_artist_name) {
        const key = `${monthStr}|${e.master_metadata_album_artist_name}`;
        const existing = artistMonthly.get(key);
        if (existing) {
          existing.playCount++;
          existing.msPlayed += e.ms_played;
          if (skipped) existing.skipCount++;
          if (isDeliberate) existing.deliberateCount++;
          if (isServed) existing.servedCount++;
          if (isWeekend) { existing.weekendPlayCount++; if (skipped) existing.weekendSkipCount++; }
          else { existing.weekdayPlayCount++; if (skipped) existing.weekdaySkipCount++; }
        } else {
          artistMonthly.set(key, {
            playCount: 1,
            msPlayed: e.ms_played,
            skipCount: skipped ? 1 : 0,
            deliberateCount: isDeliberate ? 1 : 0,
            servedCount: isServed ? 1 : 0,
            weekdayPlayCount: isWeekend ? 0 : 1,
            weekendPlayCount: isWeekend ? 1 : 0,
            weekdaySkipCount: !isWeekend && skipped ? 1 : 0,
            weekendSkipCount: isWeekend && skipped ? 1 : 0,
          });
        }
      }

      // Track monthly
      if (e.master_metadata_track_name && e.master_metadata_album_artist_name) {
        const key = `${monthStr}|${e.master_metadata_track_name}|${e.master_metadata_album_artist_name}`;
        const existing = trackMonthly.get(key);
        if (existing) {
          existing.playCount++;
          existing.msPlayed += e.ms_played;
          if (skipped) existing.skipCount++;
          if (wentBack) existing.backCount++;
          if (isShufflePlay) existing.shufflePlayCount++;
          if (isShuffleTrackdone) existing.shuffleTrackdoneCount++;
          if (isDeliberate) existing.deliberateCount++;
          if (isServed) existing.servedCount++;
          if (isShortPlay) existing.shortPlayCount++;
          if (isTrackdone) existing.trackdoneCount++;
          if (isFwdSkip) existing.fwdSkipCount++;
        } else {
          trackMonthly.set(key, {
            trackName: e.master_metadata_track_name,
            artistName: e.master_metadata_album_artist_name,
            albumName: e.master_metadata_album_album_name,
            spotifyTrackUri: e.spotify_track_uri,
            playCount: 1,
            msPlayed: e.ms_played,
            skipCount: skipped ? 1 : 0,
            backCount: wentBack ? 1 : 0,
            shufflePlayCount: isShufflePlay ? 1 : 0,
            shuffleTrackdoneCount: isShuffleTrackdone ? 1 : 0,
            deliberateCount: isDeliberate ? 1 : 0,
            servedCount: isServed ? 1 : 0,
            shortPlayCount: isShortPlay ? 1 : 0,
            trackdoneCount: isTrackdone ? 1 : 0,
            fwdSkipCount: isFwdSkip ? 1 : 0,
          });
        }
      }

      // Heatmap monthly
      const heatKey = `${monthStr}:${dow}:${hour}`;
      heatmapMonthly.set(heatKey, (heatmapMonthly.get(heatKey) ?? 0) + e.ms_played);

      // Track first play
      if (e.spotify_track_uri) {
        const existing = trackFirstPlayMap.get(e.spotify_track_uri);
        if (!existing || ts < existing) {
          trackFirstPlayMap.set(e.spotify_track_uri, ts);
        }
      }

      // Monthly totals
      const mt = monthlyTotals.get(monthStr);
      if (mt) {
        mt.playCount++;
        mt.msPlayed += e.ms_played;
        if (isPodcast) { mt.podcastPlayCount++; mt.podcastMsPlayed += e.ms_played; }
        if (isShufflePlay) mt.shuffleCount++;
      } else {
        monthlyTotals.set(monthStr, {
          playCount: 1,
          msPlayed: e.ms_played,
          podcastPlayCount: isPodcast ? 1 : 0,
          podcastMsPlayed: isPodcast ? e.ms_played : 0,
          shuffleCount: isShufflePlay ? 1 : 0,
        });
      }
    }

    // Session Stamina — detect consecutive reason_start='trackdone' chains
    const staminaMonthly = new Map<string, { totalChainLength: number; chainCount: number }>();
    const sorted = rawEntries
      .filter(e => e.ts && e.ms_played != null)
      .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

    if (sorted.length > 0) {
      let chainStartTs = new Date(sorted[0].ts);
      let chainLength = 1;

      const recordChain = (startTs: Date, length: number) => {
        const m = new Date(Date.UTC(startTs.getUTCFullYear(), startTs.getUTCMonth(), 1));
        const key = `${m.toISOString().slice(0, 10)}:${startTs.getUTCDay()}:${startTs.getUTCHours()}`;
        const existing = staminaMonthly.get(key);
        if (existing) {
          existing.totalChainLength += length;
          existing.chainCount++;
        } else {
          staminaMonthly.set(key, { totalChainLength: length, chainCount: 1 });
        }
      };

      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].reason_start === 'trackdone') {
          chainLength++;
        } else {
          recordChain(chainStartTs, chainLength);
          chainStartTs = new Date(sorted[i].ts);
          chainLength = 1;
        }
      }
      recordChain(chainStartTs, chainLength);
    }

    // Convert maps to bucket arrays
    const artistBuckets: MonthlyArtistBucket[] = [];
    for (const [key, val] of artistMonthly) {
      const [monthStr, artistName] = key.split('|');
      artistBuckets.push({
        month: new Date(monthStr),
        artistName,
        playCount: val.playCount,
        msPlayed: val.msPlayed,
        skipCount: val.skipCount,
        deliberateCount: val.deliberateCount,
        servedCount: val.servedCount,
        weekdayPlayCount: val.weekdayPlayCount,
        weekendPlayCount: val.weekendPlayCount,
        weekdaySkipCount: val.weekdaySkipCount,
        weekendSkipCount: val.weekendSkipCount,
      });
    }

    const trackBuckets: MonthlyTrackBucket[] = [];
    for (const [key, val] of trackMonthly) {
      const monthStr = key.split('|')[0];
      trackBuckets.push({ month: new Date(monthStr), ...val });
    }

    const heatmapBuckets: MonthlyHeatmapBucket[] = [];
    for (const [key, msPlayed] of heatmapMonthly) {
      const [monthStr, dowStr, hourStr] = key.split(':');
      heatmapBuckets.push({
        month: new Date(monthStr),
        dayOfWeek: Number(dowStr),
        hourOfDay: Number(hourStr),
        msPlayed,
      });
    }

    const trackFirstPlays: TrackFirstPlay[] = [];
    for (const [uri, ts] of trackFirstPlayMap) {
      trackFirstPlays.push({
        spotifyTrackUri: uri,
        firstPlayMonth: new Date(Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), 1)),
      });
    }

    const monthlyTotalBuckets: MonthlyTotalBucket[] = [];
    for (const [monthStr, val] of monthlyTotals) {
      monthlyTotalBuckets.push({
        month: new Date(monthStr),
        playCount: val.playCount,
        msPlayed: val.msPlayed,
        podcastPlayCount: val.podcastPlayCount,
        podcastMsPlayed: val.podcastMsPlayed,
        shuffleCount: val.shuffleCount,
      });
    }

    const staminaBuckets: MonthlyStaminaBucket[] = [];
    for (const [key, val] of staminaMonthly) {
      const [monthStr, dowStr, hourStr] = key.split(':');
      staminaBuckets.push({
        month: new Date(monthStr),
        dayOfWeek: Number(dowStr),
        hourOfDay: Number(hourStr),
        totalChainLength: val.totalChainLength,
        chainCount: val.chainCount,
      });
    }

    const summary: SessionSummary = {
      totalMsPlayed: totalMs,
      totalEntries,
      uniqueTracks: uniqueTracks.size,
      uniqueArtists: uniqueArtists.size,
      uniqueAlbums: uniqueAlbums.size,
      dateFrom: dateFrom ?? new Date(),
      dateTo: dateTo ?? new Date(),
    };

    return {
      summary,
      aggregated: {
        artistBuckets,
        trackBuckets,
        heatmapBuckets,
        trackFirstPlays,
        monthlyTotals: monthlyTotalBuckets,
        staminaBuckets,
      },
    };
  }
}
