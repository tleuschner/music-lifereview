<template>
  <div class="chart-container card">
    <div class="chart-header">
      <div>
        <h2 class="chart-title">Discovery Age Map</h2>
        <p class="chart-subtitle">When did you first play your top {{ data.length }} artists?</p>
      </div>
      <span v-if="hasData" class="class-count">{{ yearGroups.length }} {{ yearGroups.length === 1 ? 'era' : 'eras' }}</span>
    </div>

    <div v-if="!hasData" class="empty-state">
      <p>Not enough data to build a discovery map.</p>
    </div>

    <div v-else>
      <div class="chart-wrapper">
        <Bar :data="chartData" :options="chartOptions" />
      </div>

      <div class="class-list">
        <div v-for="group in yearGroups" :key="group.year" class="class-row">
          <span class="class-label" :style="{ color: yearColor(group.year) }">Class of {{ group.year }}</span>
          <div class="artist-chips">
            <span
              v-for="artist in group.artists"
              :key="artist.name"
              class="chip"
              :style="{ borderColor: yearColor(group.year) + '66' }"
              :title="`${artist.totalHours}h`"
            >{{ artist.name }}</span>
          </div>
        </div>
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
} from 'chart.js';
import type { ArtistDiscoveryEntry } from '@music-livereview/shared';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const props = defineProps<{ data: ArtistDiscoveryEntry[] }>();

const hasData = computed(() => props.data.length > 0);

// Group artists by discovery year
const yearGroups = computed(() => {
  const map = new Map<number, ArtistDiscoveryEntry[]>();
  for (const entry of props.data) {
    const list = map.get(entry.discoveryYear) ?? [];
    list.push(entry);
    map.set(entry.discoveryYear, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, artists]) => ({ year, artists }));
});

const years = computed(() => yearGroups.value.map(g => String(g.year)));
const counts = computed(() => yearGroups.value.map(g => g.artists.length));

// Color: gradient from muted gray (oldest) → Spotify green (newest)
function yearColor(year: number): string {
  if (yearGroups.value.length === 0) return '#1db954';
  const minYear = yearGroups.value[0].year;
  const maxYear = yearGroups.value[yearGroups.value.length - 1].year;
  const range = maxYear - minYear || 1;
  const t = (year - minYear) / range; // 0 (oldest) → 1 (newest)

  // Interpolate: #555555 → #1db954
  const r = Math.round(0x55 + t * (0x1d - 0x55));
  const g = Math.round(0x55 + t * (0xb9 - 0x55));
  const b = Math.round(0x55 + t * (0x54 - 0x55));
  return `rgb(${r},${g},${b})`;
}

const chartData = computed(() => ({
  labels: years.value,
  datasets: [
    {
      label: 'Artists discovered',
      data: counts.value,
      backgroundColor: years.value.map(y => yearColor(Number(y)) + 'cc'),
      borderColor: years.value.map(y => yearColor(Number(y))),
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
        title: (items: Array<{ dataIndex: number }>) => `Class of ${years.value[items[0].dataIndex]}`,
        label: (item: { dataIndex: number }) => {
          const group = yearGroups.value[item.dataIndex];
          const names = group.artists.slice(0, 5).map(a => a.name);
          const extra = group.artists.length > 5 ? [`  +${group.artists.length - 5} more`] : [];
          return [`  ${group.artists.length} artist${group.artists.length === 1 ? '' : 's'}`, ...names.map(n => `  · ${n}`), ...extra];
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#aaa' },
      grid: { color: '#2a2a2a' },
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: '#aaa',
        stepSize: 1,
        precision: 0,
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

.class-count {
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
  height: 220px;
  position: relative;
}

.class-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.class-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.class-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
  padding-top: 0.15rem;
  min-width: 80px;
}

.artist-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.chip {
  font-size: 0.75rem;
  color: #ccc;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 20px;
  padding: 0.15rem 0.6rem;
  cursor: default;
}
</style>
