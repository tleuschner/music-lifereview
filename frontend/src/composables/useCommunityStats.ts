import { ref } from 'vue';
import type { GlobalStatsResponse, PercentileResponse, TrendingArtistEntry } from '@music-livereview/shared';
import * as api from '../services/api';

export function useCommunityStats() {
  const globalStats = ref<GlobalStatsResponse | null>(null);
  const percentile = ref<PercentileResponse | null>(null);
  const trending = ref<TrendingArtistEntry[]>([]);
  const loading = ref(false);

  async function fetchGlobalStats() {
    loading.value = true;
    try {
      globalStats.value = await api.getGlobalStats();
    } catch (err) {
      console.error('Failed to fetch global stats:', err);
    } finally {
      loading.value = false;
    }
  }

  async function fetchPercentile(token: string) {
    try {
      percentile.value = await api.getPercentile(token);
    } catch {
      percentile.value = null;
    }
  }

  async function fetchTrending(period: 'week' | 'month' | 'alltime' = 'alltime') {
    try {
      trending.value = await api.getTrendingArtists(period);
    } catch {
      trending.value = [];
    }
  }

  return { globalStats, percentile, trending, loading, fetchGlobalStats, fetchPercentile, fetchTrending };
}
