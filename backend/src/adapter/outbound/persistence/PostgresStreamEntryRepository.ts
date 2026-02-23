import type { Knex } from 'knex';
import { BATCH_INSERT_SIZE } from '@music-livereview/shared';
import type { StatsFilter } from '@music-livereview/shared';
import type {
  StreamEntryRepository,
  AggregatedIngestData,
  SessionSummary,
  ArtistStatRow,
  TrackStatRow,
  TimelineRow,
  HeatmapRow,
  DiscoveryRow,
  SkippedRow,
  ArtistSkipRateRow,
  BackButtonRow,
  ContentSplitRow,
  ObsessionPhaseRow,
  StaminaRow,
  ArtistIntentRow,
  TrackIntentRow,
  PersonalityInputsRow,
  ShuffleSerendipityRow,
  IntroTestRow,
  ArtistDiscoveryRow,
  WeekdayWeekendRow,
  AlbumListenerRow,
  SkipGraveyardRow,
  SeasonalArtistRow,
  ReboundArtistRow,
  MarathonRow,
} from '../../../domain/port/outbound/StreamEntryRepository.js';

export class PostgresStreamEntryRepository implements StreamEntryRepository {
  constructor(private readonly db: Knex) {}

  async saveAggregatedData(sessionId: string, data: AggregatedIngestData): Promise<void> {
    await this.db.transaction(async (trx) => {
      // Monthly artist stats
      for (let i = 0; i < data.artistBuckets.length; i += BATCH_INSERT_SIZE) {
        const batch = data.artistBuckets.slice(i, i + BATCH_INSERT_SIZE).map(b => ({
          session_id: sessionId,
          month: b.month,
          artist_id: b.artistId,
          play_count: b.playCount,
          ms_played: b.msPlayed,
          skip_count: b.skipCount,
          deliberate_count: b.deliberateCount,
          served_count: b.servedCount,
          weekday_play_count: b.weekdayPlayCount,
          weekend_play_count: b.weekendPlayCount,
          weekday_skip_count: b.weekdaySkipCount,
          weekend_skip_count: b.weekendSkipCount,
        }));
        await trx('monthly_artist_stats').insert(batch);
      }

      // Monthly track stats
      for (let i = 0; i < data.trackBuckets.length; i += BATCH_INSERT_SIZE) {
        const batch = data.trackBuckets.slice(i, i + BATCH_INSERT_SIZE).map(b => ({
          session_id: sessionId,
          month: b.month,
          track_id: b.trackId,
          artist_id: b.artistId,
          play_count: b.playCount,
          ms_played: b.msPlayed,
          skip_count: b.skipCount,
          back_count: b.backCount,
          shuffle_play_count: b.shufflePlayCount,
          shuffle_trackdone_count: b.shuffleTrackdoneCount,
          deliberate_count: b.deliberateCount,
          served_count: b.servedCount,
          short_play_count: b.shortPlayCount,
          trackdone_count: b.trackdoneCount,
          fwd_skip_count: b.fwdSkipCount,
        }));
        await trx('monthly_track_stats').insert(batch);
      }

      // Monthly hourly stats (merged heatmap + stamina)
      for (let i = 0; i < data.hourlyStatsBuckets.length; i += BATCH_INSERT_SIZE) {
        const batch = data.hourlyStatsBuckets.slice(i, i + BATCH_INSERT_SIZE).map(b => ({
          session_id: sessionId,
          month: b.month,
          day_of_week: b.dayOfWeek,
          hour_of_day: b.hourOfDay,
          ms_played: b.msPlayed,
          total_chain_length: b.totalChainLength,
          chain_count: b.chainCount,
        }));
        await trx('monthly_hourly_stats').insert(batch);
      }

      // Track first play
      for (let i = 0; i < data.trackFirstPlays.length; i += BATCH_INSERT_SIZE) {
        const batch = data.trackFirstPlays.slice(i, i + BATCH_INSERT_SIZE).map(b => ({
          session_id: sessionId,
          track_id: b.trackId,
          first_play_month: b.firstPlayMonth,
        }));
        await trx('track_first_play').insert(batch);
      }

      // Monthly listen totals
      for (let i = 0; i < data.monthlyTotals.length; i += BATCH_INSERT_SIZE) {
        const batch = data.monthlyTotals.slice(i, i + BATCH_INSERT_SIZE).map(b => ({
          session_id: sessionId,
          month: b.month,
          play_count: b.playCount,
          ms_played: b.msPlayed,
          podcast_play_count: b.podcastPlayCount,
          podcast_ms_played: b.podcastMsPlayed,
          shuffle_count: b.shuffleCount,
        }));
        await trx('monthly_listen_totals').insert(batch);
      }

      // Marathon sessions — chunked to avoid pg's 65535 bind-parameter limit
      if (data.marathons.length > 0) {
        const rows = data.marathons.map(m => ({
          session_id: sessionId,
          start_time: m.startTime,
          end_time: m.endTime,
          duration_ms: m.durationMs,
          play_count: m.playCount,
          skip_count: m.skipCount,
          skip_rate: m.skipRate,
          top_artist: m.topArtist,
          top_track: m.topTrack,
          top_track_artist: m.topTrackArtist,
          rank: m.rank,
        }));
        const CHUNK = 500;
        for (let i = 0; i < rows.length; i += CHUNK) {
          await trx('marathon_sessions').insert(rows.slice(i, i + CHUNK));
        }
      }

    });
  }

  async getSessionSummary(sessionId: string): Promise<SessionSummary | null> {
    const row = await this.db('session_summaries').where('session_id', sessionId).first();
    if (!row) return null;
    return {
      totalMsPlayed: Number(row.total_ms_played),
      totalEntries: Number(row.total_entries),
      uniqueTracks: Number(row.unique_tracks),
      uniqueArtists: Number(row.unique_artists),
      uniqueAlbums: Number(row.unique_albums),
      dateFrom: new Date(row.date_from),
      dateTo: new Date(row.date_to),
    };
  }

  async saveSessionSummary(sessionId: string, summary: SessionSummary): Promise<void> {
    await this.db('session_summaries')
      .insert({
        session_id: sessionId,
        total_ms_played: summary.totalMsPlayed,
        total_entries: summary.totalEntries,
        unique_tracks: summary.uniqueTracks,
        unique_artists: summary.uniqueArtists,
        unique_albums: summary.uniqueAlbums,
        date_from: summary.dateFrom,
        date_to: summary.dateTo,
      })
      .onConflict('session_id')
      .merge();
  }

  async getTopArtists(sessionId: string, filters: StatsFilter): Promise<ArtistStatRow[]> {
    const query = this.db('monthly_artist_stats as a')
      .join('artist_catalog as ac', 'a.artist_id', 'ac.id')
      .where('a.session_id', sessionId)
      .select(
        this.db.raw('ac.artist_name as "artistName"'),
        this.db.raw('SUM(a.play_count)::integer as "playCount"'),
        this.db.raw('SUM(a.ms_played)::bigint as "totalMs"'),
      )
      .groupBy('a.artist_id', 'ac.artist_name');

    this.applyMonthFilters(query, filters, 'a');

    const sortCol = filters.sort === 'count' ? '"playCount"' : '"totalMs"';
    query.orderByRaw(`${sortCol} DESC`);
    query.limit(filters.limit ?? 20);

    return query;
  }

  async getTopTracks(sessionId: string, filters: StatsFilter): Promise<TrackStatRow[]> {
    const query = this.db('monthly_track_stats as t')
      .join('track_catalog as tc', 't.track_id', 'tc.id')
      .where('t.session_id', sessionId)
      .select(
        this.db.raw('tc.track_name as "trackName"'),
        this.db.raw('tc.artist_name as "artistName"'),
        this.db.raw('SUM(t.play_count)::integer as "playCount"'),
        this.db.raw('SUM(t.ms_played)::bigint as "totalMs"'),
      )
      .groupBy('t.track_id', 'tc.track_name', 'tc.artist_name');

    this.applyMonthFilters(query, filters, 't');

    const sortCol = filters.sort === 'count' ? '"playCount"' : '"totalMs"';
    query.orderByRaw(`${sortCol} DESC`);
    query.limit(filters.limit ?? 20);

    return query;
  }

  async getTimeline(sessionId: string, filters: StatsFilter): Promise<TimelineRow[]> {
    const query = this.db('monthly_listen_totals')
      .where('session_id', sessionId)
      .select(
        this.db.raw("to_char(month, 'YYYY-MM') as period"),
        this.db.raw('ms_played as "totalMs"'),
        this.db.raw('play_count as "totalPlays"'),
      )
      .orderBy('month');

    this.applyMonthFilters(query, filters);

    return query;
  }

  async getHeatmap(sessionId: string, filters: StatsFilter): Promise<HeatmapRow[]> {
    const query = this.db('monthly_hourly_stats')
      .where('session_id', sessionId)
      .select(
        this.db.raw('day_of_week as "dayOfWeek"'),
        this.db.raw('hour_of_day as "hourOfDay"'),
        this.db.raw('SUM(ms_played)::bigint as "totalMs"'),
      )
      .groupBy('day_of_week', 'hour_of_day');

    this.applyMonthFilters(query, filters);

    return query;
  }

  async getTopArtistsOverTime(
    sessionId: string,
    limit: number,
    filters: StatsFilter,
  ): Promise<{ periods: string[]; artists: Array<{ name: string; values: number[] }> }> {
    // Step 1: top N artists
    const topArtistsQuery = this.db('monthly_artist_stats as a')
      .join('artist_catalog as ac', 'a.artist_id', 'ac.id')
      .where('a.session_id', sessionId)
      .select('a.artist_id', this.db.raw('ac.artist_name'))
      .sum('a.ms_played as total')
      .groupBy('a.artist_id', 'ac.artist_name')
      .orderBy('total', 'desc')
      .limit(limit);

    this.applyMonthFilters(topArtistsQuery, filters, 'a');
    const topArtists = await topArtistsQuery as Array<{ artist_id: number; artist_name: string }>;
    const artistIds = topArtists.map(r => r.artist_id);

    if (artistIds.length === 0) return { periods: [], artists: [] };

    // Step 2: monthly data for those artists
    const query = this.db('monthly_artist_stats as a')
      .where('a.session_id', sessionId)
      .whereIn('a.artist_id', artistIds)
      .select(
        this.db.raw("to_char(a.month, 'YYYY-MM') as period"),
        'a.artist_id',
        this.db.raw('a.ms_played as total_ms'),
      )
      .orderBy('a.month');

    this.applyMonthFilters(query, filters, 'a');
    const rows: Array<{ period: string; artist_id: number; total_ms: string }> = await query;

    // Pivot
    const periodSet = new Set<string>();
    const artistMap = new Map<number, Map<string, number>>();
    for (const id of artistIds) artistMap.set(id, new Map());

    for (const row of rows) {
      periodSet.add(row.period);
      artistMap.get(row.artist_id)?.set(row.period, Number(row.total_ms));
    }

    const periods = Array.from(periodSet).sort();
    const artists = topArtists.map(({ artist_id, artist_name }) => ({
      name: artist_name,
      values: periods.map(p => artistMap.get(artist_id)?.get(p) ?? 0),
    }));

    return { periods, artists };
  }

  async getDiscoveryRate(sessionId: string, filters: StatsFilter): Promise<DiscoveryRow[]> {
    const sql = `
      SELECT
        to_char(t.month, 'YYYY-MM') as period,
        SUM(CASE WHEN t.month = fp.first_play_month THEN t.play_count ELSE 0 END)::integer as new_songs,
        SUM(CASE WHEN t.month != fp.first_play_month THEN t.play_count ELSE 0 END)::integer as repeats
      FROM monthly_track_stats t
      JOIN track_first_play fp
        ON t.session_id = fp.session_id
        AND t.track_id = fp.track_id
      WHERE t.session_id = ?
        ${filters.from ? "AND t.month >= date_trunc('month', ?::date)" : ""}
        ${filters.to ? "AND t.month <= date_trunc('month', ?::date)" : ""}
      GROUP BY t.month
      ORDER BY t.month
    `;

    const bindings: unknown[] = [sessionId];
    if (filters.from) bindings.push(filters.from);
    if (filters.to) bindings.push(filters.to);

    const result = await this.db.raw(sql, bindings);
    return result.rows.map((r: { period: string; new_songs: string; repeats: string }) => ({
      period: r.period,
      newSongs: Number(r.new_songs),
      repeats: Number(r.repeats),
    }));
  }

  async getSkippedTracks(sessionId: string, limit: number): Promise<SkippedRow[]> {
    const sql = `
      SELECT
        tc.track_name,
        tc.artist_name,
        SUM(t.skip_count)::integer                                                   AS skip_count,
        SUM(t.play_count)::integer                                                   AS total_plays,
        ROUND(SUM(t.skip_count) * 100.0 / NULLIF(SUM(t.play_count), 0), 1)          AS skip_rate,
        ROUND(SUM(t.ms_played)::numeric / NULLIF(SUM(t.play_count), 0) / 1000.0, 1) AS avg_listen_sec
      FROM monthly_track_stats t
      JOIN track_catalog tc ON t.track_id = tc.id
      WHERE t.session_id = ?
        AND t.skip_count > 0
      GROUP BY t.track_id, tc.track_name, tc.artist_name
      HAVING SUM(t.skip_count) >= 3
      ORDER BY SUM(t.skip_count) DESC
      LIMIT ?
    `;
    const result = await this.db.raw(sql, [sessionId, limit]);
    return result.rows.map((r: {
      track_name: string;
      artist_name: string;
      skip_count: string;
      total_plays: string;
      skip_rate: string;
      avg_listen_sec: string;
    }) => ({
      trackName: r.track_name,
      artistName: r.artist_name,
      skipCount: Number(r.skip_count),
      totalPlays: Number(r.total_plays),
      skipRate: Number(r.skip_rate),
      avgListenSec: Number(r.avg_listen_sec),
    }));
  }

  async getArtistSkipRates(sessionId: string, filters: StatsFilter): Promise<ArtistSkipRateRow[]> {
    const sql = `
      WITH qualified AS (
        SELECT
          a.artist_id,
          ac.artist_name,
          SUM(a.play_count)::integer AS total_plays,
          SUM(a.skip_count)::integer AS total_skips,
          ROUND(SUM(a.skip_count) * 100.0 / NULLIF(SUM(a.play_count), 0), 1) AS skip_rate
        FROM monthly_artist_stats a
        JOIN artist_catalog ac ON a.artist_id = ac.id
        WHERE a.session_id = ?
          ${filters.from ? "AND a.month >= date_trunc('month', ?::date)" : ''}
          ${filters.to ? "AND a.month <= date_trunc('month', ?::date)" : ''}
        GROUP BY a.artist_id, ac.artist_name
        HAVING SUM(a.play_count) >= 100
      ),
      ranked AS (
        SELECT *,
          ROW_NUMBER() OVER (ORDER BY skip_rate ASC)  AS rank_asc,
          ROW_NUMBER() OVER (ORDER BY skip_rate DESC) AS rank_desc
        FROM qualified
      )
      SELECT artist_name, total_plays, total_skips, skip_rate
      FROM ranked
      WHERE rank_asc <= 50 OR rank_desc <= 50
      ORDER BY skip_rate ASC
    `;

    const bindings: unknown[] = [sessionId];
    if (filters.from) bindings.push(filters.from);
    if (filters.to) bindings.push(filters.to);

    const result = await this.db.raw(sql, bindings);
    return result.rows.map((r: { artist_name: string; total_plays: string; total_skips: string; skip_rate: string }) => ({
      artistName: r.artist_name,
      totalPlays: Number(r.total_plays),
      totalSkips: Number(r.total_skips),
      skipRate: Number(r.skip_rate),
    }));
  }

  async getArtistCumulative(
    sessionId: string,
    limit: number,
    filters: StatsFilter,
  ): Promise<{ periods: string[]; artists: Array<{ name: string; values: number[] }> }> {
    const topArtistsQuery = this.db('monthly_artist_stats as a')
      .join('artist_catalog as ac', 'a.artist_id', 'ac.id')
      .where('a.session_id', sessionId)
      .select('a.artist_id', this.db.raw('ac.artist_name'))
      .sum('a.ms_played as total')
      .groupBy('a.artist_id', 'ac.artist_name')
      .orderBy('total', 'desc')
      .limit(limit);

    this.applyMonthFilters(topArtistsQuery, filters, 'a');
    const topArtists = await topArtistsQuery as Array<{ artist_id: number; artist_name: string }>;
    const artistIds = topArtists.map(r => r.artist_id);

    if (artistIds.length === 0) return { periods: [], artists: [] };

    const sql = `
      SELECT
        to_char(month, 'YYYY-MM') AS period,
        artist_id,
        SUM(ms_played) OVER (
          PARTITION BY artist_id
          ORDER BY month
          ROWS UNBOUNDED PRECEDING
        ) AS cumulative_ms
      FROM monthly_artist_stats
      WHERE session_id = ?
        AND artist_id = ANY(?)
        ${filters.from ? "AND month >= date_trunc('month', ?::date)" : ''}
        ${filters.to ? "AND month <= date_trunc('month', ?::date)" : ''}
      ORDER BY month, artist_id
    `;

    const bindings: unknown[] = [sessionId, artistIds];
    if (filters.from) bindings.push(filters.from);
    if (filters.to) bindings.push(filters.to);

    const result = await this.db.raw(sql, bindings);
    const rows: Array<{ period: string; artist_id: number; cumulative_ms: string }> = result.rows;

    const periodSet = new Set<string>();
    const artistMap = new Map<number, Map<string, number>>();
    for (const { artist_id } of topArtists) artistMap.set(artist_id, new Map());

    for (const row of rows) {
      periodSet.add(row.period);
      artistMap.get(row.artist_id)?.set(row.period, Number(row.cumulative_ms));
    }

    const periods = Array.from(periodSet).sort();
    const artists = topArtists.map(({ artist_id, artist_name }) => {
      const monthMap = artistMap.get(artist_id)!;
      let lastVal = 0;
      const values = periods.map(p => {
        const val = monthMap.get(p);
        if (val !== undefined) lastVal = val;
        return lastVal;
      });
      return { name: artist_name, values };
    });

    return { periods, artists };
  }

  async getTopTracksOverTime(
    sessionId: string,
    limit: number,
    filters: StatsFilter,
  ): Promise<{ periods: string[]; tracks: Array<{ name: string; artistName: string; values: number[] }> }> {
    // Step 1: top N tracks
    const topTracksQuery = this.db('monthly_track_stats as t')
      .join('track_catalog as tc', 't.track_id', 'tc.id')
      .where('t.session_id', sessionId)
      .select('t.track_id', this.db.raw('tc.track_name'), this.db.raw('tc.artist_name'))
      .sum('t.ms_played as total')
      .groupBy('t.track_id', 'tc.track_name', 'tc.artist_name')
      .orderBy('total', 'desc')
      .limit(limit);

    this.applyMonthFilters(topTracksQuery, filters, 't');
    const topTracks = await topTracksQuery as Array<{ track_id: number; track_name: string; artist_name: string }>;

    if (topTracks.length === 0) return { periods: [], tracks: [] };
    const trackIds = topTracks.map(r => r.track_id);

    // Step 2: monthly data
    const sql = `
      SELECT
        to_char(t.month, 'YYYY-MM') AS period,
        t.track_id,
        t.ms_played AS total_ms
      FROM monthly_track_stats t
      WHERE t.session_id = ?
        AND t.track_id = ANY(?)
        ${filters.from ? "AND t.month >= date_trunc('month', ?::date)" : ''}
        ${filters.to   ? "AND t.month <= date_trunc('month', ?::date)" : ''}
      ORDER BY t.month
    `;
    const bindings: unknown[] = [sessionId, trackIds];
    if (filters.from) bindings.push(filters.from);
    if (filters.to) bindings.push(filters.to);

    const result = await this.db.raw(sql, bindings);
    const rows: Array<{ period: string; track_id: number; total_ms: string }> = result.rows;

    const periodSet = new Set<string>();
    const trackMap = new Map<number, Map<string, number>>();
    for (const t of topTracks) trackMap.set(t.track_id, new Map());

    for (const row of rows) {
      periodSet.add(row.period);
      trackMap.get(row.track_id)?.set(row.period, Number(row.total_ms));
    }

    const periods = Array.from(periodSet).sort();
    const tracks = topTracks.map(({ track_id, track_name, artist_name }) => ({
      name: track_name,
      artistName: artist_name,
      values: periods.map(p => trackMap.get(track_id)?.get(p) ?? 0),
    }));

    return { periods, tracks };
  }

  async getTrackCumulative(
    sessionId: string,
    limit: number,
    filters: StatsFilter,
  ): Promise<{ periods: string[]; tracks: Array<{ name: string; artistName: string; values: number[] }> }> {
    const topTracksQuery = this.db('monthly_track_stats as t')
      .join('track_catalog as tc', 't.track_id', 'tc.id')
      .where('t.session_id', sessionId)
      .select('t.track_id', this.db.raw('tc.track_name'), this.db.raw('tc.artist_name'))
      .sum('t.ms_played as total')
      .groupBy('t.track_id', 'tc.track_name', 'tc.artist_name')
      .orderBy('total', 'desc')
      .limit(limit);

    this.applyMonthFilters(topTracksQuery, filters, 't');
    const topTracks = await topTracksQuery as Array<{ track_id: number; track_name: string; artist_name: string }>;

    if (topTracks.length === 0) return { periods: [], tracks: [] };
    const trackIds = topTracks.map(r => r.track_id);

    const sql = `
      SELECT
        to_char(month, 'YYYY-MM') AS period,
        track_id,
        SUM(ms_played) OVER (
          PARTITION BY track_id
          ORDER BY month
          ROWS UNBOUNDED PRECEDING
        ) AS cumulative_ms
      FROM monthly_track_stats
      WHERE session_id = ?
        AND track_id = ANY(?)
        ${filters.from ? "AND month >= date_trunc('month', ?::date)" : ''}
        ${filters.to   ? "AND month <= date_trunc('month', ?::date)" : ''}
      ORDER BY month, track_id
    `;

    const bindings: unknown[] = [sessionId, trackIds];
    if (filters.from) bindings.push(filters.from);
    if (filters.to) bindings.push(filters.to);

    const result = await this.db.raw(sql, bindings);
    const rows: Array<{ period: string; track_id: number; cumulative_ms: string }> = result.rows;

    const periodSet = new Set<string>();
    const trackMap = new Map<number, Map<string, number>>();
    for (const { track_id } of topTracks) trackMap.set(track_id, new Map());

    for (const row of rows) {
      periodSet.add(row.period);
      trackMap.get(row.track_id)?.set(row.period, Number(row.cumulative_ms));
    }

    const periods = Array.from(periodSet).sort();
    const tracks = topTracks.map(({ track_id, track_name, artist_name }) => {
      const monthMap = trackMap.get(track_id)!;
      let lastVal = 0;
      const values = periods.map(p => {
        const val = monthMap.get(p);
        if (val !== undefined) lastVal = val;
        return lastVal;
      });
      return { name: track_name, artistName: artist_name, values };
    });

    return { periods, tracks };
  }

  async getBackButtonTracks(sessionId: string, limit: number): Promise<BackButtonRow[]> {
    const sql = `
      SELECT
        tc.track_name,
        tc.artist_name,
        SUM(t.back_count)::integer                                                    AS back_count,
        SUM(t.play_count)::integer                                                    AS total_plays,
        ROUND(SUM(t.back_count) * 100.0 / NULLIF(SUM(t.play_count), 0), 1)           AS replay_rate
      FROM monthly_track_stats t
      JOIN track_catalog tc ON t.track_id = tc.id
      WHERE t.session_id = ?
        AND t.back_count > 0
      GROUP BY t.track_id, tc.track_name, tc.artist_name
      HAVING SUM(t.back_count) >= 2
      ORDER BY SUM(t.back_count) DESC
      LIMIT ?
    `;
    const result = await this.db.raw(sql, [sessionId, limit]);
    return result.rows.map((r: {
      track_name: string;
      artist_name: string;
      back_count: string;
      total_plays: string;
      replay_rate: string;
    }) => ({
      trackName: r.track_name,
      artistName: r.artist_name,
      backCount: Number(r.back_count),
      totalPlays: Number(r.total_plays),
      replayRate: Number(r.replay_rate),
    }));
  }

  async getContentSplit(sessionId: string, filters: StatsFilter): Promise<ContentSplitRow[]> {
    const sql = `
      SELECT
        to_char(month, 'YYYY-MM') AS period,
        (ms_played - podcast_ms_played)::bigint          AS music_ms,
        podcast_ms_played::bigint                        AS podcast_ms,
        (play_count - podcast_play_count)::integer       AS music_plays,
        podcast_play_count::integer                      AS podcast_plays
      FROM monthly_listen_totals
      WHERE session_id = ?
        ${filters.from ? "AND month >= date_trunc('month', ?::date)" : ''}
        ${filters.to   ? "AND month <= date_trunc('month', ?::date)" : ''}
      ORDER BY month
    `;

    const bindings: unknown[] = [sessionId];
    if (filters.from) bindings.push(filters.from);
    if (filters.to) bindings.push(filters.to);

    const result = await this.db.raw(sql, bindings);
    return result.rows.map((r: { period: string; music_ms: string; podcast_ms: string; music_plays: string; podcast_plays: string }) => ({
      period: r.period,
      musicMs: Number(r.music_ms),
      podcastMs: Number(r.podcast_ms),
      musicPlays: Number(r.music_plays),
      podcastPlays: Number(r.podcast_plays),
    }));
  }

  async getObsessionTimeline(sessionId: string, filters: StatsFilter): Promise<ObsessionPhaseRow[]> {
    const sql = `
      WITH monthly_top AS (
        SELECT
          a.month,
          a.artist_id,
          ac.artist_name,
          SUM(a.ms_played) AS artist_ms,
          ROW_NUMBER() OVER (PARTITION BY a.month ORDER BY SUM(a.ms_played) DESC) AS rn
        FROM monthly_artist_stats a
        JOIN artist_catalog ac ON a.artist_id = ac.id
        WHERE a.session_id = ?
          ${filters.from ? "AND a.month >= date_trunc('month', ?::date)" : ''}
          ${filters.to   ? "AND a.month <= date_trunc('month', ?::date)" : ''}
        GROUP BY a.month, a.artist_id, ac.artist_name
      ),
      monthly_totals AS (
        SELECT
          month,
          SUM(ms_played) AS total_ms
        FROM monthly_artist_stats
        WHERE session_id = ?
          ${filters.from ? "AND month >= date_trunc('month', ?::date)" : ''}
          ${filters.to   ? "AND month <= date_trunc('month', ?::date)" : ''}
        GROUP BY month
      )
      SELECT
        to_char(t.month, 'YYYY-MM')                                         AS period,
        t.artist_name,
        t.artist_ms::bigint,
        m.total_ms::bigint,
        ROUND(t.artist_ms * 100.0 / NULLIF(m.total_ms, 0), 1)              AS percentage
      FROM monthly_top t
      JOIN monthly_totals m ON t.month = m.month
      WHERE t.rn = 1
        AND t.artist_ms * 100.0 / NULLIF(m.total_ms, 0) >= 40
      ORDER BY t.month
    `;

    const bindings: unknown[] = [sessionId];
    if (filters.from) bindings.push(filters.from);
    if (filters.to) bindings.push(filters.to);
    // second occurrence of session_id for monthly_totals CTE
    bindings.push(sessionId);
    if (filters.from) bindings.push(filters.from);
    if (filters.to) bindings.push(filters.to);

    const result = await this.db.raw(sql, bindings);
    return result.rows.map((r: { period: string; artist_name: string; artist_ms: string; total_ms: string; percentage: string }) => ({
      period: r.period,
      artistName: r.artist_name,
      artistMs: Number(r.artist_ms),
      totalMs: Number(r.total_ms),
      percentage: Number(r.percentage),
    }));
  }

  async getSessionStamina(sessionId: string, filters: StatsFilter): Promise<StaminaRow[]> {
    const sql = `
      SELECT
        day_of_week,
        hour_of_day,
        SUM(total_chain_length)::integer AS total_chain_length,
        SUM(chain_count)::integer        AS chain_count
      FROM monthly_hourly_stats
      WHERE session_id = ?
        ${filters.from ? "AND month >= date_trunc('month', ?::date)" : ''}
        ${filters.to   ? "AND month <= date_trunc('month', ?::date)" : ''}
      GROUP BY day_of_week, hour_of_day
    `;

    const bindings: unknown[] = [sessionId];
    if (filters.from) bindings.push(filters.from);
    if (filters.to) bindings.push(filters.to);

    const result = await this.db.raw(sql, bindings);
    return result.rows.map((r: { day_of_week: string; hour_of_day: string; total_chain_length: string; chain_count: string }) => ({
      dayOfWeek: Number(r.day_of_week),
      hourOfDay: Number(r.hour_of_day),
      totalChainLength: Number(r.total_chain_length),
      chainCount: Number(r.chain_count),
    }));
  }

  async getArtistIntent(sessionId: string, filters: StatsFilter): Promise<ArtistIntentRow[]> {
    const sql = `
      SELECT
        ac.artist_name,
        SUM(a.play_count)::integer                                                          AS total_plays,
        SUM(a.deliberate_count)::integer                                                    AS deliberate_plays,
        SUM(a.served_count)::integer                                                        AS served_plays,
        ROUND(
          SUM(a.deliberate_count) * 100.0
            / NULLIF(SUM(a.deliberate_count) + SUM(a.served_count), 0),
          1
        )                                                                                   AS deliberate_rate
      FROM monthly_artist_stats a
      JOIN artist_catalog ac ON a.artist_id = ac.id
      WHERE a.session_id = ?
        ${filters.from ? "AND a.month >= date_trunc('month', ?::date)" : ''}
        ${filters.to   ? "AND a.month <= date_trunc('month', ?::date)" : ''}
      GROUP BY a.artist_id, ac.artist_name
      HAVING SUM(a.play_count) >= 20
        AND (SUM(a.deliberate_count) + SUM(a.served_count)) > 0
      ORDER BY deliberate_rate DESC
      LIMIT 50
    `;

    const bindings: unknown[] = [sessionId];
    if (filters.from) bindings.push(filters.from);
    if (filters.to) bindings.push(filters.to);

    const result = await this.db.raw(sql, bindings);
    return result.rows.map((r: {
      artist_name: string;
      total_plays: string;
      deliberate_plays: string;
      served_plays: string;
      deliberate_rate: string;
    }) => ({
      artistName: r.artist_name,
      totalPlays: Number(r.total_plays),
      deliberatePlays: Number(r.deliberate_plays),
      servedPlays: Number(r.served_plays),
      deliberateRate: Number(r.deliberate_rate),
    }));
  }

  async getTrackIntent(sessionId: string, filters: StatsFilter, limit: number): Promise<TrackIntentRow[]> {
    const sql = `
      SELECT
        tc.track_name,
        tc.artist_name,
        SUM(t.play_count)::integer                                                          AS total_plays,
        SUM(t.deliberate_count)::integer                                                    AS deliberate_plays,
        SUM(t.served_count)::integer                                                        AS served_plays,
        ROUND(
          SUM(t.deliberate_count) * 100.0
            / NULLIF(SUM(t.deliberate_count) + SUM(t.served_count), 0),
          1
        )                                                                                   AS deliberate_rate
      FROM monthly_track_stats t
      JOIN track_catalog tc ON t.track_id = tc.id
      WHERE t.session_id = ?
        ${filters.from ? "AND t.month >= date_trunc('month', ?::date)" : ''}
        ${filters.to   ? "AND t.month <= date_trunc('month', ?::date)" : ''}
      GROUP BY t.track_id, tc.track_name, tc.artist_name
      HAVING SUM(t.play_count) >= 5
        AND (SUM(t.deliberate_count) + SUM(t.served_count)) > 0
      ORDER BY deliberate_rate DESC
      LIMIT ?
    `;

    const bindings: unknown[] = [sessionId];
    if (filters.from) bindings.push(filters.from);
    if (filters.to) bindings.push(filters.to);
    bindings.push(limit);

    const result = await this.db.raw(sql, bindings);
    return result.rows.map((r: {
      track_name: string;
      artist_name: string;
      total_plays: string;
      deliberate_plays: string;
      served_plays: string;
      deliberate_rate: string;
    }) => ({
      trackName: r.track_name,
      artistName: r.artist_name,
      totalPlays: Number(r.total_plays),
      deliberatePlays: Number(r.deliberate_plays),
      servedPlays: Number(r.served_plays),
      deliberateRate: Number(r.deliberate_rate),
    }));
  }

  async getPersonalityInputs(sessionId: string): Promise<PersonalityInputsRow> {
    // 1. Hour totals from hourly stats (sum across all months)
    const heatmapRows: Array<{ hourOfDay: string; totalMs: string }> = await this.db('monthly_hourly_stats')
      .where('session_id', sessionId)
      .select(
        this.db.raw('hour_of_day as "hourOfDay"'),
        this.db.raw('SUM(ms_played)::bigint as "totalMs"'),
      )
      .groupBy('hour_of_day');

    const hourTotals = new Array(24).fill(0) as number[];
    for (const row of heatmapRows) {
      hourTotals[Number(row.hourOfDay)] = Number(row.totalMs);
    }

    // 2. Top 10 artist ms % of total
    const artistTotals: Array<{ totalMs: string }> = await this.db('monthly_artist_stats')
      .where('session_id', sessionId)
      .select(this.db.raw('SUM(ms_played)::bigint as "totalMs"'))
      .groupBy('artist_id')
      .orderBy('totalMs', 'desc')
      .limit(10);

    const allArtistMs = await this.db('monthly_artist_stats')
      .where('session_id', sessionId)
      .sum('ms_played as total')
      .first() as { total: string } | undefined;

    const top10Ms = artistTotals.reduce((s, r) => s + Number(r.totalMs), 0);
    const totalArtistMs = Number(allArtistMs?.total ?? 1);
    const top10ArtistMsPct = totalArtistMs > 0
      ? Math.round(top10Ms / totalArtistMs * 1000) / 10
      : 0;

    // 3. Global skip rate from track stats
    const trackAgg = await this.db('monthly_track_stats')
      .where('session_id', sessionId)
      .select(
        this.db.raw('SUM(skip_count)::integer as "totalSkips"'),
        this.db.raw('SUM(play_count)::integer as "totalPlays"'),
      )
      .first() as { totalSkips: string; totalPlays: string } | undefined;

    const totalSkips = Number(trackAgg?.totalSkips ?? 0);
    const totalPlays = Number(trackAgg?.totalPlays ?? 1);
    const globalSkipRate = totalPlays > 0
      ? Math.round(totalSkips / totalPlays * 1000) / 10
      : 0;

    // 4. Avg chain length from hourly stats (overall session depth proxy)
    const staminaAgg = await this.db('monthly_hourly_stats')
      .where('session_id', sessionId)
      .select(
        this.db.raw('SUM(total_chain_length)::integer as "totalChainLength"'),
        this.db.raw('SUM(chain_count)::integer as "chainCount"'),
      )
      .first() as { totalChainLength: string; chainCount: string } | undefined;

    const totalChainLength = Number(staminaAgg?.totalChainLength ?? 0);
    const chainCount = Number(staminaAgg?.chainCount ?? 1);
    const avgChainLength = chainCount > 0
      ? Math.round(totalChainLength / chainCount * 10) / 10
      : 1;

    // 5. Shuffle rate from monthly_listen_totals
    const shuffleAgg = await this.db('monthly_listen_totals')
      .where('session_id', sessionId)
      .select(
        this.db.raw('SUM(shuffle_count)::integer as "shuffleCount"'),
        this.db.raw('SUM(play_count)::integer as "playCount"'),
      )
      .first() as { shuffleCount: string; playCount: string } | undefined;

    const shuffleCount = Number(shuffleAgg?.shuffleCount ?? 0);
    const totalPlayCount = Number(shuffleAgg?.playCount ?? 1);
    const shuffleRate = totalPlayCount > 0
      ? Math.round(shuffleCount / totalPlayCount * 1000) / 10
      : 0;

    // 6. Unique artist count from session summary
    const summary = await this.getSessionSummary(sessionId);
    const uniqueArtistCount = summary?.uniqueArtists ?? 0;

    return { hourTotals, top10ArtistMsPct, globalSkipRate, avgChainLength, shuffleRate, uniqueArtistCount };
  }

  async upsertArtistCatalog(artists: Array<{ artistName: string }>): Promise<Map<string, number>> {
    if (artists.length === 0) return new Map();

    const values = artists.map(a => a.artistName);
    await this.db.raw(
      `INSERT INTO artist_catalog (artist_name)
       SELECT unnest(?::text[])
       ON CONFLICT (artist_name) DO NOTHING`,
      [values],
    );

    const rows: Array<{ id: number; artist_name: string }> = await this.db('artist_catalog')
      .whereIn('artist_name', values)
      .select('id', 'artist_name');

    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.artist_name, r.id);
    }
    return map;
  }

  async upsertTrackCatalog(
    tracks: Array<{ trackName: string; artistName: string; albumName: string | null; spotifyTrackUri: string | null }>,
    artistIdMap: Map<string, number>,
  ): Promise<Map<string, number>> {
    if (tracks.length === 0) return new Map();

    // Deduplicate by (trackName, artistName) — Postgres ON CONFLICT DO UPDATE
    // cannot handle the same conflict key twice in a single INSERT statement.
    const seen = new Set<string>();
    const uniqueTracks = tracks.filter(t => {
      const key = `${t.trackName}\0${t.artistName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    for (let i = 0; i < uniqueTracks.length; i += BATCH_INSERT_SIZE) {
      const batch = uniqueTracks.slice(i, i + BATCH_INSERT_SIZE);
      const trackNames = batch.map(t => t.trackName);
      const artistNames = batch.map(t => t.artistName);
      const artistIds = batch.map(t => artistIdMap.get(t.artistName) ?? 0);
      const albumNames = batch.map(t => t.albumName);
      const spotifyUris = batch.map(t => t.spotifyTrackUri);

      await this.db.raw(
        `INSERT INTO track_catalog (track_name, artist_name, artist_id, album_name, spotify_track_uri)
         SELECT * FROM unnest(
           ?::text[], ?::text[], ?::integer[], ?::text[], ?::text[]
         ) AS t(track_name, artist_name, artist_id, album_name, spotify_track_uri)
         ON CONFLICT (track_name, artist_name) DO UPDATE
           SET album_name         = COALESCE(EXCLUDED.album_name, track_catalog.album_name),
               spotify_track_uri  = COALESCE(EXCLUDED.spotify_track_uri, track_catalog.spotify_track_uri)`,
        [trackNames, artistNames, artistIds, albumNames, spotifyUris],
      );
    }

    const trackNames = uniqueTracks.map(t => t.trackName);
    const artistNames = uniqueTracks.map(t => t.artistName);
    const rows: { rows: Array<{ id: number; track_name: string; artist_name: string }> } = await this.db.raw(
      `SELECT id, track_name, artist_name FROM track_catalog
       WHERE (track_name, artist_name) IN (SELECT * FROM unnest(?::text[], ?::text[]))`,
      [trackNames, artistNames],
    );

    const map = new Map<string, number>();
    for (const r of rows.rows) {
      map.set(`${r.track_name}\0${r.artist_name}`, r.id);
    }
    return map;
  }

  private applyMonthFilters(query: Knex.QueryBuilder, filters: StatsFilter, tableAlias = ''): void {
    const col = tableAlias ? `${tableAlias}.month` : 'month';
    if (filters.from) {
      query.whereRaw(`${col} >= date_trunc('month', ?::date)`, [filters.from]);
    }
    if (filters.to) {
      query.whereRaw(`${col} <= date_trunc('month', ?::date)`, [filters.to]);
    }
  }

  async getShuffleSerendipity(sessionId: string, limit: number): Promise<ShuffleSerendipityRow[]> {
    const sql = `
      SELECT
        tc.track_name,
        tc.artist_name,
        SUM(t.shuffle_play_count)::integer                                                      AS shuffle_plays,
        SUM(t.play_count)::integer                                                              AS total_plays,
        ROUND(SUM(t.shuffle_trackdone_count) * 100.0 / NULLIF(SUM(t.shuffle_play_count), 0), 1) AS completion_rate
      FROM monthly_track_stats t
      JOIN track_catalog tc ON t.track_id = tc.id
      WHERE t.session_id = ?
      GROUP BY t.track_id, tc.track_name, tc.artist_name
      HAVING SUM(t.play_count) > 0
        AND SUM(t.play_count) = SUM(t.shuffle_play_count)
        AND SUM(t.shuffle_play_count) >= 3
      ORDER BY completion_rate DESC, shuffle_plays DESC
      LIMIT ?
    `;
    const result = await this.db.raw(sql, [sessionId, limit]);
    return result.rows.map((r: {
      track_name: string;
      artist_name: string;
      shuffle_plays: string;
      total_plays: string;
      completion_rate: string;
    }) => ({
      trackName: r.track_name,
      artistName: r.artist_name,
      shufflePlays: Number(r.shuffle_plays),
      totalPlays: Number(r.total_plays),
      completionRate: Number(r.completion_rate),
    }));
  }

  async getIntroTestTracks(sessionId: string, limit: number): Promise<IntroTestRow[]> {
    const sql = `
      WITH first_completion AS (
        SELECT
          track_id,
          MIN(month) AS first_completion_month
        FROM monthly_track_stats
        WHERE session_id = ?
          AND trackdone_count > 0
        GROUP BY track_id
      ),
      pre_bails AS (
        SELECT
          t.track_id,
          SUM(t.short_play_count)::integer AS pre_completion_bails
        FROM monthly_track_stats t
        JOIN first_completion fc ON t.track_id = fc.track_id
        WHERE t.session_id = ?
          AND t.month < fc.first_completion_month
        GROUP BY t.track_id
      ),
      totals AS (
        SELECT
          track_id,
          SUM(play_count)::integer      AS total_plays,
          SUM(trackdone_count)::integer AS completion_count
        FROM monthly_track_stats
        WHERE session_id = ?
        GROUP BY track_id
      )
      SELECT
        tc.track_name,
        tc.artist_name,
        t.total_plays,
        p.pre_completion_bails AS short_play_count,
        t.completion_count
      FROM pre_bails p
      JOIN totals t ON t.track_id = p.track_id
      JOIN track_catalog tc ON tc.id = p.track_id
      WHERE p.pre_completion_bails >= 3
      ORDER BY p.pre_completion_bails DESC, t.completion_count DESC
      LIMIT ?
    `;
    const result = await this.db.raw(sql, [sessionId, sessionId, sessionId, limit]);
    return result.rows.map((r: {
      track_name: string;
      artist_name: string;
      total_plays: string;
      short_play_count: string;
      completion_count: string;
    }) => ({
      trackName: r.track_name,
      artistName: r.artist_name,
      totalPlays: Number(r.total_plays),
      shortPlayCount: Number(r.short_play_count),
      completionCount: Number(r.completion_count),
    }));
  }

  async getArtistDiscovery(sessionId: string, filters: StatsFilter): Promise<ArtistDiscoveryRow[]> {
    const sql = `
      WITH top AS (
        SELECT
          a.artist_id,
          ac.artist_name,
          SUM(a.ms_played) AS total_ms
        FROM monthly_artist_stats a
        JOIN artist_catalog ac ON a.artist_id = ac.id
        WHERE a.session_id = ?
          ${filters.from ? "AND a.month >= date_trunc('month', ?::date)" : ''}
          ${filters.to   ? "AND a.month <= date_trunc('month', ?::date)" : ''}
        GROUP BY a.artist_id, ac.artist_name
        ORDER BY total_ms DESC
        LIMIT 50
      )
      SELECT
        top.artist_name,
        EXTRACT(YEAR FROM MIN(a.month))::integer AS discovery_year,
        top.total_ms::bigint
      FROM top
      JOIN monthly_artist_stats a ON a.session_id = ? AND a.artist_id = top.artist_id
      GROUP BY top.artist_id, top.artist_name, top.total_ms
      ORDER BY top.total_ms DESC
    `;

    const bindings: unknown[] = [sessionId];
    if (filters.from) bindings.push(filters.from);
    if (filters.to) bindings.push(filters.to);
    bindings.push(sessionId);

    const result = await this.db.raw(sql, bindings);
    return result.rows.map((r: { artist_name: string; discovery_year: number; total_ms: string }) => ({
      artistName: r.artist_name,
      discoveryYear: Number(r.discovery_year),
      totalMs: Number(r.total_ms),
    }));
  }

  async getWeekdayWeekend(sessionId: string, filters: StatsFilter): Promise<WeekdayWeekendRow> {
    // --- Hours by weekday/weekend from monthly_hourly_stats ---
    const hoursSql = `
      SELECT
        CASE WHEN day_of_week IN (0, 6) THEN 'weekend' ELSE 'weekday' END AS day_type,
        SUM(ms_played)::bigint AS total_ms
      FROM monthly_hourly_stats
      WHERE session_id = ?
        ${filters.from ? "AND month >= date_trunc('month', ?::date)" : ''}
        ${filters.to   ? "AND month <= date_trunc('month', ?::date)" : ''}
      GROUP BY day_type
    `;
    const hoursBindings: unknown[] = [sessionId];
    if (filters.from) hoursBindings.push(filters.from);
    if (filters.to) hoursBindings.push(filters.to);
    const hoursResult = await this.db.raw(hoursSql, hoursBindings);
    const hoursMap = new Map<string, number>();
    for (const r of hoursResult.rows as Array<{ day_type: string; total_ms: string }>) {
      hoursMap.set(r.day_type, Number(r.total_ms));
    }

    // --- Avg session length by weekday/weekend from monthly_hourly_stats ---
    const staminaSql = `
      SELECT
        CASE WHEN day_of_week IN (0, 6) THEN 'weekend' ELSE 'weekday' END AS day_type,
        SUM(total_chain_length)::integer AS total_chain,
        SUM(chain_count)::integer        AS chain_count
      FROM monthly_hourly_stats
      WHERE session_id = ?
        ${filters.from ? "AND month >= date_trunc('month', ?::date)" : ''}
        ${filters.to   ? "AND month <= date_trunc('month', ?::date)" : ''}
      GROUP BY day_type
    `;
    const staminaBindings: unknown[] = [sessionId];
    if (filters.from) staminaBindings.push(filters.from);
    if (filters.to) staminaBindings.push(filters.to);
    const staminaResult = await this.db.raw(staminaSql, staminaBindings);
    const staminaMap = new Map<string, { totalChain: number; chainCount: number }>();
    for (const r of staminaResult.rows as Array<{ day_type: string; total_chain: string; chain_count: string }>) {
      staminaMap.set(r.day_type, { totalChain: Number(r.total_chain), chainCount: Number(r.chain_count) });
    }

    // --- Skip rate + top artists by weekday/weekend from monthly_artist_stats ---
    const artistSql = `
      SELECT
        ac.artist_name,
        SUM(a.weekday_play_count)::integer AS weekday_plays,
        SUM(a.weekend_play_count)::integer AS weekend_plays,
        SUM(a.weekday_skip_count)::integer AS weekday_skips,
        SUM(a.weekend_skip_count)::integer AS weekend_skips
      FROM monthly_artist_stats a
      JOIN artist_catalog ac ON a.artist_id = ac.id
      WHERE a.session_id = ?
        ${filters.from ? "AND a.month >= date_trunc('month', ?::date)" : ''}
        ${filters.to   ? "AND a.month <= date_trunc('month', ?::date)" : ''}
      GROUP BY a.artist_id, ac.artist_name
    `;
    const artistBindings: unknown[] = [sessionId];
    if (filters.from) artistBindings.push(filters.from);
    if (filters.to) artistBindings.push(filters.to);
    const artistResult = await this.db.raw(artistSql, artistBindings);

    let weekdayTotalPlays = 0;
    let weekdayTotalSkips = 0;
    let weekendTotalPlays = 0;
    let weekendTotalSkips = 0;
    const weekdayArtists: Array<{ name: string; playCount: number }> = [];
    const weekendArtists: Array<{ name: string; playCount: number }> = [];

    for (const r of artistResult.rows as Array<{
      artist_name: string;
      weekday_plays: string;
      weekend_plays: string;
      weekday_skips: string;
      weekend_skips: string;
    }>) {
      const wp = Number(r.weekday_plays);
      const wep = Number(r.weekend_plays);
      weekdayTotalPlays += wp;
      weekendTotalPlays += wep;
      weekdayTotalSkips += Number(r.weekday_skips);
      weekendTotalSkips += Number(r.weekend_skips);
      if (wp > 0) weekdayArtists.push({ name: r.artist_name, playCount: wp });
      if (wep > 0) weekendArtists.push({ name: r.artist_name, playCount: wep });
    }

    weekdayArtists.sort((a, b) => b.playCount - a.playCount);
    weekendArtists.sort((a, b) => b.playCount - a.playCount);

    const weekdayStamina = staminaMap.get('weekday');
    const weekendStamina = staminaMap.get('weekend');

    return {
      weekday: {
        totalMs: hoursMap.get('weekday') ?? 0,
        avgSessionLength: weekdayStamina && weekdayStamina.chainCount > 0
          ? Math.round(weekdayStamina.totalChain / weekdayStamina.chainCount * 10) / 10
          : 0,
        skipRate: weekdayTotalPlays > 0
          ? Math.round(weekdayTotalSkips / weekdayTotalPlays * 1000) / 10
          : 0,
        topArtists: weekdayArtists.slice(0, 5),
      },
      weekend: {
        totalMs: hoursMap.get('weekend') ?? 0,
        avgSessionLength: weekendStamina && weekendStamina.chainCount > 0
          ? Math.round(weekendStamina.totalChain / weekendStamina.chainCount * 10) / 10
          : 0,
        skipRate: weekendTotalPlays > 0
          ? Math.round(weekendTotalSkips / weekendTotalPlays * 1000) / 10
          : 0,
        topArtists: weekendArtists.slice(0, 5),
      },
    };
  }

  async getAlbumListeners(sessionId: string, filters: StatsFilter): Promise<AlbumListenerRow[]> {
    // Use track breadth as the signal instead of served/deliberate counts:
    //   topTrackPct  — what % of an artist's total plays go to their single most-played track
    //                  high = "just the hits" (one song dominates)
    //   avgTracksPerAlbum — unique tracks played / distinct albums
    //                  high = explores full albums
    const sql = `
      WITH per_track AS (
        SELECT
          tc.artist_name,
          tc.track_name,
          tc.album_name,
          SUM(t.play_count)::integer AS track_plays
        FROM monthly_track_stats t
        JOIN track_catalog tc ON t.track_id = tc.id
        WHERE t.session_id = ?
          AND tc.album_name IS NOT NULL
          ${filters.from ? "AND t.month >= date_trunc('month', ?::date)" : ''}
          ${filters.to   ? "AND t.month <= date_trunc('month', ?::date)" : ''}
        GROUP BY t.track_id, tc.artist_name, tc.track_name, tc.album_name
      ),
      ranked AS (
        SELECT
          *,
          ROW_NUMBER() OVER (PARTITION BY artist_name ORDER BY track_plays DESC) AS rn
        FROM per_track
      )
      SELECT
        r.artist_name,
        SUM(r.track_plays)::integer                                                                   AS total_plays,
        COUNT(DISTINCT r.track_name)::integer                                                         AS unique_tracks,
        COUNT(DISTINCT r.album_name)::integer                                                         AS album_count,
        MAX(CASE WHEN r.rn = 1 THEN r.track_name END)                                               AS top_track_name,
        ROUND(
          MAX(CASE WHEN r.rn = 1 THEN r.track_plays END) * 100.0
            / NULLIF(SUM(r.track_plays), 0),
          1
        )                                                                                             AS top_track_pct,
        ROUND(
          COUNT(DISTINCT r.track_name)::numeric / NULLIF(COUNT(DISTINCT r.album_name), 0),
          1
        )                                                                                             AS avg_tracks_per_album
      FROM ranked r
      GROUP BY r.artist_name
      HAVING SUM(r.track_plays) >= 15
      ORDER BY top_track_pct ASC
      LIMIT 100
    `;

    const bindings: unknown[] = [sessionId];
    if (filters.from) bindings.push(filters.from);
    if (filters.to) bindings.push(filters.to);

    const result = await this.db.raw(sql, bindings);
    return result.rows.map((r: {
      artist_name: string;
      total_plays: string;
      unique_tracks: string;
      album_count: string;
      top_track_name: string;
      top_track_pct: string;
      avg_tracks_per_album: string;
    }) => ({
      artistName: r.artist_name,
      totalPlays: Number(r.total_plays),
      uniqueTracks: Number(r.unique_tracks),
      albumCount: Number(r.album_count),
      topTrackName: r.top_track_name ?? '',
      topTrackPct: Number(r.top_track_pct),
      avgTracksPerAlbum: Number(r.avg_tracks_per_album),
    }));
  }

  async getSkipGraveyard(sessionId: string, limit: number): Promise<SkipGraveyardRow[]> {
    const sql = `
      SELECT
        tc.track_name,
        tc.artist_name,
        SUM(t.fwd_skip_count)::integer                                                        AS fwd_skip_count,
        SUM(t.play_count)::integer                                                            AS total_plays,
        ROUND(SUM(t.fwd_skip_count) * 100.0 / NULLIF(SUM(t.play_count), 0), 1)              AS fwd_skip_rate,
        ROUND(SUM(t.ms_played)::numeric / NULLIF(SUM(t.fwd_skip_count), 0) / 1000.0, 1)     AS avg_listen_sec
      FROM monthly_track_stats t
      JOIN track_catalog tc ON t.track_id = tc.id
      WHERE t.session_id = ?
        AND t.fwd_skip_count > 0
      GROUP BY t.track_id, tc.track_name, tc.artist_name
      HAVING SUM(t.fwd_skip_count) >= 3
        AND SUM(t.back_count) = 0
      ORDER BY SUM(t.fwd_skip_count) DESC
      LIMIT ?
    `;
    const result = await this.db.raw(sql, [sessionId, limit]);
    return result.rows.map((r: {
      track_name: string;
      artist_name: string;
      fwd_skip_count: string;
      total_plays: string;
      fwd_skip_rate: string;
      avg_listen_sec: string;
    }) => ({
      trackName: r.track_name,
      artistName: r.artist_name,
      fwdSkipCount: Number(r.fwd_skip_count),
      totalPlays: Number(r.total_plays),
      fwdSkipRate: Number(r.fwd_skip_rate),
      avgListenSec: Number(r.avg_listen_sec),
    }));
  }

  async getSeasonalArtists(sessionId: string): Promise<SeasonalArtistRow[]> {
    const sql = `
      WITH seasonal AS (
        SELECT
          a.artist_id,
          ac.artist_name,
          CASE
            WHEN EXTRACT(MONTH FROM a.month) IN (12, 1, 2) THEN 'Winter'
            WHEN EXTRACT(MONTH FROM a.month) IN (3, 4, 5)  THEN 'Spring'
            WHEN EXTRACT(MONTH FROM a.month) IN (6, 7, 8)  THEN 'Summer'
            ELSE 'Fall'
          END                                                      AS season,
          SUM(a.play_count)::integer                               AS season_plays,
          COUNT(DISTINCT EXTRACT(YEAR FROM a.month))::integer      AS active_years
        FROM monthly_artist_stats a
        JOIN artist_catalog ac ON a.artist_id = ac.id
        WHERE a.session_id = ?
        GROUP BY a.artist_id, ac.artist_name, season
      ),
      artist_totals AS (
        SELECT
          artist_id,
          SUM(season_plays)    AS total_plays,
          MAX(season_plays)    AS peak_plays
        FROM seasonal
        GROUP BY artist_id
      ),
      peak AS (
        SELECT
          s.artist_id,
          s.artist_name,
          s.season                                                            AS peak_season,
          s.season_plays                                                      AS peak_plays,
          s.active_years,
          at.total_plays,
          ROUND(s.season_plays * 100.0 / NULLIF(at.total_plays, 0), 1)      AS peak_pct
        FROM seasonal s
        JOIN artist_totals at ON s.artist_id = at.artist_id
        WHERE s.season_plays = at.peak_plays
      )
      SELECT
        artist_name,
        peak_season,
        peak_plays::integer,
        total_plays::integer,
        peak_pct,
        active_years
      FROM peak
      WHERE peak_pct >= 60
        AND total_plays >= 10
        AND active_years >= 2
      ORDER BY peak_pct DESC
      LIMIT 20
    `;

    const result = await this.db.raw(sql, [sessionId]);
    return result.rows.map((r: {
      artist_name: string;
      peak_season: string;
      peak_plays: string;
      total_plays: string;
      peak_pct: string;
      active_years: string;
    }) => ({
      artistName: r.artist_name,
      season: r.peak_season,
      peakPlays: Number(r.peak_plays),
      totalPlays: Number(r.total_plays),
      peakPct: Number(r.peak_pct),
      activeYears: Number(r.active_years),
    }));
  }

  async getReboundArtists(sessionId: string, limit: number): Promise<ReboundArtistRow[]> {
    const sql = `
      WITH artist_monthly AS (
        SELECT
          a.artist_id,
          ac.artist_name,
          a.month,
          a.play_count,
          LEAD(a.month)       OVER (PARTITION BY a.artist_id ORDER BY a.month) AS next_active_month,
          LEAD(a.play_count)  OVER (PARTITION BY a.artist_id ORDER BY a.month) AS revival_plays
        FROM monthly_artist_stats a
        JOIN artist_catalog ac ON a.artist_id = ac.id
        WHERE a.session_id = ?
      ),
      gaps AS (
        SELECT
          artist_name,
          month                                                                    AS peak_month,
          play_count                                                               AS peak_plays,
          next_active_month                                                        AS revival_month,
          revival_plays,
          (
            (EXTRACT(YEAR  FROM next_active_month) - EXTRACT(YEAR  FROM month)) * 12 +
            (EXTRACT(MONTH FROM next_active_month) - EXTRACT(MONTH FROM month)) - 1
          )::int                                                                   AS cooldown_months
        FROM artist_monthly
        WHERE next_active_month IS NOT NULL
          AND play_count      >= 5
          AND revival_plays   >= 3
          AND (
            (EXTRACT(YEAR  FROM next_active_month) - EXTRACT(YEAR  FROM month)) * 12 +
            (EXTRACT(MONTH FROM next_active_month) - EXTRACT(MONTH FROM month))
          ) >= 4
      ),
      best_per_artist AS (
        SELECT DISTINCT ON (artist_name)
          artist_name,
          to_char(peak_month,    'YYYY-MM')              AS peak_month,
          peak_plays::integer,
          cooldown_months,
          to_char(revival_month, 'YYYY-MM')              AS revival_month,
          revival_plays::integer,
          (peak_plays::float * cooldown_months * revival_plays) AS rebound_score
        FROM gaps
        ORDER BY artist_name, (peak_plays::float * cooldown_months * revival_plays) DESC
      )
      SELECT *
      FROM best_per_artist
      ORDER BY rebound_score DESC
      LIMIT ?
    `;

    const result = await this.db.raw(sql, [sessionId, limit]);
    return result.rows.map((r: {
      artist_name: string;
      peak_month: string;
      peak_plays: string;
      cooldown_months: string;
      revival_month: string;
      revival_plays: string;
      rebound_score: string;
    }) => ({
      artistName: r.artist_name,
      peakMonth: r.peak_month,
      peakPlays: Number(r.peak_plays),
      cooldownMonths: Number(r.cooldown_months),
      revivalMonth: r.revival_month,
      revivalPlays: Number(r.revival_plays),
      reboundScore: Math.round(Number(r.rebound_score)),
    }));
  }

  async getMarathons(sessionId: string, filters: StatsFilter): Promise<MarathonRow[]> {
    // When date filters are active we re-rank the filtered subset by duration.
    // Without filters we return the pre-stored all-time ranks.
    const hasFilter = filters.from || filters.to;
    const sql = `
      SELECT
        start_time,
        end_time,
        duration_ms,
        play_count,
        skip_count,
        skip_rate,
        top_artist,
        top_track,
        top_track_artist,
        ${hasFilter
          ? "ROW_NUMBER() OVER (ORDER BY duration_ms DESC)::integer AS rank"
          : 'rank'}
      FROM marathon_sessions
      WHERE session_id = ?
        ${filters.from ? "AND date_trunc('month', start_time) >= date_trunc('month', ?::date)" : ''}
        ${filters.to   ? "AND date_trunc('month', start_time) <= date_trunc('month', ?::date)" : ''}
      ORDER BY duration_ms DESC
      LIMIT 20
    `;
    const bindings: unknown[] = [sessionId];
    if (filters.from) bindings.push(filters.from);
    if (filters.to) bindings.push(filters.to);
    const result = await this.db.raw(sql, bindings);
    return result.rows.map((r: {
      start_time: Date;
      end_time: Date;
      duration_ms: string;
      play_count: string;
      skip_count: string;
      skip_rate: string;
      top_artist: string | null;
      top_track: string | null;
      top_track_artist: string | null;
      rank: string;
    }) => ({
      startTime: new Date(r.start_time),
      endTime: new Date(r.end_time),
      durationMs: Number(r.duration_ms),
      playCount: Number(r.play_count),
      skipCount: Number(r.skip_count),
      skipRate: Number(r.skip_rate),
      topArtist: r.top_artist,
      topTrack: r.top_track,
      topTrackArtist: r.top_track_artist,
      rank: Number(r.rank),
    }));
  }

  async upsertPersonalityRecord(sessionId: string, personalityId: string): Promise<void> {
    await this.db.raw(
      `INSERT INTO personality_records (session_id, personality_id)
       VALUES (?, ?)
       ON CONFLICT (session_id) DO UPDATE SET personality_id = EXCLUDED.personality_id, recorded_at = NOW()`,
      [sessionId, personalityId],
    );
  }

  async getPersonalityDistribution(): Promise<Array<{ personalityId: string; count: number }>> {
    const result = await this.db.raw(
      `SELECT personality_id, COUNT(*)::integer AS count
       FROM personality_records
       GROUP BY personality_id
       ORDER BY count DESC`,
    );
    return result.rows.map((r: { personality_id: string; count: number }) => ({
      personalityId: r.personality_id,
      count: r.count,
    }));
  }
}
