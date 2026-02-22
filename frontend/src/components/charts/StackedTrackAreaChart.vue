<template>
  <div class="chart-container card">
    <div class="chart-header">
      <h3 class="section-title">Top Songs Over Time</h3>
      <div v-if="hasData && selectedTracks.length > 0" class="controls">
        <span class="selection-count">{{ selectedTracks.length }} of {{ legendItems.length }} shown</span>
        <button class="ctrl-btn" @click="showAll">Show All</button>
      </div>
    </div>

    <div v-if="!hasData" class="empty-state">No data available.</div>

    <template v-else>
      <div class="chart-wrapper" ref="wrapperRef">
        <canvas ref="canvasRef"></canvas>

        <!-- Custom tooltip -->
        <Transition name="tt-fade">
          <div
            v-if="tooltip.visible"
            class="custom-tooltip"
            :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
          >
            <div class="tt-period">{{ tooltip.period }}</div>
            <div
              v-for="item in tooltip.items"
              :key="item.label"
              class="tt-row"
              :class="{ 'tt-row--active': selectedTracks.includes(item.label) }"
              @click.stop="toggleTrack(item.label)"
            >
              <span class="tt-swatch" :style="{ background: item.color }"></span>
              <span class="tt-name">{{ item.label }}</span>
              <span class="tt-val">{{ item.value }}h</span>
              <span class="tt-check">{{ selectedTracks.length > 0 ? (selectedTracks.includes(item.label) ? '✓' : '') : '' }}</span>
            </div>
            <div class="tt-hint">click to toggle · use pills below to multi-select</div>
          </div>
        </Transition>
      </div>

      <!-- Clickable legend pills -->
      <div class="legend">
        <button
          v-for="item in legendItems"
          :key="item.label"
          class="legend-item"
          :class="{
            'legend-item--active': selectedTracks.length === 0 || selectedTracks.includes(item.label),
            'legend-item--dim': selectedTracks.length > 0 && !selectedTracks.includes(item.label),
          }"
          :style="selectedTracks.includes(item.label) ? { borderColor: item.color + '80' } : {}"
          @click="toggleTrack(item.label)"
        >
          <span class="legend-dot" :style="{ background: item.color }"></span>
          <span class="legend-track">{{ item.trackName }}</span>
          <span class="legend-artist">{{ item.artistName }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
} from 'chart.js';
import type { TrackTimelineResponse } from '@music-livereview/shared';

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Filler);

const COLORS = [
  '#1db954', '#1ed760', '#2ecc71', '#3498db', '#9b59b6',
  '#e74c3c', '#e67e22', '#f1c40f', '#00bcd4', '#ff5722',
];

const props = defineProps<{ data: TrackTimelineResponse | null }>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const wrapperRef = ref<HTMLDivElement | null>(null);
let chart: Chart<'line'> | null = null;

// selectedTracks: empty = all visible; non-empty = only those labels are visible
const selectedTracks = ref<string[]>([]);

const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  period: '',
  items: [] as Array<{ label: string; color: string; value: number }>,
});

const hasData = computed(() => !!props.data && props.data.periods.length > 0);

function trackLabel(name: string, artistName: string): string {
  return `${name} — ${artistName}`;
}

const legendItems = computed(() => {
  if (!props.data) return [];
  return props.data.tracks.map((t, i) => ({
    label: trackLabel(t.name, t.artistName),
    trackName: t.name,
    artistName: t.artistName,
    color: COLORS[i % COLORS.length],
  }));
});

// ─── Chart lifecycle ──────────────────────────────────────────────────────────

function buildDatasets() {
  return (props.data?.tracks ?? []).map((track, i) => ({
    label: trackLabel(track.name, track.artistName),
    data: track.values,
    borderColor: COLORS[i % COLORS.length],
    backgroundColor: COLORS[i % COLORS.length] + '33',
    fill: true,
    tension: 0.3,
    pointRadius: 0,
    pointHoverRadius: 0,
  }));
}

function buildChart() {
  if (!canvasRef.value || !props.data?.periods.length) return;

  chart = new Chart(canvasRef.value, {
    type: 'line',
    data: {
      labels: props.data.periods,
      datasets: buildDatasets(),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 200 },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: { grid: { color: '#2a2a2a' }, ticks: { color: '#888', maxRotation: 45 } },
        y: { grid: { color: '#2a2a2a' }, ticks: { color: '#888' } },
      },
    },
  });

  canvasRef.value.addEventListener('mousemove', handleMouseMove);
  canvasRef.value.addEventListener('mouseleave', handleMouseLeave);
  canvasRef.value.addEventListener('click', handleCanvasClick);
}

function destroyChart() {
  canvasRef.value?.removeEventListener('mousemove', handleMouseMove);
  canvasRef.value?.removeEventListener('mouseleave', handleMouseLeave);
  canvasRef.value?.removeEventListener('click', handleCanvasClick);
  chart?.destroy();
  chart = null;
}

// ─── Hover / tooltip ──────────────────────────────────────────────────────────

interface TooltipItem { label: string; color: string; value: number }

function getTracksUnderCursor(event: MouseEvent): { period: string; items: TooltipItem[] } | null {
  if (!chart) return null;

  const elements = chart.getElementsAtEventForMode(
    event as unknown as Event,
    'index',
    { intersect: false },
    true,
  );
  if (!elements.length) return null;

  const xIndex = elements[0].index;
  const period = (chart.data.labels?.[xIndex] as string) ?? '';
  const cursorY = chart.scales['y'].getValueForPixel(event.offsetY) ?? 0;

  const items: TooltipItem[] = [];
  chart.data.datasets.forEach((dataset, i) => {
    if (chart!.getDatasetMeta(i).hidden) return;
    const val = Number(dataset.data[xIndex]) || 0;
    if (val > 0 && val >= cursorY) {
      items.push({
        label: dataset.label ?? '',
        color: dataset.borderColor as string,
        value: Math.round(val * 10) / 10,
      });
    }
  });

  items.sort((a, b) => a.value - b.value);
  return { period, items };
}

function handleMouseMove(event: MouseEvent) {
  if (!wrapperRef.value || !canvasRef.value) return;

  const result = getTracksUnderCursor(event);
  if (!result || !result.items.length) {
    tooltip.value.visible = false;
    canvasRef.value.style.cursor = 'default';
    return;
  }

  canvasRef.value.style.cursor = 'pointer';

  const canvasRect = canvasRef.value.getBoundingClientRect();
  const wrapperRect = wrapperRef.value.getBoundingClientRect();
  const relX = canvasRect.left - wrapperRect.left + event.offsetX;
  const relY = canvasRect.top - wrapperRect.top + event.offsetY;
  const ttWidth = 240;
  const x = relX + 18 + ttWidth > wrapperRef.value.offsetWidth ? relX - ttWidth - 8 : relX + 18;

  tooltip.value = {
    visible: true,
    x,
    y: Math.max(0, relY - 12),
    period: result.period,
    items: result.items,
  };
}

function handleMouseLeave() {
  tooltip.value.visible = false;
  if (canvasRef.value) canvasRef.value.style.cursor = 'default';
}

// ─── Selection logic ──────────────────────────────────────────────────────────

function applyVisibility() {
  if (!chart) return;
  const sel = selectedTracks.value;
  chart.data.datasets.forEach((_, i) => {
    chart!.getDatasetMeta(i).hidden = sel.length > 0 && !sel.includes(chart!.data.datasets[i].label ?? '');
  });
  chart.update('none');
}

function toggleTrack(label: string) {
  const current = selectedTracks.value;
  if (current.includes(label)) {
    selectedTracks.value = current.filter(n => n !== label);
  } else {
    selectedTracks.value = [...current, label];
  }
  applyVisibility();
}

function handleCanvasClick(event: MouseEvent) {
  const result = getTracksUnderCursor(event);
  if (!result || result.items.length !== 1) return;
  toggleTrack(result.items[0].label);
}

function showAll() {
  selectedTracks.value = [];
  if (!chart) return;
  chart.data.datasets.forEach((_, i) => {
    chart!.getDatasetMeta(i).hidden = false;
  });
  chart.update('none');
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(() => {
  if (hasData.value) buildChart();
});

watch(
  () => props.data,
  () => {
    destroyChart();
    selectedTracks.value = [];
    tooltip.value.visible = false;
    if (hasData.value) buildChart();
  },
);

onUnmounted(destroyChart);
</script>

<style scoped>
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
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
  transition: color 0.15s, border-color 0.15s;
}
.ctrl-btn:hover { color: #e0e0e0; border-color: #555; }

.empty-state {
  padding: 2rem 0;
  text-align: center;
  color: #888;
  font-size: 0.9rem;
}

.chart-wrapper {
  position: relative;
  height: 400px;
}

.chart-wrapper canvas {
  width: 100% !important;
  height: 100% !important;
}

/* Custom tooltip */
.custom-tooltip {
  position: absolute;
  z-index: 10;
  pointer-events: auto;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 8px 10px;
  min-width: 200px;
  max-width: 260px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  user-select: none;
}

.tt-period {
  font-size: 0.72rem;
  color: #666;
  margin-bottom: 6px;
  letter-spacing: 0.03em;
}

.tt-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 3px 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
}
.tt-row:hover { background: rgba(255,255,255,0.07); }
.tt-row--active { background: rgba(255,255,255,0.05); }

.tt-swatch {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tt-name {
  flex: 1;
  font-size: 0.82rem;
  color: #ddd;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tt-val {
  font-size: 0.8rem;
  color: #aaa;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.tt-check {
  width: 12px;
  font-size: 0.75rem;
  color: #1db954;
  flex-shrink: 0;
  text-align: right;
}

.tt-hint {
  margin-top: 6px;
  font-size: 0.68rem;
  color: #555;
  border-top: 1px solid #2a2a2a;
  padding-top: 5px;
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
  background: rgba(255,255,255,0.04);
  border: 1px solid #333;
  border-radius: 20px;
  cursor: pointer;
  transition: opacity 0.2s, border-color 0.15s, background 0.15s, color 0.15s;
}
.legend-item:hover {
  background: rgba(255,255,255,0.09);
  color: #fff;
}
.legend-item--active { color: #e0e0e0; }
.legend-item--dim { opacity: 0.3; }

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-track {
  color: #e0e0e0;
}

.legend-artist {
  color: #666;
  font-size: 0.72rem;
}

/* Tooltip transition */
.tt-fade-enter-active,
.tt-fade-leave-active { transition: opacity 0.1s; }
.tt-fade-enter-from,
.tt-fade-leave-to { opacity: 0; }
</style>
