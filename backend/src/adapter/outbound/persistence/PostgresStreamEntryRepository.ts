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
          artist_name: b.artistName,
          play_count: b.playCount,
          ms_played: b.msPlayed,
          skip_count: b.skipCount,
          deliberate_count: b.deliberateCount,
          served_count: b.servedCount,
        }));
        await trx('monthly_artist_stats').insert(batch);
      }

      // Monthly track stats
      for (let i = 0; i < data.trackBuckets.length; i += BATCH_INSERT_SIZE) {
        const batch = data.trackBuckets.slice(i, i + BATCH_INSERT_SIZE).map(b => ({
          session_id: sessionId,
          month: b.month,
          track_name: b.trackName,
          artist_name: b.artistName,
          album_name: b.albumName,
          spotify_track_uri: b.spotifyTrackUri,
          play_count: b.playCount,
          ms_played: b.msPlayed,
          skip_count: b.skipCount,
          back_count: b.backCount,
          shuffle_play_count: b.shufflePlayCount,
          shuffle_trackdone_count: b.shuffleTrackdoneCount,
          deliberate_count: b.deliberateCount,
          served_count: b.servedCount,
        }));
        await trx('monthly_track_stats').insert(batch);
      }

      // Monthly heatmap
      for (let i = 0; i < data.heatmapBuckets.length; i += BATCH_INSERT_SIZE) {
        const batch = data.heatmapBuckets.slice(i, i + BATCH_INSERT_SIZE).map(b => ({
          session_id: sessionId,
          month: b.month,
          day_of_week: b.dayOfWeek,
          hour_of_day: b.hourOfDay,
          ms_played: b.msPlayed,
        }));
        await trx('monthly_heatmap').insert(batch);
      }

      // Track first play
      for (let i = 0; i < data.trackFirstPlays.length; i += BATCH_INSERT_SIZE) {
        const batch = data.trackFirstPlays.slice(i, i + BATCH_INSERT_SIZE).map(b => ({
          session_id: sessionId,
          spotify_track_uri: b.spotifyTrackUri,
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

      // Monthly stamina
      for (let i = 0; i < data.staminaBuckets.length; i += BATCH_INSERT_SIZE) {
        const batch = data.staminaBuckets.slice(i, i + BATCH_INSERT_SIZE).map(b => ({
          session_id: sessionId,
          month: b.month,
          day_of_week: b.dayOfWeek,
          hour_of_day: b.hourOfDay,
          total_chain_length: b.totalChainLength,
          chain_count: b.chainCount,
        }));
        await trx('monthly_stamina').insert(batch);
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
    const query = this.db('monthly_artist_stats')
      .where('session_id', sessionId)
      .select(
        this.db.raw('artist_name as "artistName"'),
        this.db.raw('SUM(play_count)::integer as "playCount"'),
        this.db.raw('SUM(ms_played)::bigint as "totalMs"'),
      )
      .groupBy('artist_name');

    this.applyMonthFilters(query, filters);

    const sortCol = filters.sort === 'count' ? '"playCount"' : '"totalMs"';
    query.orderByRaw(`${sortCol} DESC`);
    query.limit(filters.limit ?? 20);

    return query;
  }

  async getTopTracks(sessionId: string, filters: StatsFilter): Promise<TrackStatRow[]> {
    const query = this.db('monthly_track_stats')
      .where('session_id', sessionId)
      .select(
        this.db.raw('track_name as "trackName"'),
        this.db.raw('artist_name as "artistName"'),
        this.db.raw('SUM(play_count)::integer as "playCount"'),
        this.db.raw('SUM(ms_played)::bigint as "totalMs"'),
      )
      .groupBy('track_name', 'artist_name');

    this.applyMonthFilters(query, filters);

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
    const query = this.db('monthly_heatmap')
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
    // First get top N artists overall
    const topArtists = await this.db('monthly_artist_stats')
      .where('session_id', sessionId)
      .select('artist_name')
      .sum('ms_played as total')
      .groupBy('artist_name')
      .orderBy('total', 'desc')
      .limit(limit);

    const artistNames = (topArtists as Array<{ artist_name: string }>).map(r => r.artist_name);

    if (artistNames.length === 0) {
      return { periods: [], artists: [] };
    }

    // Then get monthly data for those artists
    const query = this.db('monthly_artist_stats')
      .where('session_id', sessionId)
      .whereIn('artist_name', artistNames)
      .select(
        this.db.raw("to_char(month, 'YYYY-MM') as period"),
        'artist_name',
        this.db.raw('ms_played as total_ms'),
      )
      .orderBy('month');

    this.applyMonthFilters(query, filters);

    const rows: Array<{ period: string; artist_name: string; total_ms: string }> = await query;

    // Pivot into the response format
    const periodSet = new Set<string>();
    const artistMap = new Map<string, Map<string, number>>();

    for (const name of artistNames) {
      artistMap.set(name, new Map());
    }

    for (const row of rows) {
      periodSet.add(row.period);
      artistMap.get(row.artist_name)?.set(row.period, Number(row.total_ms));
    }

    const periods = Array.from(periodSet).sort();
    const artists = artistNames.map(name => ({
      name,
      values: periods.map(p => artistMap.get(name)?.get(p) ?? 0),
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
        AND t.spotify_track_uri = fp.spotify_track_uri
      WHERE t.session_id = ?
        AND t.spotify_track_uri IS NOT NULL
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
        track_name,
        artist_name,
        SUM(skip_count)::integer                                                   AS skip_count,
        SUM(play_count)::integer                                                   AS total_plays,
        ROUND(SUM(skip_count) * 100.0 / NULLIF(SUM(play_count), 0), 1)            AS skip_rate,
        ROUND(SUM(ms_played)::numeric / NULLIF(SUM(play_count), 0) / 1000.0, 1)   AS avg_listen_sec
      FROM monthly_track_stats
      WHERE session_id = ?
        AND skip_count > 0
      GROUP BY track_name, artist_name
      HAVING SUM(skip_count) >= 3
      ORDER BY SUM(skip_count) DESC
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
          artist_name,
          SUM(play_count)::integer AS total_plays,
          SUM(skip_count)::integer AS total_skips,
          ROUND(SUM(skip_count) * 100.0 / NULLIF(SUM(play_count), 0), 1) AS skip_rate
        FROM monthly_artist_stats
        WHERE session_id = ?
          ${filters.from ? "AND month >= date_trunc('month', ?::date)" : ''}
          ${filters.to ? "AND month <= date_trunc('month', ?::date)" : ''}
        GROUP BY artist_name
        HAVING SUM(play_count) >= 100
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
    // Step 1: find the top N artists by total ms_played within the optional filter range
    const topArtistsQuery = this.db('monthly_artist_stats')
      .where('session_id', sessionId)
      .select('artist_name')
      .sum('ms_played as total')
      .groupBy('artist_name')
      .orderBy('total', 'desc')
      .limit(limit);

    this.applyMonthFilters(topArtistsQuery, filters);
    const topArtists = await topArtistsQuery as Array<{ artist_name: string }>;
    const artistNames = topArtists.map(r => r.artist_name);

    if (artistNames.length === 0) return { periods: [], artists: [] };

    // Step 2: compute cumulative ms_played per artist over time using a window function
    const sql = `
      SELECT
        to_char(month, 'YYYY-MM') AS period,
        artist_name,
        SUM(ms_played) OVER (
          PARTITION BY artist_name
          ORDER BY month
          ROWS UNBOUNDED PRECEDING
        ) AS cumulative_ms
      FROM monthly_artist_stats
      WHERE session_id = ?
        AND artist_name = ANY(?)
        ${filters.from ? "AND month >= date_trunc('month', ?::date)" : ''}
        ${filters.to ? "AND month <= date_trunc('month', ?::date)" : ''}
      ORDER BY month, artist_name
    `;

    const bindings: unknown[] = [sessionId, artistNames];
    if (filters.from) bindings.push(filters.from);
    if (filters.to) bindings.push(filters.to);

    const result = await this.db.raw(sql, bindings);
    const rows: Array<{ period: string; artist_name: string; cumulative_ms: string }> = result.rows;

    // Step 3: pivot into {periods, artists} — carry forward last known value for gap months
    const periodSet = new Set<string>();
    const artistMap = new Map<string, Map<string, number>>();

    for (const name of artistNames) {
      artistMap.set(name, new Map());
    }

    for (const row of rows) {
      periodSet.add(row.period);
      artistMap.get(row.artist_name)?.set(row.period, Number(row.cumulative_ms));
    }

    const periods = Array.from(periodSet).sort();

    const artists = artistNames.map(name => {
      const monthMap = artistMap.get(name)!;
      let lastVal = 0;
      const values = periods.map(p => {
        const val = monthMap.get(p);
        if (val !== undefined) lastVal = val;
        return lastVal;
      });
      return { name, values };
    });

    return { periods, artists };
  }

  async getTopTracksOverTime(
    sessionId: string,
    limit: number,
    filters: StatsFilter,
  ): Promise<{ periods: string[]; tracks: Array<{ name: string; artistName: string; values: number[] }> }> {
    // Step 1: find top N tracks by total ms_played
    const topTracksQuery = this.db('monthly_track_stats')
      .where('session_id', sessionId)
      .select('track_name', 'artist_name')
      .sum('ms_played as total')
      .groupBy('track_name', 'artist_name')
      .orderBy('total', 'desc')
      .limit(limit);

    this.applyMonthFilters(topTracksQuery, filters);
    const topTracks = await topTracksQuery as Array<{ track_name: string; artist_name: string }>;

    if (topTracks.length === 0) return { periods: [], tracks: [] };

    // Step 2: get monthly data for those tracks
    const sql = `
      SELECT
        to_char(month, 'YYYY-MM') AS period,
        track_name,
        artist_name,
        ms_played AS total_ms
      FROM monthly_track_stats
      WHERE session_id = ?
        AND (track_name, artist_name) = ANY(SELECT * FROM unnest(?::text[], ?::text[]))
        ${filters.from ? "AND month >= date_trunc('month', ?::date)" : ''}
        ${filters.to   ? "AND month <= date_trunc('month', ?::date)" : ''}
      ORDER BY month
    `;

    const trackNames = topTracks.map(r => r.track_name);
    const artistNames = topTracks.map(r => r.artist_name);
    const bindings: unknown[] = [sessionId, trackNames, artistNames];
    if (filters.from) bindings.push(filters.from);
    if (filters.to) bindings.push(filters.to);

    const result = await this.db.raw(sql, bindings);
    const rows: Array<{ period: string; track_name: string; artist_name: string; total_ms: string }> = result.rows;

    // Pivot into response format
    const periodSet = new Set<string>();
    const trackMap = new Map<string, Map<string, number>>();

    for (const t of topTracks) {
      trackMap.set(`${t.track_name}\0${t.artist_name}`, new Map());
    }

    for (const row of rows) {
      periodSet.add(row.period);
      trackMap.get(`${row.track_name}\0${row.artist_name}`)?.set(row.period, Number(row.total_ms));
    }

    const periods = Array.from(periodSet).sort();
    const tracks = topTracks.map(t => ({
      name: t.track_name,
      artistName: t.artist_name,
      values: periods.map(p => trackMap.get(`${t.track_name}\0${t.artist_name}`)?.get(p) ?? 0),
    }));

    return { periods, tracks };
  }

  async getTrackCumulative(
    sessionId: string,
    limit: number,
    filters: StatsFilter,
  ): Promise<{ periods: string[]; tracks: Array<{ name: string; artistName: string; values: number[] }> }> {
    // Step 1: find top N tracks by total ms_played within the optional filter range
    const topTracksQuery = this.db('monthly_track_stats')
      .where('session_id', sessionId)
      .select('track_name', 'artist_name')
      .sum('ms_played as total')
      .groupBy('track_name', 'artist_name')
      .orderBy('total', 'desc')
      .limit(limit);

    this.applyMonthFilters(topTracksQuery, filters);
    const topTracks = await topTracksQuery as Array<{ track_name: string; artist_name: string }>;

    if (topTracks.length === 0) return { periods: [], tracks: [] };

    // Step 2: cumulative ms_played per track using a window function
    const sql = `
      SELECT
        to_char(month, 'YYYY-MM') AS period,
        track_name,
        artist_name,
        SUM(ms_played) OVER (
          PARTITION BY track_name, artist_name
          ORDER BY month
          ROWS UNBOUNDED PRECEDING
        ) AS cumulative_ms
      FROM monthly_track_stats
      WHERE session_id = ?
        AND (track_name, artist_name) = ANY(SELECT * FROM unnest(?::text[], ?::text[]))
        ${filters.from ? "AND month >= date_trunc('month', ?::date)" : ''}
        ${filters.to   ? "AND month <= date_trunc('month', ?::date)" : ''}
      ORDER BY month, track_name, artist_name
    `;

    const trackNames = topTracks.map(r => r.track_name);
    const artistNames = topTracks.map(r => r.artist_name);
    const bindings: unknown[] = [sessionId, trackNames, artistNames];
    if (filters.from) bindings.push(filters.from);
    if (filters.to) bindings.push(filters.to);

    const result = await this.db.raw(sql, bindings);
    const rows: Array<{ period: string; track_name: string; artist_name: string; cumulative_ms: string }> = result.rows;

    // Pivot — carry forward last known value for gap months
    const periodSet = new Set<string>();
    const trackMap = new Map<string, Map<string, number>>();

    for (const t of topTracks) {
      trackMap.set(`${t.track_name}\0${t.artist_name}`, new Map());
    }

    for (const row of rows) {
      periodSet.add(row.period);
      trackMap.get(`${row.track_name}\0${row.artist_name}`)?.set(row.period, Number(row.cumulative_ms));
    }

    const periods = Array.from(periodSet).sort();

    const tracks = topTracks.map(t => {
      const key = `${t.track_name}\0${t.artist_name}`;
      const monthMap = trackMap.get(key)!;
      let lastVal = 0;
      const values = periods.map(p => {
        const val = monthMap.get(p);
        if (val !== undefined) lastVal = val;
        return lastVal;
      });
      return { name: t.track_name, artistName: t.artist_name, values };
    });

    return { periods, tracks };
  }

  async getBackButtonTracks(sessionId: string, limit: number): Promise<BackButtonRow[]> {
    const sql = `
      SELECT
        track_name,
        artist_name,
        SUM(back_count)::integer                                                    AS back_count,
        SUM(play_count)::integer                                                    AS total_plays,
        ROUND(SUM(back_count) * 100.0 / NULLIF(SUM(play_count), 0), 1)             AS replay_rate
      FROM monthly_track_stats
      WHERE session_id = ?
        AND back_count > 0
      GROUP BY track_name, artist_name
      HAVING SUM(back_count) >= 2
      ORDER BY SUM(back_count) DESC
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
          month,
          artist_name,
          SUM(ms_played) AS artist_ms,
          ROW_NUMBER() OVER (PARTITION BY month ORDER BY SUM(ms_played) DESC) AS rn
        FROM monthly_artist_stats
        WHERE session_id = ?
          ${filters.from ? "AND month >= date_trunc('month', ?::date)" : ''}
          ${filters.to   ? "AND month <= date_trunc('month', ?::date)" : ''}
        GROUP BY month, artist_name
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
      FROM monthly_stamina
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
        artist_name,
        SUM(play_count)::integer                                                          AS total_plays,
        SUM(deliberate_count)::integer                                                    AS deliberate_plays,
        SUM(served_count)::integer                                                        AS served_plays,
        ROUND(
          SUM(deliberate_count) * 100.0
            / NULLIF(SUM(deliberate_count) + SUM(served_count), 0),
          1
        )                                                                                 AS deliberate_rate
      FROM monthly_artist_stats
      WHERE session_id = ?
        ${filters.from ? "AND month >= date_trunc('month', ?::date)" : ''}
        ${filters.to   ? "AND month <= date_trunc('month', ?::date)" : ''}
      GROUP BY artist_name
      HAVING SUM(play_count) >= 20
        AND (SUM(deliberate_count) + SUM(served_count)) > 0
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
        track_name,
        artist_name,
        SUM(play_count)::integer                                                          AS total_plays,
        SUM(deliberate_count)::integer                                                    AS deliberate_plays,
        SUM(served_count)::integer                                                        AS served_plays,
        ROUND(
          SUM(deliberate_count) * 100.0
            / NULLIF(SUM(deliberate_count) + SUM(served_count), 0),
          1
        )                                                                                 AS deliberate_rate
      FROM monthly_track_stats
      WHERE session_id = ?
        ${filters.from ? "AND month >= date_trunc('month', ?::date)" : ''}
        ${filters.to   ? "AND month <= date_trunc('month', ?::date)" : ''}
      GROUP BY track_name, artist_name
      HAVING SUM(play_count) >= 5
        AND (SUM(deliberate_count) + SUM(served_count)) > 0
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
    // 1. Hour totals from heatmap (sum across all months)
    const heatmapRows: Array<{ hourOfDay: string; totalMs: string }> = await this.db('monthly_heatmap')
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
      .groupBy('artist_name')
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

    // 4. Avg chain length from stamina (overall session depth proxy)
    const staminaAgg = await this.db('monthly_stamina')
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

  private applyMonthFilters(query: Knex.QueryBuilder, filters: StatsFilter): void {
    if (filters.from) {
      query.whereRaw("month >= date_trunc('month', ?::date)", [filters.from]);
    }
    if (filters.to) {
      query.whereRaw("month <= date_trunc('month', ?::date)", [filters.to]);
    }
  }

  async getShuffleSerendipity(sessionId: string, limit: number): Promise<ShuffleSerendipityRow[]> {
    const sql = `
      SELECT
        track_name,
        artist_name,
        SUM(shuffle_play_count)::integer                                                      AS shuffle_plays,
        SUM(play_count)::integer                                                              AS total_plays,
        ROUND(SUM(shuffle_trackdone_count) * 100.0 / NULLIF(SUM(shuffle_play_count), 0), 1) AS completion_rate
      FROM monthly_track_stats
      WHERE session_id = ?
      GROUP BY track_name, artist_name
      HAVING SUM(play_count) > 0
        AND SUM(play_count) = SUM(shuffle_play_count)
        AND SUM(shuffle_play_count) >= 3
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
