import type { GlobalStatsResponse, PercentileResponse, TrendingArtistEntry } from '@music-livereview/shared';

export interface AggregatedStatsStore {
  getGlobalStats(): Promise<GlobalStatsResponse>;
  getPercentileRanking(sessionId: string): Promise<PercentileResponse>;
  getTrendingArtists(period: 'week' | 'month' | 'alltime', limit: number): Promise<TrendingArtistEntry[]>;
  refreshMaterializedViews(): Promise<void>;
}
