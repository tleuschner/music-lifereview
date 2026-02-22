import type { GlobalStatsResponse, PercentileResponse, TrendingArtistEntry, PersonalityDistributionResponse } from '@music-livereview/shared';
import type { QueryCommunityStats } from '../domain/port/inbound/QueryCommunityStats.js';
import type { AggregatedStatsStore } from '../domain/port/outbound/AggregatedStatsStore.js';
import type { UploadSessionRepository } from '../domain/port/outbound/UploadSessionRepository.js';
import type { StreamEntryRepository } from '../domain/port/outbound/StreamEntryRepository.js';

export class QueryCommunityStatsUseCase implements QueryCommunityStats {
  constructor(
    private readonly statsStore: AggregatedStatsStore,
    private readonly sessionRepo: UploadSessionRepository,
    private readonly entryRepo: StreamEntryRepository,
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

  async getPersonalityDistribution(): Promise<PersonalityDistributionResponse> {
    const rows = await this.entryRepo.getPersonalityDistribution();
    const total = rows.reduce((s, r) => s + r.count, 0);
    const entries = rows.map(r => ({
      personalityId: r.personalityId,
      count: r.count,
      percentage: total > 0 ? Math.round(r.count / total * 1000) / 10 : 0,
    }));
    return { entries, total };
  }
}
