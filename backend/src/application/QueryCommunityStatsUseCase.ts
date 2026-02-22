import type { GlobalStatsResponse, PercentileResponse, TrendingArtistEntry } from '@music-livereview/shared';
import type { QueryCommunityStats } from '../domain/port/inbound/QueryCommunityStats.js';
import type { AggregatedStatsStore } from '../domain/port/outbound/AggregatedStatsStore.js';
import type { UploadSessionRepository } from '../domain/port/outbound/UploadSessionRepository.js';

export class QueryCommunityStatsUseCase implements QueryCommunityStats {
  constructor(
    private readonly statsStore: AggregatedStatsStore,
    private readonly sessionRepo: UploadSessionRepository,
  ) {}

  async getGlobalStats(): Promise<GlobalStatsResponse> {
    return this.statsStore.getGlobalStats();
  }

  async getPercentileRanking(token: string): Promise<PercentileResponse | null> {
    const session = await this.sessionRepo.findByToken(token);
    if (!session || session.status !== 'completed') return null;
    return this.statsStore.getPercentileRanking(session.id);
  }

  async getTrendingArtists(period: 'week' | 'month' | 'alltime', limit: number): Promise<TrendingArtistEntry[]> {
    return this.statsStore.getTrendingArtists(period, limit);
  }
}
