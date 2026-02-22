<template>
  <div class="dashboard">
    <LoadingSpinner v-if="loading && !overview" message="Loading your stats..." />

    <template v-if="overview">
      <!-- Overview Stats -->
      <div class="grid grid-4">
        <StatCard label="Total Listening" :value="`${overview.totalHours.toLocaleString()}h`" :subtitle="`${overview.totalDays} days`" />
        <StatCard label="Total Plays" :value="overview.totalPlays.toLocaleString()" />
        <StatCard label="Unique Artists" :value="overview.uniqueArtists.toLocaleString()" />
        <StatCard label="Unique Tracks" :value="overview.uniqueTracks.toLocaleString()" />
      </div>

      <!-- Share Link -->
      <ShareLinkCard :url="shareUrl" />

      <!-- Filters -->
      <FilterBar
        :date-from="dateFrom"
        :date-to="dateTo"
        :sort-by="sortBy"
        :has-active-filters="hasActiveFilters"
        @update:date-from="dateFrom = $event"
        @update:date-to="dateTo = $event"
        @update:sort-by="sortBy = $event as 'hours' | 'count'"
        @reset="resetFilters"
      />

      <!-- Charts -->
      <ListeningTimelineChart :data="timeline" />

      <div class="grid grid-2">
        <TopArtistsChart :data="topArtists" :sort-by="sortBy" />
        <TopTracksChart :data="topTracks" :sort-by="sortBy" />
      </div>

      <HeatmapChart :data="heatmap" />

      <StackedArtistAreaChart :data="artistTimeline" />

      <DiscoveryVsRepetitionChart :data="discoveryRate" />

      <ArtistRaceChart :data="artistCumulative" />

      <ArtistLoyaltyChart :data="artistLoyalty" />

      <ReplayLeaderboard :data="backButtonTracks" />

      <SkippedTracksLeaderboard :data="skippedTracks" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useStreamingData } from '../composables/useStreamingData';
import { useFilters } from '../composables/useFilters';
import LoadingSpinner from '../components/shared/LoadingSpinner.vue';
import StatCard from '../components/shared/StatCard.vue';
import ShareLinkCard from '../components/shared/ShareLinkCard.vue';
import FilterBar from '../components/filters/FilterBar.vue';
import TopArtistsChart from '../components/charts/TopArtistsChart.vue';
import TopTracksChart from '../components/charts/TopTracksChart.vue';
import ListeningTimelineChart from '../components/charts/ListeningTimelineChart.vue';
import HeatmapChart from '../components/charts/HeatmapChart.vue';
import StackedArtistAreaChart from '../components/charts/StackedArtistAreaChart.vue';
import DiscoveryVsRepetitionChart from '../components/charts/DiscoveryVsRepetitionChart.vue';
import ArtistLoyaltyChart from '../components/charts/ArtistLoyaltyChart.vue';
import ArtistRaceChart from '../components/charts/ArtistRaceChart.vue';
import ReplayLeaderboard from '../components/charts/ReplayLeaderboard.vue';
import SkippedTracksLeaderboard from '../components/charts/SkippedTracksLeaderboard.vue';

const route = useRoute();
const token = computed(() => route.params.token as string);
const shareUrl = computed(() => `${window.location.origin}/results/${token.value}`);

const { dateFrom, dateTo, sortBy, activeFilters, hasActiveFilters, resetFilters } = useFilters();

const {
  loading,
  overview,
  topArtists,
  topTracks,
  timeline,
  heatmap,
  artistTimeline,
  discoveryRate,
  skippedTracks,
  artistLoyalty,
  backButtonTracks,
  artistCumulative,
  fetchAll,
} = useStreamingData(token, activeFilters);

onMounted(() => fetchAll());
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
