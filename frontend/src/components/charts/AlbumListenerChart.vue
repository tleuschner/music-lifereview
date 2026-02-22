<template>
  <div class="chart-container card">
    <div class="chart-header">
      <h3 class="section-title">Album vs. Track Listener</h3>
      <p class="chart-subtitle">
        For each artist: are you a deep-dive fan who explores full albums, or do you keep coming back to the same few songs?
      </p>
    </div>

    <div v-if="hasData" class="al-layout">
      <!-- Full Album Artists -->
      <div class="al-col">
        <div class="al-col-header album">Full Album Artists</div>
        <p class="al-col-hint">You explore their discography broadly — many tracks, spread across albums.</p>
        <div v-if="albumFans.length" class="al-rows">
          <div v-for="entry in albumFans" :key="entry.name" class="al-row">
            <div class="al-info">
              <span class="al-name">{{ entry.name }}</span>
              <span class="al-detail">{{ entry.uniqueTracks }} tracks · {{ entry.albumCount }} album{{ entry.albumCount !== 1 ? 's' : '' }}</span>
            </div>
            <div class="al-bar-wrap">
              <div class="al-bar-track">
                <div
                  class="al-bar album"
                  :style="{ width: barWidth(entry.avgTracksPerAlbum, maxAvgTracks) }"
                />
              </div>
              <span class="al-val album">{{ entry.avgTracksPerAlbum }} tracks/album</span>
            </div>
          </div>
        </div>
        <p v-else class="al-empty">No deep-dive artists found yet (need ≥ 3 tracks/album avg, ≥ 2 albums).</p>
      </div>

      <!-- Just the Hits -->
      <div class="al-col">
        <div class="al-col-header cherry">Just the Hits Artists</div>
        <p class="al-col-hint">You keep replaying the same track or two — one song dominates your listens.</p>
        <div v-if="hitPickers.length" class="al-rows">
          <div v-for="entry in hitPickers" :key="entry.name" class="al-row">
            <div class="al-info">
              <span class="al-name">{{ entry.name }}</span>
              <span class="al-detail al-track-name">"{{ entry.topTrackName }}"</span>
            </div>
            <div class="al-bar-wrap">
              <div class="al-bar-track">
                <div
                  class="al-bar cherry"
                  :style="{ width: `${entry.topTrackPct}%` }"
                />
              </div>
              <span class="al-val cherry">{{ entry.topTrackPct }}% of plays</span>
            </div>
          </div>
        </div>
        <p v-else class="al-empty">No single-track-dominated artists found (need ≥ 50% concentration).</p>
      </div>
    </div>

    <p v-else class="empty-state">Not enough data yet — needs artists with at least 15 plays.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AlbumListenerEntry } from '@music-livereview/shared';

const props = defineProps<{ data: AlbumListenerEntry[] }>();

const hasData = computed(() => props.data.length > 0);

// Full album fans: no single track dominates, broad spread across albums
const albumFans = computed(() =>
  props.data
    .filter(e => e.topTrackPct <= 30 && e.avgTracksPerAlbum >= 3 && e.albumCount >= 2)
    .sort((a, b) => b.avgTracksPerAlbum - a.avgTracksPerAlbum)
    .slice(0, 10),
);

// Just the hits: one track accounts for most plays of this artist
const hitPickers = computed(() =>
  props.data
    .filter(e => e.topTrackPct >= 50 && e.totalPlays >= 20)
    .sort((a, b) => b.topTrackPct - a.topTrackPct)
    .slice(0, 10),
);

const maxAvgTracks = computed(() =>
  Math.max(...albumFans.value.map(e => e.avgTracksPerAlbum), 1),
);

function barWidth(value: number, max: number): string {
  return `${Math.round((value / max) * 100)}%`;
}
</script>

<style scoped>
.al-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

@media (max-width: 700px) {
  .al-layout { grid-template-columns: 1fr; }
}

.al-col-header {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.25rem;
}

.al-col-header.album  { color: #1db954; }
.al-col-header.cherry { color: #e67e22; }

.al-col-hint {
  font-size: 0.78rem;
  color: #666;
  margin: 0 0 1rem;
  line-height: 1.4;
}

.al-rows {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.al-row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.al-info {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.al-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 12rem;
}

.al-detail {
  font-size: 0.72rem;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 14rem;
}

.al-track-name {
  color: #aaa;
  font-style: italic;
}

.al-bar-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.al-bar-track {
  flex: 1;
  height: 8px;
  background: #2a2a2a;
  border-radius: 4px;
  overflow: hidden;
}

.al-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.al-bar.album  { background: #1db954; }
.al-bar.cherry { background: #e67e22; }

.al-val {
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.al-val.album  { color: #1db954; }
.al-val.cherry { color: #e67e22; }

.al-empty {
  font-size: 0.82rem;
  color: #555;
  font-style: italic;
}

.empty-state {
  color: #666;
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem 0;
}
</style>
