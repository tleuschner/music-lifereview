<template>
  <div class="chart-container card">
    <div class="chart-header">
      <div>
        <h3 class="section-title">Skip Graveyard</h3>
        <p class="section-subtitle">Songs you kept adding — but almost never actually listened to.</p>
      </div>
    </div>

    <div v-if="hasData" class="leaderboard">
      <div class="lb-header">
        <span class="col-rank">#</span>
        <span class="col-track">Track</span>
        <span class="col-skips">Skips</span>
        <span class="col-rate">Skip rate</span>
        <span class="col-listen">Avg listen</span>
      </div>

      <div
        v-for="(track, i) in data"
        :key="`${track.name}-${track.artistName}`"
        class="lb-row"
        :class="{ 'lb-row--compulsive': isCompulsive(track) }"
      >
        <span class="col-rank rank-num">{{ i + 1 }}</span>
        <span class="col-track">
          <span class="track-name">{{ track.name }}</span>
          <span class="artist-name">{{ track.artistName }}</span>
          <span v-if="isCompulsive(track)" class="badge-compulsive">can't quit</span>
        </span>
        <span class="col-skips">{{ track.skipCount.toLocaleString() }}</span>
        <span class="col-rate">
          <span class="rate-pill" :style="{ backgroundColor: skipRateColor(track.skipRate) }">
            {{ track.skipRate }}%
          </span>
        </span>
        <span class="col-listen">{{ formatListenTime(track.avgListenSec) }}</span>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>Not enough skip data yet.</p>
      <p class="empty-hint">Appears once you have tracks with 3+ skips. Older Spotify exports may not include skip data.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SkippedTrackEntry } from '@music-livereview/shared';

const props = defineProps<{ data: SkippedTrackEntry[] }>();

const hasData = computed(() => props.data.length > 0);

// "Can't quit you": you keep playing it but skip it more than half the time
function isCompulsive(t: SkippedTrackEntry): boolean {
  return t.totalPlays >= 50 && t.skipRate >= 60;
}

// Interpolates green→yellow→red based on skip rate
function skipRateColor(rate: number): string {
  if (rate < 30)  return '#1db95433'; // green tint
  if (rate < 60)  return '#f1c40f33'; // yellow tint
  return '#e74c3c33';                  // red tint
}

function formatListenTime(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

import { computed } from 'vue';
</script>

<style scoped>
.chart-header {
  margin-bottom: 1rem;
}

.section-subtitle {
  color: #888;
  font-size: 0.85rem;
  margin-top: 2px;
  margin-bottom: 0;
}

.leaderboard {
  width: 100%;
  overflow-x: auto;
}

.lb-header,
.lb-row {
  display: grid;
  grid-template-columns: 2rem 1fr 4rem 6rem 5.5rem;
  gap: 0 1rem;
  align-items: center;
  padding: 0.4rem 0.5rem;
}

.lb-header {
  font-size: 0.72rem;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #222;
  padding-bottom: 0.5rem;
  margin-bottom: 0.2rem;
}

.lb-row {
  border-radius: 4px;
  transition: background 0.1s;
}

.lb-row:hover {
  background: #1a1a1a;
}

.lb-row--compulsive {
  background: rgba(231, 76, 60, 0.04);
}

.lb-row--compulsive:hover {
  background: rgba(231, 76, 60, 0.08);
}

.rank-num {
  color: #555;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.col-track {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.track-name {
  color: #e0e0e0;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-name {
  color: #666;
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge-compulsive {
  display: inline-block;
  margin-top: 2px;
  padding: 1px 5px;
  font-size: 0.65rem;
  border-radius: 3px;
  border: 1px solid rgba(231, 76, 60, 0.4);
  color: #e74c3c;
  letter-spacing: 0.03em;
  width: fit-content;
}

.col-skips {
  color: #aaa;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.col-rate {
  text-align: right;
}

.rate-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  color: #e0e0e0;
}

.col-listen {
  color: #888;
  font-size: 0.8rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
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

@media (max-width: 640px) {
  .lb-header,
  .lb-row {
    grid-template-columns: 1.5rem 1fr 3.5rem 5rem 4.5rem;
    gap: 0 0.5rem;
    font-size: 0.8rem;
  }
}
</style>
