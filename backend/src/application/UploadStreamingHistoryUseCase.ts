import { randomUUID } from 'crypto';
import type { UploadResponse, UploadAggregatedRequest } from '@music-livereview/shared';
import type { UploadStreamingHistory, UploadOptions } from '../domain/port/inbound/UploadStreamingHistory.js';
import type { UploadSessionRepository } from '../domain/port/outbound/UploadSessionRepository.js';
import type {
  StreamEntryRepository,
  AggregatedIngestData,
  SessionSummary,
  MonthlyArtistBucket,
  MonthlyTrackBucket,
  MonthlyHourlyStatsBucket,
  TrackFirstPlay,
  MonthlyTotalBucket,
  MarathonBucket,
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

  async executeAggregated(data: UploadAggregatedRequest, options?: UploadOptions): Promise<UploadResponse> {
    const tokenValue = this.tokenGenerator.generate();
    const shareToken = ShareToken.fromGenerated(tokenValue);
    const sessionId = randomUUID();
    const optOut = options?.optOut ?? data.optOut ?? false;
    const userHash = data.userHash ?? null;

    const session = UploadSession.create(sessionId, shareToken, userHash, !optOut);
    await this.sessionRepo.save(session);

    // Process in background (non-blocking)
    this.processAggregated(session, data).catch(err => {
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

  private async processAggregated(session: UploadSession, data: UploadAggregatedRequest): Promise<void> {
    try {
      session.markProcessing();
      await this.sessionRepo.save(session);

      // Resolve catalog IDs
      // Collect artist names from both artistBuckets and trackBuckets to ensure
      // every track's artist exists in artist_catalog before the FK insert.
      const allArtistNames = new Set<string>([
        ...data.artistBuckets.map(b => b.artistName),
        ...data.trackBuckets.map(b => b.artistName),
      ]);
      const artistIdMap = await this.entryRepo.upsertArtistCatalog(
        Array.from(allArtistNames).map(n => ({ artistName: n })),
      );

      const uniqueTracks = new Map<string, { trackName: string; artistName: string; albumName: string | null; spotifyTrackUri: string | null }>();
      for (const b of data.trackBuckets) {
        const key = `${b.trackName}\0${b.artistName}`;
        if (!uniqueTracks.has(key)) {
          uniqueTracks.set(key, {
            trackName: b.trackName,
            artistName: b.artistName,
            albumName: b.albumName,
            spotifyTrackUri: b.spotifyTrackUri,
          });
        }
      }
      const trackIdMap = await this.entryRepo.upsertTrackCatalog(
        Array.from(uniqueTracks.values()),
        artistIdMap,
      );

      // Build URI → track_id for first-play resolution
      const uriToTrackId = new Map<string, number>();
      for (const b of data.trackBuckets) {
        if (b.spotifyTrackUri) {
          const tid = trackIdMap.get(`${b.trackName}\0${b.artistName}`);
          if (tid !== undefined) uriToTrackId.set(b.spotifyTrackUri, tid);
        }
      }

      // Convert client buckets → internal types with IDs attached
      const artistBuckets: MonthlyArtistBucket[] = data.artistBuckets.map(b => ({
        month: new Date(b.month),
        artistId: artistIdMap.get(b.artistName) ?? 0,
        artistName: b.artistName,
        playCount: b.playCount,
        msPlayed: b.msPlayed,
        skipCount: b.skipCount,
        deliberateCount: b.deliberateCount,
        servedCount: b.servedCount,
        weekdayPlayCount: b.weekdayPlayCount,
        weekendPlayCount: b.weekendPlayCount,
        weekdaySkipCount: b.weekdaySkipCount,
        weekendSkipCount: b.weekendSkipCount,
      }));

      const trackBuckets: MonthlyTrackBucket[] = data.trackBuckets.map(b => ({
        month: new Date(b.month),
        trackId: trackIdMap.get(`${b.trackName}\0${b.artistName}`) ?? 0,
        artistId: artistIdMap.get(b.artistName) ?? 0,
        trackName: b.trackName,
        artistName: b.artistName,
        albumName: b.albumName,
        spotifyTrackUri: b.spotifyTrackUri,
        playCount: b.playCount,
        msPlayed: b.msPlayed,
        skipCount: b.skipCount,
        backCount: b.backCount,
        shufflePlayCount: b.shufflePlayCount,
        shuffleTrackdoneCount: b.shuffleTrackdoneCount,
        deliberateCount: b.deliberateCount,
        servedCount: b.servedCount,
        shortPlayCount: b.shortPlayCount,
        trackdoneCount: b.trackdoneCount,
        fwdSkipCount: b.fwdSkipCount,
      }));

      const hourlyStatsBuckets: MonthlyHourlyStatsBucket[] = data.hourlyStatsBuckets.map(b => ({
        month: new Date(b.month),
        dayOfWeek: b.dayOfWeek,
        hourOfDay: b.hourOfDay,
        msPlayed: b.msPlayed,
        totalChainLength: b.totalChainLength,
        chainCount: b.chainCount,
      }));

      // Resolve track first plays: URI → trackId, keep earliest per trackId
      const firstPlayByTrackId = new Map<number, Date>();
      for (const fp of data.trackFirstPlays) {
        const trackId = uriToTrackId.get(fp.spotifyTrackUri);
        if (trackId !== undefined) {
          const date = new Date(fp.firstPlayMonth);
          const existing = firstPlayByTrackId.get(trackId);
          if (!existing || date < existing) firstPlayByTrackId.set(trackId, date);
        }
      }
      const trackFirstPlays: TrackFirstPlay[] = [];
      for (const [trackId, date] of firstPlayByTrackId) {
        trackFirstPlays.push({ trackId, firstPlayMonth: date });
      }

      const monthlyTotals: MonthlyTotalBucket[] = data.monthlyTotals.map(b => ({
        month: new Date(b.month),
        playCount: b.playCount,
        msPlayed: b.msPlayed,
        podcastPlayCount: b.podcastPlayCount,
        podcastMsPlayed: b.podcastMsPlayed,
        shuffleCount: b.shuffleCount,
      }));

      const marathons: MarathonBucket[] = data.marathons.map(m => ({
        startTime: new Date(m.startTime),
        endTime: new Date(m.endTime),
        durationMs: m.durationMs,
        playCount: m.playCount,
        skipCount: m.skipCount,
        skipRate: m.skipRate,
        topArtist: m.topArtist,
        topTrack: m.topTrack,
        topTrackArtist: m.topTrackArtist,
        rank: m.rank,
      }));

      const aggregated: AggregatedIngestData = {
        artistBuckets,
        trackBuckets,
        hourlyStatsBuckets,
        trackFirstPlays,
        monthlyTotals,
        marathons,
      };

      const summary: SessionSummary = {
        totalMsPlayed: data.summary.totalMsPlayed,
        totalEntries: data.summary.totalEntries,
        uniqueTracks: data.summary.uniqueTracks,
        uniqueArtists: data.summary.uniqueArtists,
        uniqueAlbums: data.summary.uniqueAlbums,
        dateFrom: new Date(data.summary.dateFrom),
        dateTo: new Date(data.summary.dateTo),
      };

      await this.entryRepo.saveAggregatedData(session.id, aggregated);
      await this.entryRepo.saveSessionSummary(session.id, summary);

      const period = new ListeningPeriod(summary.dateFrom, summary.dateTo);
      session.markCompleted(summary.totalEntries, summary.totalMsPlayed, period);
      await this.sessionRepo.save(session);

      if (session.userHash && session.isActive) {
        await this.sessionRepo.deactivatePreviousSessions(session.userHash, session.id);
      }

      this.statsStore.refreshMaterializedViews().catch(err => {
        console.warn('Materialized view refresh failed (non-fatal):', err);
      });
    } catch (err) {
      session.markFailed();
      await this.sessionRepo.save(session);
      throw err;
    }
  }
}
