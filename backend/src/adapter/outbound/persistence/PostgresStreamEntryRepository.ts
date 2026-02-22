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
        }));
        await trx('monthly_listen_totals').insert(batch);
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

  private applyMonthFilters(query: Knex.QueryBuilder, filters: StatsFilter): void {
    if (filters.from) {
      query.whereRaw("month >= date_trunc('month', ?::date)", [filters.from]);
    }
    if (filters.to) {
      query.whereRaw("month <= date_trunc('month', ?::date)", [filters.to]);
    }
  }
}
