<template>
  <div class="chart-container card">
    <div class="chart-header">
      <h3 class="section-title">Weekday vs. Weekend</h3>
      <p class="chart-subtitle" v-if="data">
        Intentionality score on weekdays: <strong>{{ weekdayScore }}</strong> &nbsp;|&nbsp;
        weekends: <strong>{{ weekendScore }}</strong>.
        {{ intentionalityNote }}
      </p>
    </div>

    <div v-if="hasData" class="ww-layout">
      <!-- Metric comparison bars -->
      <div class="ww-metrics">
        <div class="ww-metric" v-for="metric in metrics" :key="metric.label">
          <div class="ww-metric-label">{{ metric.label }}</div>
          <div class="ww-bars">
            <div class="ww-bar-row">
              <span class="ww-day-tag weekday">Weekday</span>
              <div class="ww-bar-track">
                <div
                  class="ww-bar weekday"
                  :style="{ width: barWidth(metric.weekday, metric.max) }"
                  :title="metric.weekdayLabel"
                />
              </div>
              <span class="ww-val">{{ metric.weekdayLabel }}</span>
            </div>
            <div class="ww-bar-row">
              <span class="ww-day-tag weekend">Weekend</span>
              <div class="ww-bar-track">
                <div
                  class="ww-bar weekend"
                  :style="{ width: barWidth(metric.weekend, metric.max) }"
                  :title="metric.weekendLabel"
                />
              </div>
              <span class="ww-val">{{ metric.weekendLabel }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top artists split -->
      <div class="ww-artists">
        <div class="ww-artist-col" v-for="col in artistCols" :key="col.title">
          <div class="ww-artist-title">{{ col.title }} Top Artists</div>
          <ol class="ww-artist-list">
            <li v-for="(a, i) in col.artists" :key="i">
              <span class="ww-artist-rank">{{ i + 1 }}</span>
              <span class="ww-artist-name">{{ a.name }}</span>
              <span class="ww-artist-plays">{{ a.playCount.toLocaleString() }}</span>
            </li>
          </ol>
        </div>
      </div>
    </div>

    <p v-else class="empty-state">Not enough data to compare weekday vs. weekend listening.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { WeekdayWeekendResponse } from '@music-livereview/shared';

const props = defineProps<{ data: WeekdayWeekendResponse | null }>();

const hasData = computed(() =>
  props.data != null && (props.data.weekday.totalHours > 0 || props.data.weekend.totalHours > 0),
);

const metrics = computed(() => {
  if (!props.data) return [];
  const d = props.data;
  return [
    {
      label: 'Listening Time',
      weekday: d.weekday.totalHours,
      weekend: d.weekend.totalHours,
      max: Math.max(d.weekday.totalHours, d.weekend.totalHours),
      weekdayLabel: `${d.weekday.totalHours.toLocaleString()}h`,
      weekendLabel: `${d.weekend.totalHours.toLocaleString()}h`,
    },
    {
      label: 'Avg Session Length',
      weekday: d.weekday.avgSessionLength,
      weekend: d.weekend.avgSessionLength,
      max: Math.max(d.weekday.avgSessionLength, d.weekend.avgSessionLength),
      weekdayLabel: `${d.weekday.avgSessionLength} tracks`,
      weekendLabel: `${d.weekend.avgSessionLength} tracks`,
    },
    {
      label: 'Skip Rate',
      weekday: d.weekday.skipRate,
      weekend: d.weekend.skipRate,
      max: Math.max(d.weekday.skipRate, d.weekend.skipRate),
      weekdayLabel: `${d.weekday.skipRate}%`,
      weekendLabel: `${d.weekend.skipRate}%`,
    },
  ];
});

const artistCols = computed(() => {
  if (!props.data) return [];
  return [
    { title: 'Weekday', artists: props.data.weekday.topArtists },
    { title: 'Weekend', artists: props.data.weekend.topArtists },
  ];
});

// Intentionality score: longer sessions + lower skip rate = more intentional
const weekdayScore = computed(() => {
  if (!props.data) return '–';
  const d = props.data.weekday;
  return score(d.avgSessionLength, d.skipRate);
});

const weekendScore = computed(() => {
  if (!props.data) return '–';
  const d = props.data.weekend;
  return score(d.avgSessionLength, d.skipRate);
});

function score(avgSession: number, skipRate: number): string {
  // Normalise: session 1–20 tracks → 0–100, skip rate 0–60% → 0–100 (inverted)
  const sessionScore = Math.min(avgSession / 20, 1) * 100;
  const skipScore = Math.max(0, 1 - skipRate / 60) * 100;
  const raw = Math.round((sessionScore + skipScore) / 2);
  if (raw >= 70) return `${raw} 🎯`;
  if (raw >= 40) return `${raw} 🎶`;
  return `${raw} 🎲`;
}

const intentionalityNote = computed(() => {
  if (!props.data) return '';
  const wd = props.data.weekday;
  const we = props.data.weekend;
  const wdInt = wd.avgSessionLength - wd.skipRate / 10;
  const weInt = we.avgSessionLength - we.skipRate / 10;
  if (wdInt > weInt + 0.5) return 'You listen more intentionally on weekdays.';
  if (weInt > wdInt + 0.5) return 'You listen more intentionally on weekends.';
  return 'Your listening habits are similar both days.';
});

function barWidth(value: number, max: number): string {
  if (max === 0) return '0%';
  return `${Math.round((value / max) * 100)}%`;
}
</script>

<style scoped>
.ww-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.ww-metrics {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.ww-metric-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #888;
  margin-bottom: 0.4rem;
}

.ww-bars {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.ww-bar-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.ww-day-tag {
  font-size: 0.72rem;
  font-weight: 600;
  width: 5rem;
  flex-shrink: 0;
  text-align: right;
}

.ww-day-tag.weekday { color: #1db954; }
.ww-day-tag.weekend { color: #e67e22; }

.ww-bar-track {
  flex: 1;
  height: 10px;
  background: #2a2a2a;
  border-radius: 5px;
  overflow: hidden;
}

.ww-bar {
  height: 100%;
  border-radius: 5px;
  transition: width 0.4s ease;
}

.ww-bar.weekday { background: #1db954; }
.ww-bar.weekend { background: #e67e22; }

.ww-val {
  font-size: 0.8rem;
  color: #ccc;
  width: 6rem;
  flex-shrink: 0;
}

/* Top artists */
.ww-artists {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.ww-artist-title {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #888;
  margin-bottom: 0.5rem;
}

.ww-artist-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.ww-artist-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.ww-artist-rank {
  color: #555;
  width: 1rem;
  flex-shrink: 0;
  text-align: right;
}

.ww-artist-name {
  flex: 1;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ww-artist-plays {
  color: #888;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.empty-state {
  color: #666;
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem 0;
}
</style>
