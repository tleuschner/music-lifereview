<template>
  <div class="chart-container card">
    <h3 class="section-title">Artist Loyalty</h3>
    <p class="section-subtitle">Based on how often you skip — only artists with 100+ plays qualify.</p>

    <div v-if="hasEnoughData" class="loyalty-grid">
      <div class="loyalty-section">
        <h4 class="loyalty-label loyal">Ride-or-Die Artists</h4>
        <p class="loyalty-desc">% of plays you listened all the way through</p>
        <div class="chart-wrapper">
          <Bar :data="loyalChartData" :options="loyalOptions" />
        </div>
      </div>

      <div class="loyalty-section">
        <h4 class="loyalty-label skipper">Artists You Always Skip</h4>
        <p class="loyalty-desc">High skip rate despite regular plays</p>
        <div class="chart-wrapper">
          <Bar :data="skipChartData" :options="skipOptions" />
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>Not enough skip data yet.</p>
      <p class="empty-hint">This chart appears once at least 3 artists have 100+ plays with skip tracking enabled. Older Spotify exports may not include skip data.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type ChartOptions,
  type ChartData,
} from 'chart.js';
import type { ArtistSkipRateEntry } from '@music-livereview/shared';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const props = defineProps<{ data: ArtistSkipRateEntry[] }>();

const hasEnoughData = computed(() => props.data.length >= 3);

// Bottom half = most skipped (last 8, sorted high→low for display)
const loyalArtists = computed(() => props.data.slice(0, 8));
const skipArtists = computed(() => props.data.slice(-8).reverse());

function makeLoyalChartData(artists: ArtistSkipRateEntry[]): ChartData<'bar'> {
  return {
    labels: artists.map(a => a.name),
    datasets: [{
      data: artists.map(a => Math.round((100 - a.skipRate) * 10) / 10),
      backgroundColor: '#1db954',
      borderRadius: 4,
      barThickness: 18,
    }],
  };
}

function makeSkipChartData(artists: ArtistSkipRateEntry[]): ChartData<'bar'> {
  return {
    labels: artists.map(a => a.name),
    datasets: [{
      data: artists.map(a => a.skipRate),
      backgroundColor: '#e67e22',
      borderRadius: 4,
      barThickness: 18,
    }],
  };
}

const loyalChartData = computed(() => makeLoyalChartData(loyalArtists.value));
const skipChartData = computed(() => makeSkipChartData(skipArtists.value));

function makeLoyalOptions(artists: ArtistSkipRateEntry[]): ChartOptions<'bar'> {
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label(ctx) {
            const entry = artists[ctx.dataIndex];
            return ` ${entry.skipRate}% skip rate — listened through ${(100 - entry.skipRate).toFixed(1)}% of the time (${entry.totalPlays.toLocaleString()} plays)`;
          },
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        ticks: { color: '#888', callback: (v) => `${v}%` },
        grid: { color: '#2a2a2a' },
      },
      y: {
        ticks: { color: '#e0e0e0', font: { size: 12 } },
        grid: { display: false },
      },
    },
  };
}

function makeSkipOptions(artists: ArtistSkipRateEntry[]): ChartOptions<'bar'> {
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label(ctx) {
            const entry = artists[ctx.dataIndex];
            return ` ${entry.skipRate}% skip rate (${entry.totalPlays.toLocaleString()} plays)`;
          },
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        ticks: { color: '#888', callback: (v) => `${v}%` },
        grid: { color: '#2a2a2a' },
      },
      y: {
        ticks: { color: '#e0e0e0', font: { size: 12 } },
        grid: { display: false },
      },
    },
  };
}

const loyalOptions = computed(() => makeLoyalOptions(loyalArtists.value));
const skipOptions = computed(() => makeSkipOptions(skipArtists.value));
</script>

<style scoped>
.section-subtitle {
  color: #888;
  font-size: 0.85rem;
  margin-top: -0.5rem;
  margin-bottom: 1.25rem;
}

.loyalty-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

@media (max-width: 768px) {
  .loyalty-grid {
    grid-template-columns: 1fr;
  }
}

.loyalty-label {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.2rem;
}

.loyalty-label.loyal {
  color: #1db954;
}

.loyalty-label.skipper {
  color: #e67e22;
}

.loyalty-desc {
  color: #888;
  font-size: 0.78rem;
  margin: 0 0 0.75rem;
}

.chart-wrapper {
  height: 220px;
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
</style>
