<template>
  <div class="chart-container card">
    <div class="chart-header">
      <div>
        <h3 class="section-title">All-Time Artist Race</h3>
        <p class="section-subtitle">Cumulative listening hours — see exactly when each artist took over your life.</p>
      </div>
      <div class="chart-controls" v-if="chartData">
        <button class="ctrl-btn" @click="selectAll">All</button>
        <button class="ctrl-btn" @click="deselectAll">None</button>
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
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import type { ArtistTimelineResponse } from '@music-livereview/shared';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const COLORS = [
  '#1db954', '#1ed760', '#2ecc71', '#3498db', '#9b59b6',
  '#e74c3c', '#e67e22', '#f1c40f', '#00bcd4', '#ff5722',
];

const props = defineProps<{ data: ArtistTimelineResponse | null }>();
const chartRef = ref<InstanceType<typeof Line> | null>(null);

const chartData = computed(() => {
  if (!props.data || !props.data.periods.length) return null;
  return {
    labels: props.data.periods,
    datasets: props.data.artists.map((artist, i) => ({
      label: artist.name,
      data: artist.values,
      borderColor: COLORS[i % COLORS.length],
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
    })),
  };
});

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      labels: { color: '#e0e0e0', boxWidth: 12, padding: 16 },
    },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString(undefined, { maximumFractionDigits: 1 })}h total`,
      },
    },
  },
  scales: {
    x: {
      grid: { color: '#2a2a2a' },
      ticks: { color: '#888', maxRotation: 45 },
    },
    y: {
      grid: { color: '#2a2a2a' },
      ticks: {
        color: '#888',
        callback: (v) => `${v}h`,
      },
    },
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
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 1rem;
}

.section-subtitle {
  color: #888;
  font-size: 0.85rem;
  margin-top: 2px;
  margin-bottom: 0;
}

.chart-controls {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  padding-top: 2px;
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
