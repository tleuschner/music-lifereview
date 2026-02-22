<template>
  <div class="chart-container card">
    <div class="chart-header">
      <h3>Shuffle Serendipity</h3>
      <p class="chart-subtitle">Tracks you only ever heard on shuffle — and loved every time. Your best accidental discoveries.</p>
    </div>

    <div v-if="!hasData" class="empty-state">
      <p>No serendipitous discoveries yet. Need tracks played 3+ times exclusively on shuffle with high completion rates.</p>
    </div>

    <template v-else>
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
} from 'chart.js';
import type { ShuffleSerendipityEntry } from '@music-livereview/shared';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

const props = defineProps<{ data: ShuffleSerendipityEntry[] }>();

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

const displayed = computed(() => props.data.slice(0, 20));
const hasData = computed(() => displayed.value.length > 0);

function buildChart() {
  if (!canvas.value || !hasData.value) return;

  const labels = displayed.value.map(d => `${d.name} — ${d.artistName}`);
  const completionRates = displayed.value.map(d => d.completionRate);

  chart = new Chart(canvas.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Completion Rate',
          data: completionRates,
          backgroundColor: displayed.value.map(d =>
            d.completionRate >= 90 ? '#1db954' :
            d.completionRate >= 75 ? '#27ae60' : '#2ecc71'
          ),
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
            label(item) {
              const entry = displayed.value[item.dataIndex];
              return `Completion: ${entry.completionRate}%  |  Shuffle plays: ${entry.shufflePlays}`;
            },
          },
        },
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: {
            color: '#aaa',
            callback: (v) => `${v}%`,
          },
        },
        y: {
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
  () => props.data,
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

.chart-wrapper {
  position: relative;
  height: 480px;
}

.empty-state {
  padding: 2rem 0;
  text-align: center;
  color: #888;
  font-size: 0.9rem;
}
</style>
