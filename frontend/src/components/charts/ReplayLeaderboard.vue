<template>
  <div class="chart-container card">
    <div class="chart-header">
      <div>
        <h3 class="section-title">Songs You Always Come Back To</h3>
        <p class="section-subtitle">Tracks you replayed by pressing back — because once wasn't enough.</p>
      </div>
    </div>

    <div v-if="hasData" class="leaderboard">
      <div class="lb-header">
        <span class="col-rank">#</span>
        <span class="col-track">Track</span>
        <span class="col-replays">Replays</span>
        <span class="col-rate">Replay rate</span>
        <span class="col-plays">Total plays</span>
      </div>

      <div
        v-for="(track, i) in data"
        :key="`${track.name}-${track.artistName}`"
        class="lb-row"
        :class="{ 'lb-row--obsessed': isObsessed(track) }"
      >
        <span class="col-rank rank-num">{{ i + 1 }}</span>
        <span class="col-track">
          <span class="track-name">{{ track.name }}</span>
          <span class="artist-name">{{ track.artistName }}</span>
          <span v-if="isObsessed(track)" class="badge-obsessed">obsessed</span>
        </span>
        <span class="col-replays">{{ track.backCount.toLocaleString() }}</span>
        <span class="col-rate">
          <span class="rate-pill" :style="{ backgroundColor: replayRateColor(track.replayRate) }">
            {{ track.replayRate }}%
          </span>
        </span>
        <span class="col-plays">{{ track.totalPlays.toLocaleString() }}</span>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>No replay data yet.</p>
      <p class="empty-hint">This chart tracks songs you went back to by pressing the back button. It only appears for new uploads — older exports don't include this signal.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BackButtonTrackEntry } from '@music-livereview/shared';

const props = defineProps<{ data: BackButtonTrackEntry[] }>();

const hasData = computed(() => props.data.length > 0);

// "Obsessed": replayed 10+ times and replay rate above 20%
function isObsessed(t: BackButtonTrackEntry): boolean {
  return t.backCount >= 10 && t.replayRate >= 20;
}

// Green for low replay rate (occasional), scaling to bright green for high
function replayRateColor(rate: number): string {
  if (rate < 10) return '#1db95433';
  if (rate < 25) return '#1db95466';
  return '#1db954aa';
}
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
  grid-template-columns: 2rem 1fr 5rem 6rem 5.5rem;
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

.lb-row--obsessed {
  background: rgba(29, 185, 84, 0.04);
}

.lb-row--obsessed:hover {
  background: rgba(29, 185, 84, 0.08);
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

.badge-obsessed {
  display: inline-block;
  margin-top: 2px;
  padding: 1px 5px;
  font-size: 0.65rem;
  border-radius: 3px;
  border: 1px solid rgba(29, 185, 84, 0.4);
  color: #1db954;
  letter-spacing: 0.03em;
  width: fit-content;
}

.col-replays {
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

.col-plays {
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
    grid-template-columns: 1.5rem 1fr 4rem 5rem 4rem;
    gap: 0 0.5rem;
    font-size: 0.8rem;
  }
}
</style>
