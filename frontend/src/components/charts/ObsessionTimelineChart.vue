<template>
  <div class="chart-container card">
    <div class="chart-header">
      <div>
        <h2 class="chart-title">Obsession Timeline</h2>
        <p class="chart-subtitle">Months where a single artist consumed &gt;40% of your listening hours</p>
      </div>
      <span v-if="hasData" class="phase-count">{{ phaseCount }} obsession {{ phaseCount === 1 ? 'month' : 'months' }}</span>
    </div>

    <div v-if="!hasData" class="empty-state">
      <p>No obsession phases found — you're a well-rounded listener!</p>
    </div>

    <div v-else>
      <div class="chart-wrapper">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
      <div class="phase-legend">
        <span
          v-for="(artist, i) in uniqueArtists"
          :key="artist"
          class="legend-item"
        >
          <span class="legend-dot" :style="{ background: artistColor(i) }"></span>
          {{ artist }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ObsessionPhasePoint } from '@music-livereview/shared';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const props = defineProps<{ data: ObsessionPhasePoint[] }>();

const PALETTE = [
  '#1db954', // Spotify green
  '#e67e22', // orange
  '#3498db', // blue
  '#9b59b6', // purple
  '#e74c3c', // red
  '#1abc9c', // teal
  '#f39c12', // yellow-orange
  '#2ecc71', // emerald
  '#e91e63', // pink
  '#00bcd4', // cyan
];

const hasData = computed(() => props.data.length > 0);
const phaseCount = computed(() => props.data.length);

const uniqueArtists = computed(() => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const d of props.data) {
    if (!seen.has(d.artistName)) {
      seen.add(d.artistName);
      result.push(d.artistName);
    }
  }
  return result;
});

const artistIndexMap = computed(() => {
  const map = new Map<string, number>();
  uniqueArtists.value.forEach((name, i) => map.set(name, i));
  return map;
});

function artistColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

const chartData = computed(() => ({
  labels: props.data.map(d => d.period),
  datasets: [
    {
      label: 'Artist share (%)',
      data: props.data.map(d => d.percentage),
      backgroundColor: props.data.map(d => {
        const idx = artistIndexMap.value.get(d.artistName) ?? 0;
        return artistColor(idx) + 'cc'; // slight transparency
      }),
      borderColor: props.data.map(d => {
        const idx = artistIndexMap.value.get(d.artistName) ?? 0;
        return artistColor(idx);
      }),
      borderWidth: 1,
      borderRadius: 4,
    },
  ],
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title: (items: Array<{ dataIndex: number }>) => {
          const d = props.data[items[0].dataIndex];
          return `${d.period} — ${d.artistName}`;
        },
        label: (item: { dataIndex: number }) => {
          const d = props.data[item.dataIndex];
          return [
            `  Share: ${d.percentage}%`,
            `  Artist hours: ${d.artistHours}h`,
            `  Total hours: ${d.totalHours}h`,
          ];
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#aaa', maxRotation: 45, minRotation: 45 },
      grid: { color: '#2a2a2a' },
    },
    y: {
      min: 0,
      max: 100,
      ticks: {
        color: '#aaa',
        callback: (v: number | string) => `${v}%`,
      },
      grid: { color: '#2a2a2a' },
    },
  },
}));
</script>

<style scoped>
.chart-container {
  padding: 1.5rem;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.chart-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
}

.chart-subtitle {
  font-size: 0.85rem;
  color: #aaa;
  margin: 0;
}

.phase-count {
  font-size: 0.8rem;
  color: #1db954;
  background: #1db95420;
  border: 1px solid #1db95440;
  border-radius: 12px;
  padding: 0.2rem 0.65rem;
  white-space: nowrap;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #666;
  font-size: 0.9rem;
}

.chart-wrapper {
  height: 280px;
  position: relative;
}

.phase-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
  margin-top: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #ccc;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
