<template>
  <div class="chart-container card">
    <div class="chart-header">
      <h3 class="section-title">Session Stamina</h3>
      <p class="chart-subtitle" v-if="data">
        You average <strong>{{ data.overallAverage }} tracks</strong> per listening chain.
        <template v-if="best">
          Peak: <strong>{{ best.avg }} tracks</strong> on {{ best.day }}s at {{ best.hour }}:00.
        </template>
      </p>
    </div>

    <div v-if="hasData" class="heatmap">
      <div class="heatmap-row" v-for="(row, dayIdx) in data!.data" :key="dayIdx">
        <span class="heatmap-day">{{ days[dayIdx] }}</span>
        <div
          v-for="(val, hourIdx) in row"
          :key="hourIdx"
          class="heatmap-cell"
          :style="{ backgroundColor: cellColor(val) }"
          :title="`${days[dayIdx]} ${hourIdx}:00 — avg ${val} tracks`"
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
import type { SessionStaminaResponse } from '@music-livereview/shared';

const props = defineProps<{ data: SessionStaminaResponse | null }>();

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const hasData = computed(() => props.data && props.data.data.some(row => row.some(v => v > 0)));

const maxValue = computed(() => {
  if (!props.data) return 0;
  return Math.max(...props.data.data.flat());
});

const best = computed(() => {
  if (!props.data || maxValue.value === 0) return null;
  let bestDay = 0;
  let bestHour = 0;
  let bestVal = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (props.data.data[d][h] > bestVal) {
        bestVal = props.data.data[d][h];
        bestDay = d;
        bestHour = h;
      }
    }
  }
  return { day: days[bestDay], hour: bestHour, avg: bestVal };
});

function cellColor(val: number): string {
  if (maxValue.value === 0) return '#1a1a1a';
  const intensity = val / maxValue.value;
  // Dark bg → orange (#e67e22)
  const r = Math.round(26 + intensity * (230 - 26));
  const g = Math.round(26 + intensity * (126 - 26));
  const b = Math.round(26 + intensity * (34 - 26));
  return `rgb(${r}, ${g}, ${b})`;
}
</script>

<style scoped>
.chart-header {
  margin-bottom: 1rem;
}

.chart-subtitle {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.chart-subtitle strong {
  color: #e67e22;
}

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
