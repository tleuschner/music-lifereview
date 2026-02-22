import type { Knex } from 'knex';
import type { GlobalStatsResponse, PercentileResponse, TrendingArtistEntry } from '@music-livereview/shared';
import type { AggregatedStatsStore } from '../../../domain/port/outbound/AggregatedStatsStore.js';

export class PostgresAggregatedStatsStore implements AggregatedStatsStore {
  constructor(private readonly db: Knex) {}

  async getGlobalStats(): Promise<GlobalStatsResponse> {
    const stats = await this.db.raw('SELECT * FROM community_stats LIMIT 1');
    const topArtists = await this.db.raw('SELECT * FROM global_top_artists LIMIT 20');

    const row = stats.rows[0];
    if (!row) {
      return {
        totalUploads: 0,
        avgTotalHours: 0,
        medianTotalHours: 0,
        avgUniqueArtists: 0,
        avgUniqueTracks: 0,
        topGlobalArtists: [],
      };
    }

    return {
      totalUploads: Number(row.total_uploads),
      avgTotalHours: Number(row.avg_total_hours),
      medianTotalHours: Number(row.median_total_hours),
      avgUniqueArtists: Number(row.avg_unique_artists),
      avgUniqueTracks: Number(row.avg_unique_tracks),
      topGlobalArtists: topArtists.rows.map((r: { name: string; upload_count: string }) => ({
        name: r.name,
        uploadCount: Number(r.upload_count),
      })),
    };
  }

  async getPercentileRanking(sessionId: string): Promise<PercentileResponse> {
    const sql = `
      SELECT
        PERCENT_RANK() OVER (ORDER BY total_ms_played) as hours_percentile,
        PERCENT_RANK() OVER (ORDER BY unique_artists) as artists_percentile,
        PERCENT_RANK() OVER (ORDER BY unique_tracks) as tracks_percentile
      FROM session_summaries
      WHERE session_id = ?
    `;

    const result = await this.db.raw(sql, [sessionId]);
    const row = result.rows[0];

    if (!row) {
      return { totalHoursPercentile: 0, uniqueArtistsPercentile: 0, uniqueTracksPercentile: 0 };
    }

    return {
      totalHoursPercentile: Math.round(Number(row.hours_percentile) * 100),
      uniqueArtistsPercentile: Math.round(Number(row.artists_percentile) * 100),
      uniqueTracksPercentile: Math.round(Number(row.tracks_percentile) * 100),
    };
  }

  async getTrendingArtists(period: 'week' | 'month' | 'alltime', limit: number): Promise<TrendingArtistEntry[]> {
    let dateFilter = '';
    if (period === 'week') {
      dateFilter = "AND s.created_at >= NOW() - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "AND s.created_at >= NOW() - INTERVAL '30 days'";
    }

    const sql = `
      SELECT
        a.artist_name as name,
        COUNT(DISTINCT a.session_id) as upload_count,
        SUM(a.play_count) as total_plays
      FROM monthly_artist_stats a
      JOIN upload_sessions s ON a.session_id = s.id
      WHERE s.status = 'completed'
        AND s.is_active = TRUE
        ${dateFilter}
      GROUP BY a.artist_name
      ORDER BY upload_count DESC, total_plays DESC
      LIMIT ?
    `;

    const result = await this.db.raw(sql, [limit]);
    return result.rows.map((r: { name: string; upload_count: string; total_plays: string }) => ({
      name: r.name,
      uploadCount: Number(r.upload_count),
      totalPlays: Number(r.total_plays),
    }));
  }

  async refreshMaterializedViews(): Promise<void> {
    await this.db.raw('REFRESH MATERIALIZED VIEW CONCURRENTLY community_stats');
    await this.db.raw('REFRESH MATERIALIZED VIEW CONCURRENTLY global_top_artists');
  }
}
