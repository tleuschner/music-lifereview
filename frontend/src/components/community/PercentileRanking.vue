<template>
  <div v-if="data" class="percentile card">
    <h3 class="section-title">Your Ranking</h3>
    <div class="percentile-grid">
      <div class="percentile-item">
        <div class="percentile-bar-track">
          <div class="percentile-bar-fill" :style="{ width: data.totalHoursPercentile + '%' }" />
        </div>
        <p class="percentile-label">Listening Time — Top {{ 100 - data.totalHoursPercentile }}%</p>
      </div>
      <div class="percentile-item">
        <div class="percentile-bar-track">
          <div class="percentile-bar-fill" :style="{ width: data.uniqueArtistsPercentile + '%' }" />
        </div>
        <p class="percentile-label">Artist Diversity — Top {{ 100 - data.uniqueArtistsPercentile }}%</p>
      </div>
      <div class="percentile-item">
        <div class="percentile-bar-track">
          <div class="percentile-bar-fill" :style="{ width: data.uniqueTracksPercentile + '%' }" />
        </div>
        <p class="percentile-label">Track Diversity — Top {{ 100 - data.uniqueTracksPercentile }}%</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PercentileResponse } from '@music-livereview/shared';

defineProps<{ data: PercentileResponse | null }>();
</script>

<style scoped>
.percentile-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.percentile-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.percentile-bar-track {
  width: 100%;
  height: 12px;
  background: var(--color-bg);
  border-radius: 6px;
  overflow: hidden;
}

.percentile-bar-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 6px;
  transition: width 0.6s ease;
}

.percentile-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}
</style>
