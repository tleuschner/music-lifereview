<template>
  <div class="community">
    <h1 class="page-title">Community Stats</h1>

    <LoadingSpinner v-if="loading && !globalStats" message="Loading community data..." />

    <template v-if="globalStats">
      <GlobalAverages :stats="globalStats" />

      <div class="community-compare card" v-if="!hasToken">
        <p class="community-compare-text">
          Have a results link? Paste your token below to see how you compare.
        </p>
        <div class="compare-input-row">
          <input
            v-model="tokenInput"
            type="text"
            placeholder="Paste your share token..."
            class="compare-input"
          />
          <button class="btn btn-primary" @click="loadPercentile">Compare</button>
        </div>
      </div>

      <PercentileRanking v-if="percentile" :data="percentile" />

      <TrendingArtists
        :artists="trending"
        :active-period="trendingPeriod"
        @period-change="onPeriodChange"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useCommunityStats } from '../composables/useCommunityStats';
import LoadingSpinner from '../components/shared/LoadingSpinner.vue';
import GlobalAverages from '../components/community/GlobalAverages.vue';
import PercentileRanking from '../components/community/PercentileRanking.vue';
import TrendingArtists from '../components/community/TrendingArtists.vue';

const route = useRoute();
const { globalStats, percentile, trending, loading, fetchGlobalStats, fetchPercentile, fetchTrending } = useCommunityStats();

const tokenInput = ref('');
const trendingPeriod = ref('alltime');

const hasToken = computed(() => !!route.query.token || !!percentile.value);

async function loadPercentile() {
  if (tokenInput.value) {
    await fetchPercentile(tokenInput.value);
  }
}

function onPeriodChange(period: string) {
  trendingPeriod.value = period;
  fetchTrending(period as 'week' | 'month' | 'alltime');
}

onMounted(async () => {
  await Promise.all([
    fetchGlobalStats(),
    fetchTrending('alltime'),
  ]);

  // If token is in query params, load percentile automatically
  const queryToken = route.query.token as string | undefined;
  if (queryToken) {
    await fetchPercentile(queryToken);
  }
});
</script>

<style scoped>
.community {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
}

.community-compare-text {
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}

.compare-input-row {
  display: flex;
  gap: 0.5rem;
}

.compare-input {
  flex: 1;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.625rem 0.75rem;
  color: var(--color-text);
  font-size: 0.875rem;
}
</style>
