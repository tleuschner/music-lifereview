<template>
  <div class="chart-container card">
    <div class="chart-header">
      <h3>The Skip Graveyard</h3>
      <p class="subtitle">Songs you keep hitting next on — forward-skipped at least 3 times and never once went back for. The inverse of Songs You Come Back To.</p>
    </div>

    <div v-if="!hasData" class="empty-state">
      No tracks found. This requires songs forward-skipped (next button) at least 3 times with zero back-button replays.
    </div>

    <div v-else class="track-list">
      <div class="list-header">
        <span class="col-rank">#</span>
        <span class="col-track">Track</span>
        <span class="col-stat" title="Times you hit the next button on this track">Fwd skips</span>
        <span class="col-stat" title="Average seconds listened before skipping">Avg listen</span>
        <span class="col-stat" title="Forward skips as a percentage of total plays">Skip rate</span>
        <span class="col-stat">Total plays</span>
      </div>

      <div v-for="(entry, index) in data" :key="`${entry.name}-${entry.artistName}`" class="track-row">
        <span class="col-rank">{{ index + 1 }}</span>
        <span class="col-track">
          <span class="track-name">{{ entry.name }}</span>
          <span class="artist-name">{{ entry.artistName }}</span>
        </span>
        <span class="col-stat skip-count">{{ entry.fwdSkipCount }}</span>
        <span class="col-stat listen-sec">{{ entry.avgListenSec }}s</span>
        <span class="col-stat skip-rate">{{ entry.fwdSkipRate }}%</span>
        <span class="col-stat">{{ entry.totalPlays }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SkipGraveyardEntry } from '@music-livereview/shared';

const props = defineProps<{ data: SkipGraveyardEntry[] }>();

const hasData = computed(() => props.data.length > 0);
</script>

<style scoped>
.chart-header {
  margin-bottom: 1.25rem;
}

.chart-header h3 {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
  color: #fff;
}

.subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: #aaa;
}

.empty-state {
  color: #888;
  font-size: 0.9rem;
  padding: 1rem 0;
}

.track-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.list-header {
  display: grid;
  grid-template-columns: 2rem 1fr 6rem 6rem 6rem 6rem;
  padding: 0.4rem 0.5rem;
  font-size: 0.75rem;
  color: #888;
  border-bottom: 1px solid #2a2a2a;
  text-align: right;
}

.list-header .col-track {
  text-align: left;
}

.track-row {
  display: grid;
  grid-template-columns: 2rem 1fr 6rem 6rem 6rem 6rem;
  padding: 0.55rem 0.5rem;
  border-bottom: 1px solid #1e1e1e;
  align-items: center;
  font-size: 0.85rem;
}

.track-row:last-child {
  border-bottom: none;
}

.col-rank {
  color: #666;
  font-size: 0.8rem;
}

.col-track {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.track-name {
  color: #eee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-name {
  color: #888;
  font-size: 0.78rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.col-stat {
  text-align: right;
  color: #ccc;
}

.skip-count {
  color: #e74c3c;
  font-weight: 600;
}

.listen-sec {
  color: #888;
}

.skip-rate {
  color: #e67e22;
  font-weight: 600;
}
</style>
