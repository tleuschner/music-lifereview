<template>
  <div class="chart-container card">
    <div class="chart-header">
      <h3 class="section-title">Top Artists Over Time</h3>
      <div class="chart-controls" v-if="chartData">
        <button class="ctrl-btn" @click="selectAll">Select All</button>
        <button class="ctrl-btn" @click="deselectAll">Deselect All</button>
      </div>
    </div>
    <div class="chart-wrapper">
      <Line v-if="chartData" ref="chartRef" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import type { ArtistTimelineResponse } from '@music-livereview/shared';
import { useChartData } from '../../composables/useChartData';
import type { ChartOptions } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const props = defineProps<{ data: ArtistTimelineResponse | null }>();
const { toStackedAreaChart } = useChartData();

const chartRef = ref<InstanceType<typeof Line> | null>(null);

const chartData = computed(() =>
  props.data && props.data.periods.length ? toStackedAreaChart(props.data) : null
);

// Non-stacked: each line renders at its actual monthly hours.
// With stacked:true, showing a lower-index dataset pushes all higher-index lines up
// by that dataset's values, creating phantom bumps on unrelated artists.
const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { labels: { color: '#e0e0e0', boxWidth: 12, padding: 16 } },
  },
  scales: {
    x: { grid: { color: '#2a2a2a' }, ticks: { color: '#888', maxRotation: 45 } },
    y: { grid: { color: '#2a2a2a' }, ticks: { color: '#888' } },
  },
};

function selectAll() {
  const chart = (chartRef.value as any)?.chart;
  if (!chart) return;
  chart.data.datasets.forEach((_: unknown, i: number) => {
    chart.getDatasetMeta(i).hidden = false;
  });
  chart.update();
}

function deselectAll() {
  const chart = (chartRef.value as any)?.chart;
  if (!chart) return;
  chart.data.datasets.forEach((_: unknown, i: number) => {
    chart.getDatasetMeta(i).hidden = true;
  });
  chart.update();
}
</script>

<style scoped>
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ctrl-btn {
  padding: 4px 12px;
  font-size: 0.75rem;
  background: transparent;
  color: #888;
  border: 1px solid #333;
  border-radius: 4px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.ctrl-btn:hover {
  color: #e0e0e0;
  border-color: #555;
}

.chart-wrapper {
  height: 400px;
}
</style>
