<template>
  <div class="chart-container card">
    <div class="chart-header">
      <div>
        <h2 class="chart-title">Song Obsession Peaks</h2>
        <p class="chart-subtitle">Your 20 most song-dominated months — ranked by how much one track owned your listening</p>
      </div>
      <span v-if="hasData" class="phase-count">{{ phaseCount }} {{ phaseCount === 1 ? 'month' : 'months' }}</span>
    </div>

    <div v-if="!hasData" class="empty-state">
      <p>No data yet — upload your Spotify history to see your song obsession peaks.</p>
    </div>

    <div v-else>
      <div class="chart-area">
        <!-- Y-axis labels -->
        <div class="y-axis">
          <span
            v-for="tick in yAxis.ticks"
            :key="tick.value"
            class="y-label"
            :style="{ bottom: tick.pct + '%' }"
          >{{ tick.value }}h</span>
        </div>

        <!-- Bars + gridlines -->
        <div class="bars-scroll">
          <div class="bars-inner">
            <!-- Horizontal gridlines -->
            <div
              v-for="tick in yAxis.ticks"
              :key="'g' + tick.value"
              class="gridline"
              :style="{ bottom: tick.pct + '%' }"
            />

            <!-- One column per obsession month -->
            <div v-for="d in props.data" :key="d.period + d.trackName" class="bar-col">
              <div class="bar-wrap" :style="{ height: barHeightPx(d) + 'px' }">
                <div class="bar-outer">
                  <!-- Grey top = remaining listening time -->
                  <div class="bar-rest" :style="{ flex: restFlex(d) }" />
                  <!-- Colorful bottom = track time -->
                  <div
                    class="bar-track"
                    :style="{ flex: d.percentage, background: colorFor(d) }"
                  >
                    <span v-if="trackPx(d) >= 24" class="bar-pct">{{ d.percentage }}%</span>
                  </div>
                </div>
                <!-- Tooltip -->
                <div class="bar-tooltip">
                  <div class="tt-track">{{ d.trackName }}</div>
                  <div class="tt-artist">{{ d.artistName }}</div>
                  <div class="tt-val">{{ d.trackHours }}h <span class="tt-dim">/ {{ d.totalHours }}h total</span></div>
                  <div class="tt-period">{{ formatPeriod(d.period) }}</div>
                </div>
              </div>
              <div class="bar-month">{{ formatPeriod(d.period) }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="phase-legend">
        <span class="legend-item">
          <span class="legend-dot legend-dot--rest" />
          Other listening
        </span>
        <span v-for="(track, i) in uniqueTracks" :key="track" class="legend-item">
          <span class="legend-dot" :style="{ background: trackColor(i) }" />
          {{ track }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TrackObsessionPoint } from '@music-livereview/shared';

const props = defineProps<{ data: TrackObsessionPoint[] }>();

const PALETTE = [
  '#1db954',
  '#e67e22',
  '#3498db',
  '#9b59b6',
  '#e74c3c',
  '#1abc9c',
  '#f39c12',
  '#2ecc71',
  '#e91e63',
  '#00bcd4',
];

const CHART_HEIGHT = 340;

const hasData = computed(() => props.data.length > 0);
const phaseCount = computed(() => props.data.length);

const uniqueTracks = computed(() => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const d of props.data) {
    if (!seen.has(d.trackName)) {
      seen.add(d.trackName);
      result.push(d.trackName);
    }
  }
  return result;
});

const trackIndexMap = computed(() => {
  const map = new Map<string, number>();
  uniqueTracks.value.forEach((name, i) => map.set(name, i));
  return map;
});

function trackColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

function colorFor(d: TrackObsessionPoint): string {
  return trackColor(trackIndexMap.value.get(d.trackName) ?? 0);
}

const yAxis = computed(() => {
  const max = Math.max(...props.data.map(d => d.totalHours));
  const raw = max * 1.15;
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
  const step = candidates.find(s => raw / s <= 5 && raw / s >= 2) ?? Math.ceil(raw / 5);
  const niceMax = Math.ceil(raw / step) * step;
  const ticks: { value: number; pct: number }[] = [];
  for (let v = 0; v <= niceMax; v += step) {
    ticks.push({ value: v, pct: (v / niceMax) * 100 });
  }
  return { ticks, niceMax };
});

function barHeightPx(d: TrackObsessionPoint): number {
  return Math.round((d.totalHours / yAxis.value.niceMax) * CHART_HEIGHT);
}

function restFlex(d: TrackObsessionPoint): number {
  return Math.max(0, 100 - d.percentage);
}

function trackPx(d: TrackObsessionPoint): number {
  return (d.totalHours / yAxis.value.niceMax) * CHART_HEIGHT * (d.percentage / 100);
}

function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[parseInt(month) - 1]} '${year.slice(2)}`;
}
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

/* ── Chart layout ── */

.chart-area {
  display: flex;
  align-items: flex-end;
  gap: 0;
}

.y-axis {
  width: 38px;
  height: v-bind('CHART_HEIGHT + "px"');
  position: relative;
  flex-shrink: 0;
}

.y-label {
  position: absolute;
  right: 6px;
  font-size: 0.68rem;
  color: #666;
  transform: translateY(50%);
  white-space: nowrap;
  line-height: 1;
}

.bars-scroll {
  flex: 1;
  overflow-x: auto;
}

.bars-inner {
  display: flex;
  align-items: flex-end;
  height: v-bind('CHART_HEIGHT + "px"');
  gap: 10px;
  padding: 0 4px;
  position: relative;
  width: 100%;
}

.gridline {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: #2a2a2a;
  pointer-events: none;
}

/* ── Individual bar ── */

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.bar-wrap {
  position: relative;
  width: 100%;
}

.bar-outer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 4px 4px 0 0;
  overflow: hidden;
}

.bar-rest {
  background: #3a3a3a;
  min-height: 0;
}

.bar-track {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.bar-pct {
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

/* Tooltip overlays the top of the bar on hover */
.bar-tooltip {
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(8, 8, 8, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 6px 10px;
  white-space: nowrap;
  font-size: 0.72rem;
  color: #ddd;
  line-height: 1.5;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s;
  z-index: 20;
}

.bar-wrap:hover .bar-tooltip {
  opacity: 1;
}

.tt-track {
  font-weight: 600;
  color: #fff;
  font-size: 0.73rem;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tt-artist {
  color: #aaa;
  font-size: 0.68rem;
  margin-bottom: 2px;
}

.tt-period {
  color: #666;
  font-size: 0.68rem;
  margin-top: 2px;
}

.tt-dim {
  color: #888;
}

.bar-month {
  font-size: 0.65rem;
  color: #777;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  white-space: nowrap;
}

/* ── Legend ── */

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

.legend-dot--rest {
  background: #3a3a3a;
  border: 1px solid #555;
}
</style>
