<template>
  <div v-if="stats" class="global-averages">
    <h3 class="section-title">Community Overview</h3>
    <div class="grid grid-4">
      <StatCard label="Total Uploads" :value="stats.totalUploads" />
      <StatCard label="Avg. Listening Hours" :value="Math.round(stats.avgTotalHours).toLocaleString()" subtitle="per user" />
      <StatCard label="Median Hours" :value="Math.round(stats.medianTotalHours).toLocaleString()" subtitle="per user" />
      <StatCard label="Avg. Unique Artists" :value="Math.round(stats.avgUniqueArtists).toLocaleString()" subtitle="per user" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GlobalStatsResponse } from '@music-livereview/shared';
import StatCard from '../shared/StatCard.vue';

defineProps<{ stats: GlobalStatsResponse | null }>();
</script>
