<template>
  <div class="chart-container card">
    <div class="chart-header">
      <h3 class="section-title">The Rebound</h3>
      <p class="chart-subtitle">
        Artists you suddenly stopped listening to after a heavy phase, then came back to later.
        Ranked by drama — high plays before + long silence + strong comeback = top score.
      </p>
    </div>

    <div v-if="hasData">
      <!-- Column legend -->
      <div class="rb-legend">
        <span class="rb-legend-rank"></span>
        <span class="rb-legend-artist"></span>
        <span class="rb-legend-peak">Peak</span>
        <span class="rb-legend-bar">← time away →</span>
        <span class="rb-legend-revival">Came back</span>
      </div>

      <div class="rb-list">
        <div v-for="(artist, i) in data" :key="artist.artistName" class="rb-row">
          <span class="rb-rank">{{ i + 1 }}</span>

          <div class="rb-artist" :title="artist.artistName">{{ artist.artistName }}</div>

          <!-- Peak info -->
          <div class="rb-phase rb-peak-phase">
            <span class="rb-month">{{ artist.peakMonth }}</span>
            <span class="rb-plays rb-peak-plays">{{ artist.peakPlays }} plays</span>
          </div>

          <!-- Gap bar: always fills full width; label shows actual months -->
          <div class="rb-gap">
            <div class="rb-gap-track">
              <div class="rb-gap-fill" />
            </div>
            <span class="rb-gap-label">{{ artist.cooldownMonths }} months silent</span>
          </div>

          <!-- Revival info -->
          <div class="rb-phase rb-revival-phase">
            <span class="rb-month">{{ artist.revivalMonth }}</span>
            <span class="rb-plays rb-revival-plays">{{ artist.revivalPlays }} plays</span>
          </div>
        </div>
      </div>

      <p class="rb-footer">
        Only artists with ≥ 5 plays before the gap, ≥ 3 months of silence, and a genuine comeback are shown.
      </p>
    </div>

    <p v-else class="empty-state">
      No rebounds detected — you either never left or never came back.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ReboundArtistEntry } from '@music-livereview/shared';

const props = defineProps<{ data: ReboundArtistEntry[] }>();

const hasData = computed(() => props.data.length > 0);
</script>

<style scoped>
/* Legend row */
.rb-legend {
  display: grid;
  grid-template-columns: 1.6rem 8.5rem 5.5rem 1fr 5.5rem;
  gap: 0.5rem;
  padding-bottom: 0.4rem;
  margin-bottom: 0.4rem;
  border-bottom: 1px solid #2a2a2a;
}

.rb-legend-rank,
.rb-legend-artist {
  /* spacers */
}

.rb-legend-peak,
.rb-legend-revival {
  font-size: 0.68rem;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-align: center;
}

.rb-legend-bar {
  font-size: 0.68rem;
  color: #444;
  text-align: center;
  letter-spacing: 0.04em;
}

/* Data rows */
.rb-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.rb-row {
  display: grid;
  grid-template-columns: 1.6rem 8.5rem 5.5rem 1fr 5.5rem;
  align-items: center;
  gap: 0.5rem;
}

.rb-rank {
  color: #555;
  font-size: 0.75rem;
  text-align: right;
}

.rb-artist {
  font-size: 0.88rem;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Phase blocks (peak / revival) */
.rb-phase {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}

.rb-month {
  font-size: 0.72rem;
  color: #999;
  letter-spacing: 0.02em;
}

.rb-plays {
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}

.rb-peak-plays   { color: #7dc4f0; }
.rb-revival-plays { color: #81c784; }

/* Gap bar — always full width */
.rb-gap {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.rb-gap-track {
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(
    90deg,
    #3a6a8a 0%,
    #2a2a2a 30%,
    #1e1e1e 50%,
    #2a2a2a 70%,
    #3a6a4a 100%
  );
  border: 1px solid #333;
  position: relative;
  overflow: hidden;
}

/* Dashed overlay to reinforce "silence" feeling */
.rb-gap-fill {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent 0px,
    transparent 6px,
    rgba(255,255,255,0.04) 6px,
    rgba(255,255,255,0.04) 8px
  );
}

.rb-gap-label {
  font-size: 0.66rem;
  color: #555;
  text-align: center;
  white-space: nowrap;
}

/* Footer note */
.rb-footer {
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
</style>
