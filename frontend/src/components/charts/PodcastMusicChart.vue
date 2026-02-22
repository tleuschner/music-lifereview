<template>
  <div class="chart-container card">
    <div class="chart-header">
      <div>
        <h3 class="section-title">Podcast vs. Music Balance</h3>
        <p class="section-subtitle">How your listening split between music and podcasts over time.</p>
      </div>
      <div v-if="hasData" class="legend">
        <span class="legend-item"><span class="dot dot-music"></span>Music</span>
        <span class="legend-item"><span class="dot dot-podcast"></span>Podcasts</span>
      </div>
    </div>

    <div v-if="hasData">
      <div class="summary-row">
        <div class="summary-stat">
          <span class="summary-value">{{ totalMusicHours }}h</span>
          <span class="summary-label">music</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-stat">
          <span class="summary-value">{{ totalPodcastHours }}h</span>
          <span class="summary-label">podcasts</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-stat">
          <span class="summary-value">{{ podcastPct }}%</span>
          <span class="summary-label">podcast share</span>
        </div>
      </div>

      <div class="chart-wrap">
        <canvas ref="canvas"></canvas>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>No content split data yet.</p>
      <p class="empty-hint">Upload your Spotify data to see how your podcast and music listening compare over time.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ContentSplitPoint } from '@music-livereview/shared';

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const props = defineProps<{ data: ContentSplitPoint[] }>();

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

const hasData = computed(() => props.data.length > 0);

const totalMusicHours = computed(() =>
  Math.round(props.data.reduce((s, p) => s + p.musicHours, 0) * 10) / 10
);
const totalPodcastHours = computed(() =>
  Math.round(props.data.reduce((s, p) => s + p.podcastHours, 0) * 10) / 10
);
const podcastPct = computed(() => {
  const total = totalMusicHours.value + totalPodcastHours.value;
  return total > 0 ? Math.round(totalPodcastHours.value / total * 1000) / 10 : 0;
});

function buildChart() {
  if (!canvas.value || !hasData.value) return;

  chart?.destroy();

  const labels = props.data.map(p => p.period);
  chart = new Chart(canvas.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Music',
          data: props.data.map(p => p.musicHours),
          backgroundColor: '#1db954cc',
          borderRadius: 2,
          stack: 'content',
        },
        {
          label: 'Podcasts',
          data: props.data.map(p => p.podcastHours),
          backgroundColor: '#e67e22cc',
          borderRadius: 2,
          stack: 'content',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 3,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const point = props.data[ctx.dataIndex];
              if (ctx.datasetIndex === 0) {
                return `Music: ${point.musicHours}h (${point.musicPlays.toLocaleString()} plays)`;
              }
              return `Podcasts: ${point.podcastHours}h (${point.podcastPlays.toLocaleString()} plays)`;
            },
            footer: (items) => {
              const point = props.data[items[0].dataIndex];
              const total = point.musicHours + point.podcastHours;
              if (total === 0) return '';
              const pct = Math.round(point.podcastHours / total * 1000) / 10;
              return `Podcast share: ${pct}%`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { color: '#666', maxRotation: 45 },
        },
        y: {
          stacked: true,
          grid: { color: '#1a1a1a' },
          ticks: {
            color: '#666',
            callback: (v) => `${v}h`,
          },
        },
      },
    },
  });
}

onMounted(() => { if (hasData.value) buildChart(); });
onUnmounted(() => chart?.destroy());
watch(() => props.data, () => buildChart(), { deep: true });
</script>

<style scoped>
.chart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.section-subtitle {
  color: #888;
  font-size: 0.85rem;
  margin-top: 2px;
  margin-bottom: 0;
}

.legend {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding-top: 2px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
  color: #aaa;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.dot-music   { background: #1db954cc; }
.dot-podcast { background: #e67e22cc; }

.summary-row {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  margin-bottom: 1.25rem;
}

.summary-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #e0e0e0;
  font-variant-numeric: tabular-nums;
}

.summary-label {
  font-size: 0.75rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.summary-divider {
  width: 1px;
  height: 2rem;
  background: #222;
}

.chart-wrap {
  position: relative;
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #888;
}

.empty-hint {
  font-size: 0.8rem;
  margin-top: 0.5rem;
  color: #555;
}
</style>
