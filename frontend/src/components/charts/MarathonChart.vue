<template>
  <div class="chart-container card">
    <div class="chart-header">
      <h3 class="section-title">Listening Marathons</h3>
      <p class="chart-subtitle">
        Your longest uninterrupted listening sessions — no gap longer than 30 minutes.
        Mood is based on skip rate. Top track is the most-replayed song in that session.
      </p>
    </div>

    <div v-if="hasData">
      <div class="mth-legend">
        <span class="mth-col-rank"></span>
        <span class="mth-col-date">Date</span>
        <span class="mth-col-duration">Duration</span>
        <span class="mth-col-tracks">Tracks</span>
        <span class="mth-col-mood">Mood</span>
        <span class="mth-col-artist">Top Artist</span>
        <span class="mth-col-track">Top Track</span>
      </div>

      <div class="mth-list">
        <div v-for="m in data" :key="m.rank" class="mth-row">
          <span class="mth-rank" :class="`mth-rank-${m.rank}`">#{{ m.rank }}</span>

          <div class="mth-date">
            <span class="mth-date-main">{{ formatDate(m.date) }}</span>
          </div>

          <div class="mth-duration">
            <span class="mth-duration-value">{{ formatDuration(m.durationMinutes) }}</span>
            <div class="mth-bar-track">
              <div
                class="mth-bar-fill"
                :style="{ width: barWidth(m.durationMinutes) + '%' }"
              />
            </div>
          </div>

          <span class="mth-tracks">{{ m.playCount }}</span>

          <span class="mth-mood" :class="moodClass(m.mood)">{{ m.mood }}</span>

          <div class="mth-artist" :title="m.topArtist ?? ''">
            <span v-if="m.topArtist">{{ m.topArtist }}</span>
            <span v-else class="mth-no-artist">—</span>
          </div>

          <div class="mth-track" :title="m.topTrack && m.topTrackArtist ? `${m.topTrack} — ${m.topTrackArtist}` : ''">
            <span v-if="m.topTrack" class="mth-track-name">{{ m.topTrack }}</span>
            <span v-if="m.topTrackArtist" class="mth-track-artist">{{ m.topTrackArtist }}</span>
            <span v-if="!m.topTrack" class="mth-no-artist">—</span>
          </div>
        </div>
      </div>

      <p class="mth-footer">
        Sessions require ≥ 3 tracks and ≥ 30 min of continuous listening. Duration is wall-clock time.
      </p>
    </div>

    <p v-else class="empty-state">
      No marathons found — upload more data or your sessions are usually short.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MarathonEntry } from '@music-livereview/shared';

const props = defineProps<{ data: MarathonEntry[] }>();

const hasData = computed(() => props.data.length > 0);

const maxDuration = computed(() =>
  props.data.reduce((max, m) => Math.max(max, m.durationMinutes), 1),
);

function barWidth(minutes: number): number {
  return Math.round((minutes / maxDuration.value) * 100);
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function moodClass(mood: string): string {
  if (mood === 'In the Zone') return 'mood-zone';
  if (mood === 'Exploratory') return 'mood-explore';
  return 'mood-restless';
}
</script>

<style scoped>
/* Legend */
.mth-legend {
  display: grid;
  grid-template-columns: 2.2rem 6rem 10rem 3.5rem 7rem 1fr 1fr;
  gap: 0.5rem;
  padding-bottom: 0.4rem;
  margin-bottom: 0.4rem;
  border-bottom: 1px solid #2a2a2a;
  font-size: 0.68rem;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Rows */
.mth-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mth-row {
  display: grid;
  grid-template-columns: 2.2rem 6rem 10rem 3.5rem 7rem 1fr 1fr;
  align-items: center;
  gap: 0.5rem;
}

/* Rank */
.mth-rank {
  font-size: 0.75rem;
  font-weight: 700;
  color: #555;
  text-align: right;
}
.mth-rank-1 { color: #f5c518; }
.mth-rank-2 { color: #aaa; }
.mth-rank-3 { color: #cd7f32; }

/* Date */
.mth-date-main {
  font-size: 0.82rem;
  color: #ccc;
  white-space: nowrap;
}

/* Duration bar */
.mth-duration {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.mth-duration-value {
  font-size: 0.82rem;
  font-weight: 600;
  color: #1db954;
}

.mth-bar-track {
  height: 4px;
  border-radius: 2px;
  background: #1e1e1e;
  overflow: hidden;
}

.mth-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #1db954, #17a349);
  transition: width 0.3s ease;
}

/* Tracks count */
.mth-tracks {
  font-size: 0.82rem;
  color: #999;
  text-align: center;
}

/* Mood chip */
.mth-mood {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  white-space: nowrap;
}

.mood-zone {
  background: rgba(29, 185, 84, 0.15);
  color: #1db954;
  border: 1px solid rgba(29, 185, 84, 0.3);
}

.mood-explore {
  background: rgba(125, 196, 240, 0.12);
  color: #7dc4f0;
  border: 1px solid rgba(125, 196, 240, 0.25);
}

.mood-restless {
  background: rgba(230, 126, 34, 0.12);
  color: #e67e22;
  border: 1px solid rgba(230, 126, 34, 0.25);
}

/* Top artist */
.mth-artist {
  font-size: 0.82rem;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Top track */
.mth-track {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.mth-track-name {
  font-size: 0.82rem;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mth-track-artist {
  font-size: 0.72rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mth-no-artist {
  color: #444;
}

/* Footer */
.mth-footer {
  margin-top: 1rem;
  font-size: 0.72rem;
  color: #444;
  text-align: center;
}

.empty-state {
  color: #666;
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem 0;
}

/* Responsive: stack on narrow screens */
@media (max-width: 800px) {
  .mth-legend,
  .mth-row {
    grid-template-columns: 2rem 5rem 8rem 3rem 6rem 1fr;
    font-size: 0.75rem;
  }
  .mth-track { display: none; }
  .mth-legend .mth-col-track { display: none; }
}
</style>
