<template>
  <div class="chart-container card">
    <div class="chart-header">
      <div class="header-row">
        <div>
          <h3>Deliberate vs. Served Plays</h3>
          <p class="chart-subtitle">Artists you seek out vs. ones that just come on</p>
        </div>
        <div class="sort-toggle">
          <button :class="{ active: sortMode === 'deliberate_rate' }" @click="sortMode = 'deliberate_rate'">By Rate</button>
          <button :class="{ active: sortMode === 'total_plays' }" @click="sortMode = 'total_plays'">By Plays</button>
        </div>
      </div>
    </div>

    <div v-if="!hasData" class="empty-state">
      <p>Not enough data. Play at least 20 tracks per artist to see intent breakdown.</p>
    </div>

    <template v-else>
      <div class="legend">
        <span class="legend-item"><span class="dot deliberate"></span>Deliberate (you chose it)</span>
        <span class="legend-item"><span class="dot served"></span>Served (auto-played)</span>
      </div>
      <div class="chart-wrapper">
        <canvas ref="canvas"></canvas>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ArtistIntentEntry } from '@music-livereview/shared';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const props = defineProps<{ data: ArtistIntentEntry[] }>();

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

const sortMode = ref<'deliberate_rate' | 'total_plays'>('deliberate_rate');

const displayed = computed(() => {
  const sorted = [...props.data].sort((a, b) =>
    sortMode.value === 'total_plays'
      ? b.totalPlays - a.totalPlays
      : b.deliberateRate - a.deliberateRate
  );
  return sorted.slice(0, 50);
});
const hasData = computed(() => displayed.value.length > 0);

function buildChart() {
  if (!canvas.value || !hasData.value) return;

  const labels = displayed.value.map(d => d.name);
  const deliberate = displayed.value.map(d => d.deliberatePlays);
  const served = displayed.value.map(d => d.servedPlays);

  chart = new Chart(canvas.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Deliberate',
          data: deliberate,
          backgroundColor: '#1db954',
          borderRadius: 3,
        },
        {
          label: 'Served',
          data: served,
          backgroundColor: '#e67e22',
          borderRadius: 3,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterBody(items) {
              const idx = items[0].dataIndex;
              const entry = displayed.value[idx];
              return [
                `Deliberate rate: ${entry.deliberateRate}%`,
                `Total plays: ${entry.totalPlays}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#aaa' },
        },
        y: {
          stacked: true,
          grid: { display: false },
          ticks: { color: '#ccc', font: { size: 12 } },
        },
      },
    },
  });
}

function destroyChart() {
  chart?.destroy();
  chart = null;
}

onMounted(() => {
  if (hasData.value) buildChart();
});

watch(
  [() => props.data, sortMode],
  () => {
    destroyChart();
    if (hasData.value) buildChart();
  },
);

onUnmounted(destroyChart);
</script>

<style scoped>
.chart-header {
  margin-bottom: 1rem;
}

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.chart-header h3 {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
  color: #fff;
}

.chart-subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: #888;
}

.sort-toggle {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.sort-toggle button {
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  border: 1px solid #333;
  border-radius: 4px;
  background: transparent;
  color: #888;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.sort-toggle button:hover {
  border-color: #555;
  color: #ccc;
}

.sort-toggle button.active {
  background: #1db954;
  border-color: #1db954;
  color: #000;
}

.legend {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
  color: #aaa;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.dot.deliberate { background: #1db954; }
.dot.served     { background: #e67e22; }

.chart-wrapper {
  position: relative;
  height: 1200px;
}

.empty-state {
  padding: 2rem 0;
  text-align: center;
  color: #888;
  font-size: 0.9rem;
}
</style>
