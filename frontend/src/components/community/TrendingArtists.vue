<template>
  <div class="trending card">
    <div class="trending-header">
      <h3 class="section-title">Trending Artists</h3>
      <div class="trending-tabs">
        <button
          v-for="p in periods"
          :key="p.value"
          class="trending-tab"
          :class="{ active: activePeriod === p.value }"
          @click="$emit('periodChange', p.value)"
        >
          {{ p.label }}
        </button>
      </div>
    </div>
    <ol v-if="artists.length" class="trending-list">
      <li v-for="(artist, i) in artists" :key="artist.name" class="trending-item">
        <span class="trending-rank">{{ i + 1 }}</span>
        <span class="trending-name">{{ artist.name }}</span>
        <span class="trending-meta">{{ artist.uploadCount }} uploads</span>
      </li>
    </ol>
    <p v-else class="trending-empty">No data yet.</p>
  </div>
</template>

<script setup lang="ts">
import type { TrendingArtistEntry } from '@music-livereview/shared';

defineProps<{
  artists: TrendingArtistEntry[];
  activePeriod: string;
}>();

defineEmits<{ periodChange: [value: string] }>();

const periods = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'All Time', value: 'alltime' },
];
</script>

<style scoped>
.trending-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.trending-header .section-title {
  margin-bottom: 0;
}

.trending-tabs {
  display: flex;
  gap: 0.25rem;
}

.trending-tab {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}

.trending-tab.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #000;
}

.trending-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.trending-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.trending-item:last-child {
  border-bottom: none;
}

.trending-rank {
  width: 24px;
  text-align: center;
  font-weight: 600;
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.trending-name {
  flex: 1;
  font-weight: 500;
}

.trending-meta {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
}

.trending-empty {
  color: var(--color-text-muted);
  text-align: center;
  padding: 2rem;
}
</style>
