import type { GlobalStatsResponse, PercentileResponse, TrendingArtistEntry, PersonalityDistributionResponse } from '@music-livereview/shared';

export interface QueryCommunityStats {
  getGlobalStats(): Promise<GlobalStatsResponse>;
  getPercentileRanking(token: string): Promise<PercentileResponse | null>;
  getTrendingArtists(period: 'week' | 'month' | 'alltime', limit: number): Promise<TrendingArtistEntry[]>;
  getPersonalityDistribution(): Promise<PersonalityDistributionResponse>;
}
