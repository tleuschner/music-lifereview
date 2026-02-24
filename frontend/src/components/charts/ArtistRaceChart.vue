<template>
  <div class="chart-container card">
    <div class="chart-header">
      <div>
        <h3 class="section-title">All-Time Artist Race</h3>
        <p class="section-subtitle">
          Cumulative listening hours — see exactly when each artist took over
          your life.
        </p>
      </div>
      <div v-if="chartData && selectedArtists.length > 0" class="controls">
        <span class="selection-count"
          >{{ selectedArtists.length }} of {{ legendItems.length }} shown</span
        >
        <button class="ctrl-btn" @click="showAll">Show All</button>
      </div>
    </div>

    <div v-if="!chartData" class="empty-state">No data available.</div>

    <template v-else>
      <div class="chart-wrapper">
        <Line ref="chartRef" :data="chartData" :options="chartOptions" />
      </div>

      <!-- Clickable legend pills (multi-select) -->
      <div class="legend">
        <button
          v-for="item in legendItems"
          :key="item.name"
          class="legend-item"
          :class="{
            'legend-item--active':
              selectedArtists.length === 0 ||
              selectedArtists.includes(item.name),
            'legend-item--dim':
              selectedArtists.length > 0 &&
              !selectedArtists.includes(item.name),
          }"
          :style="
            selectedArtists.includes(item.name)
              ? { borderColor: item.color + '80' }
              : {}
          "
          @click="toggleArtist(item.name)"
        >
          <span class="legend-dot" :style="{ background: item.color }"></span>
          {{ item.name }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import type { ArtistTimelineResponse } from "@music-livereview/shared";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
);

const COLORS = [
  "#1db954", // spotify green — keep as anchor
  "#e74c3c", // red
  "#3498db", // blue
  "#f1c40f", // yellow
  "#9b59b6", // purple
  "#ff7043", // deep orange
  "#00bcd4", // cyan
  "#e91e63", // pink
  "#43a047", // darker green (distinct from spotify green)
  "#ff9800", // amber
];

const props = defineProps<{ data: ArtistTimelineResponse | null }>();
const chartRef = ref<InstanceType<typeof Line> | null>(null);

// selectedArtists: empty = all visible; non-empty = only those are visible
const selectedArtists = ref<string[]>([]);

const chartData = computed(() => {
  if (!props.data || !props.data.periods.length) return null;
  return {
    labels: props.data.periods,
    datasets: props.data.artists.map((artist, i) => ({
      label: artist.name,
      data: artist.values,
      borderColor: COLORS[i % COLORS.length],
      backgroundColor: "transparent",
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
    })),
  };
});

const legendItems = computed(() => {
  if (!props.data) return [];
  return props.data.artists.map((a, i) => ({
    name: a.name,
    color: COLORS[i % COLORS.length],
  }));
});

const chartOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) =>
          ` ${ctx.dataset.label}: ${ctx.parsed?.y?.toLocaleString(undefined, { maximumFractionDigits: 1 })}h total`,
      },
    },
  },
  scales: {
    x: {
      grid: { color: "#2a2a2a" },
      ticks: { color: "#888", maxRotation: 45 },
    },
    y: {
      grid: { color: "#2a2a2a" },
      ticks: {
        color: "#888",
        callback: (v) => `${v}h`,
      },
    },
  },
};

function getChart(): ChartJS<"line"> | null {
  return (chartRef.value as any)?.chart ?? null;
}

function applyVisibility() {
  const chart = getChart();
  if (!chart) return;
  const sel = selectedArtists.value;
  chart.data.datasets.forEach((ds, i) => {
    chart.getDatasetMeta(i).hidden =
      sel.length > 0 && !sel.includes(ds.label ?? "");
  });
  chart.update("none");
}

function toggleArtist(name: string) {
  const current = selectedArtists.value;
  if (current.includes(name)) {
    selectedArtists.value = current.filter((n) => n !== name);
  } else {
    selectedArtists.value = [...current, name];
  }
  applyVisibility();
}

function showAll() {
  selectedArtists.value = [];
  const chart = getChart();
  if (!chart) return;
  chart.data.datasets.forEach((_, i) => {
    chart.getDatasetMeta(i).hidden = false;
  });
  chart.update("none");
}

// Reset selection when new data arrives (chart rebuilds, hidden states reset)
watch(
  () => props.data,
  () => {
    selectedArtists.value = [];
  },
);
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

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 2px;
}

.selection-count {
  font-size: 0.75rem;
  color: #666;
}

.ctrl-btn {
  padding: 4px 12px;
  font-size: 0.75rem;
  background: transparent;
  color: #888;
  border: 1px solid #333;
  border-radius: 4px;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
}
.ctrl-btn:hover {
  color: #e0e0e0;
  border-color: #555;
}

.empty-state {
  padding: 2rem 0;
  text-align: center;
  color: #888;
  font-size: 0.9rem;
}

.chart-wrapper {
  height: 400px;
}

/* Legend */
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  font-size: 0.78rem;
  color: #ccc;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid #333;
  border-radius: 20px;
  cursor: pointer;
  transition:
    opacity 0.2s,
    border-color 0.15s,
    background 0.15s,
    color 0.15s;
}
.legend-item:hover {
  background: rgba(255, 255, 255, 0.09);
  color: #fff;
}
.legend-item--active {
  color: #e0e0e0;
}
.legend-item--dim {
  opacity: 0.3;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
