<template>
  <div class="chart-container card">
    <div class="chart-header">
      <h3 class="section-title">Seasonal Loyalty</h3>
      <p class="chart-subtitle">
        Artists you reliably return to in a specific season — but barely listen to the rest of the year.
      </p>
    </div>

    <div v-if="hasData">
      <!-- Season filter tabs -->
      <div class="season-tabs">
        <button
          v-for="s in availableSeasons"
          :key="s"
          class="season-tab"
          :class="[s.toLowerCase(), { active: activeSeason === s }]"
          @click="activeSeason = s"
        >
          {{ seasonEmoji(s) }} {{ s }}
        </button>
      </div>

      <!-- Artist rows for the selected season -->
      <div class="sl-list">
        <div
          v-for="(artist, i) in filteredArtists"
          :key="artist.name"
          class="sl-row"
        >
          <span class="sl-rank">{{ i + 1 }}</span>
          <div class="sl-info">
            <span class="sl-name">{{ artist.name }}</span>
            <span class="sl-meta">{{ artist.activeYears }} season{{ artist.activeYears > 1 ? 's' : '' }}</span>
          </div>
          <div class="sl-bar-wrap">
            <div
              class="sl-bar"
              :class="artist.season.toLowerCase()"
              :style="{ width: barWidth(artist.peakPct) }"
            />
          </div>
          <span class="sl-pct">{{ artist.peakPct }}%</span>
          <span class="sl-plays">{{ artist.peakPlays.toLocaleString() }} plays</span>
        </div>
      </div>

      <p v-if="filteredArtists.length === 0" class="empty-state">
        No strong {{ activeSeason.toLowerCase() }} artists found.
      </p>
    </div>

    <p v-else class="empty-state">
      Not enough multi-year data to detect seasonal listening patterns.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SeasonalArtistEntry } from '@music-livereview/shared';

const props = defineProps<{ data: SeasonalArtistEntry[] }>();

const hasData = computed(() => props.data.length > 0);

const availableSeasons = computed(() => {
  const order: SeasonalArtistEntry['season'][] = ['Winter', 'Spring', 'Summer', 'Fall'];
  const inData = new Set(props.data.map(a => a.season));
  return order.filter(s => inData.has(s));
});

const activeSeason = ref<SeasonalArtistEntry['season']>('Winter');

// When data loads, default to whichever season has the most artists
const defaultSeason = computed<SeasonalArtistEntry['season']>(() => {
  const counts = new Map<string, number>();
  for (const a of props.data) counts.set(a.season, (counts.get(a.season) ?? 0) + 1);
  let best = 'Winter';
  let bestCount = 0;
  for (const [s, c] of counts) {
    if (c > bestCount) { bestCount = c; best = s; }
  }
  return best as SeasonalArtistEntry['season'];
});

// Sync active tab when data arrives
import { watch } from 'vue';
watch(
  () => props.data,
  (val) => {
    if (val.length > 0) activeSeason.value = defaultSeason.value;
  },
  { immediate: true },
);

const filteredArtists = computed(() =>
  props.data.filter(a => a.season === activeSeason.value),
);

function barWidth(pct: number): string {
  return `${Math.min(pct, 100)}%`;
}

function seasonEmoji(s: string): string {
  return { Winter: '❄️', Spring: '🌸', Summer: '☀️', Fall: '🍂' }[s] ?? '';
}
</script>

<style scoped>
.season-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.2rem;
  flex-wrap: wrap;
}

.season-tab {
  padding: 0.3rem 0.85rem;
  border-radius: 20px;
  border: 1px solid #333;
  background: #1a1a1a;
  color: #888;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.season-tab:hover { border-color: #555; color: #ccc; }

.season-tab.active.winter  { background: #1a3a5c; border-color: #4a9eda; color: #7dc4f0; }
.season-tab.active.spring  { background: #1a3a1a; border-color: #4caf50; color: #81c784; }
.season-tab.active.summer  { background: #3a2a00; border-color: #e67e22; color: #f0a855; }
.season-tab.active.fall    { background: #3a1a00; border-color: #c0392b; color: #e07060; }

.sl-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.sl-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.sl-rank {
  color: #555;
  font-size: 0.78rem;
  width: 1.2rem;
  flex-shrink: 0;
  text-align: right;
}

.sl-info {
  display: flex;
  flex-direction: column;
  width: 10rem;
  flex-shrink: 0;
}

.sl-name {
  font-size: 0.88rem;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sl-meta {
  font-size: 0.7rem;
  color: #666;
}

.sl-bar-wrap {
  flex: 1;
  height: 8px;
  background: #2a2a2a;
  border-radius: 4px;
  overflow: hidden;
}

.sl-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.sl-bar.winter { background: #4a9eda; }
.sl-bar.spring { background: #4caf50; }
.sl-bar.summer { background: #e67e22; }
.sl-bar.fall   { background: #c0392b; }

.sl-pct {
  font-size: 0.8rem;
  color: #ccc;
  width: 3.2rem;
  flex-shrink: 0;
  text-align: right;
}

.sl-plays {
  font-size: 0.75rem;
  color: #666;
  width: 6rem;
  flex-shrink: 0;
  text-align: right;
}

.empty-state {
  color: #666;
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem 0;
}
</style>
