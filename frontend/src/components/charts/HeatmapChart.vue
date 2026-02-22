<template>
  <div class="chart-container card">
    <h3 class="section-title">When Do You Listen?</h3>
    <div v-if="heatmapData" class="heatmap">
      <div class="heatmap-row" v-for="(row, dayIdx) in heatmapData.data" :key="dayIdx">
        <span class="heatmap-day">{{ days[dayIdx] }}</span>
        <div
          v-for="(val, hourIdx) in row"
          :key="hourIdx"
          class="heatmap-cell"
          :style="{ backgroundColor: cellColor(val) }"
          :title="`${days[dayIdx]} ${hourIdx}:00 — ${val}h`"
        />
      </div>
      <div class="heatmap-hours">
        <span class="heatmap-day"></span>
        <span v-for="h in 24" :key="h" class="heatmap-hour">{{ h - 1 }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { HeatmapResponse } from '@music-livereview/shared';
import { useChartData } from '../../composables/useChartData';

const props = defineProps<{ data: HeatmapResponse | null }>();
const { toHeatmapData } = useChartData();

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const heatmapData = computed(() => props.data ? toHeatmapData(props.data.data) : null);

function cellColor(val: number): string {
  if (!heatmapData.value || heatmapData.value.maxValue === 0) return '#1a1a1a';
  const intensity = val / heatmapData.value.maxValue;
  const r = Math.round(29 + intensity * (29 - 29));
  const g = Math.round(26 + intensity * (185 - 26));
  const b = Math.round(26 + intensity * (84 - 26));
  return `rgb(${r}, ${g}, ${b})`;
}
</script>

<style scoped>
.heatmap {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-x: auto;
}

.heatmap-row {
  display: flex;
  gap: 2px;
  align-items: center;
}

.heatmap-day {
  width: 36px;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.heatmap-cell {
  flex: 1;
  min-width: 20px;
  height: 24px;
  border-radius: 3px;
  transition: opacity 0.1s;
}

.heatmap-cell:hover {
  opacity: 0.8;
}

.heatmap-hours {
  display: flex;
  gap: 2px;
}

.heatmap-hour {
  flex: 1;
  min-width: 20px;
  text-align: center;
  font-size: 0.6rem;
  color: var(--color-text-muted);
}
</style>
