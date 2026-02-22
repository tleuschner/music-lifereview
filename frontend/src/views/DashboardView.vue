<template>
  <div class="dashboard">
    <LoadingSpinner v-if="loadingStates.overview && !overview" message="Loading your stats..." />

    <template v-if="overview">
      <!-- Overview Stats -->
      <div class="grid grid-4">
        <StatCard label="Total Listening" :value="`${overview.totalHours.toLocaleString()}h`" :subtitle="`${overview.totalDays} days`" />
        <StatCard label="Total Plays" :value="overview.totalPlays.toLocaleString()" />
        <StatCard label="Unique Artists" :value="overview.uniqueArtists.toLocaleString()" />
        <StatCard label="Unique Tracks" :value="overview.uniqueTracks.toLocaleString()" />
      </div>

      <!-- Personality Card -->
      <div v-if="loadingStates.personalityInputs" class="chart-container card"><LoadingSpinner /></div>
      <PersonalityCard v-else :data="personalityInputs" :token="token" />

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
      <div v-if="loadingStates.timeline" class="chart-container card"><LoadingSpinner /></div>
      <ListeningTimelineChart v-else :data="timeline" />

      <div class="grid grid-2">
        <div v-if="loadingStates.topArtists" class="chart-container card"><LoadingSpinner /></div>
        <TopArtistsChart v-else :data="topArtists" :sort-by="sortBy" />

        <div v-if="loadingStates.topTracks" class="chart-container card"><LoadingSpinner /></div>
        <TopTracksChart v-else :data="topTracks" :sort-by="sortBy" />
      </div>

      <div v-if="loadingStates.heatmap" class="chart-container card"><LoadingSpinner /></div>
      <HeatmapChart v-else :data="heatmap" />

      <div v-if="loadingStates.sessionStamina" class="chart-container card"><LoadingSpinner /></div>
      <SessionStaminaChart v-else :data="sessionStamina" />

      <div v-if="loadingStates.weekdayWeekend" class="chart-container card"><LoadingSpinner /></div>
      <WeekdayWeekendChart v-else :data="weekdayWeekend" />

      <div v-if="loadingStates.artistTimeline" class="chart-container card"><LoadingSpinner /></div>
      <StackedArtistAreaChart v-else :data="artistTimeline" />

      <div v-if="loadingStates.trackTimeline" class="chart-container card"><LoadingSpinner /></div>
      <StackedTrackAreaChart v-else :data="trackTimeline" />

      <div v-if="loadingStates.discoveryRate" class="chart-container card"><LoadingSpinner /></div>
      <DiscoveryVsRepetitionChart v-else :data="discoveryRate" />

      <div v-if="loadingStates.artistCumulative" class="chart-container card"><LoadingSpinner /></div>
      <ArtistRaceChart v-else :data="artistCumulative" />

      <div v-if="loadingStates.trackCumulative" class="chart-container card"><LoadingSpinner /></div>
      <TrackRaceChart v-else :data="trackCumulative" />
      <div ref="bmcSentinel" class="bmc-sentinel"></div>
      <BuyMeACoffeePopup ref="bmcPopup" />

      <div v-if="loadingStates.artistLoyalty" class="chart-container card"><LoadingSpinner /></div>
      <ArtistLoyaltyChart v-else :data="artistLoyalty" />

      <div v-if="loadingStates.backButtonTracks" class="chart-container card"><LoadingSpinner /></div>
      <ReplayLeaderboard v-else :data="backButtonTracks" />

      <div v-if="loadingStates.skipGraveyard" class="chart-container card"><LoadingSpinner /></div>
      <SkipGraveyardChart v-else :data="skipGraveyard" />

      <div v-if="loadingStates.skippedTracks" class="chart-container card"><LoadingSpinner /></div>
      <SkippedTracksLeaderboard v-else :data="skippedTracks" />

      <div v-if="loadingStates.obsessionTimeline" class="chart-container card"><LoadingSpinner /></div>
      <ObsessionTimelineChart v-else :data="obsessionTimeline" />

      <div v-if="loadingStates.contentSplit" class="chart-container card"><LoadingSpinner /></div>
      <PodcastMusicChart v-else :data="contentSplit" />

      <div v-if="loadingStates.artistIntent" class="chart-container card"><LoadingSpinner /></div>
      <ArtistIntentChart v-else :data="artistIntent" />

      <div v-if="loadingStates.trackIntent" class="chart-container card"><LoadingSpinner /></div>
      <TrackIntentChart v-else :data="trackIntent" />

      <div v-if="loadingStates.albumListeners" class="chart-container card"><LoadingSpinner /></div>
      <AlbumListenerChart v-else :data="albumListeners" />

      <div v-if="loadingStates.shuffleSerendipity" class="chart-container card"><LoadingSpinner /></div>
      <ShuffleSerendipityChart v-else :data="shuffleSerendipity" />

      <div v-if="loadingStates.introTestTracks" class="chart-container card"><LoadingSpinner /></div>
      <IntroTestChart v-else :data="introTestTracks" />

      <div v-if="loadingStates.artistDiscovery" class="chart-container card"><LoadingSpinner /></div>
      <DiscoveryAgeMapChart v-else :data="artistDiscovery" />

      <div v-if="loadingStates.seasonalArtists" class="chart-container card"><LoadingSpinner /></div>
      <SeasonalLoyaltyChart v-else :data="seasonalArtists" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
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
import StackedTrackAreaChart from '../components/charts/StackedTrackAreaChart.vue';
import TrackRaceChart from '../components/charts/TrackRaceChart.vue';
import ReplayLeaderboard from '../components/charts/ReplayLeaderboard.vue';
import SkipGraveyardChart from '../components/charts/SkipGraveyardChart.vue';
import SkippedTracksLeaderboard from '../components/charts/SkippedTracksLeaderboard.vue';
import PodcastMusicChart from '../components/charts/PodcastMusicChart.vue';
import ObsessionTimelineChart from '../components/charts/ObsessionTimelineChart.vue';
import SessionStaminaChart from '../components/charts/SessionStaminaChart.vue';
import ArtistIntentChart from '../components/charts/ArtistIntentChart.vue';
import TrackIntentChart from '../components/charts/TrackIntentChart.vue';
import ShuffleSerendipityChart from '../components/charts/ShuffleSerendipityChart.vue';
import IntroTestChart from '../components/charts/IntroTestChart.vue';
import DiscoveryAgeMapChart from '../components/charts/DiscoveryAgeMapChart.vue';
import PersonalityCard from '../components/charts/PersonalityCard.vue';
import WeekdayWeekendChart from '../components/charts/WeekdayWeekendChart.vue';
import AlbumListenerChart from '../components/charts/AlbumListenerChart.vue';
import SeasonalLoyaltyChart from '../components/charts/SeasonalLoyaltyChart.vue';
import BuyMeACoffeePopup from '../components/shared/BuyMeACoffeePopup.vue';

const route = useRoute();
const token = computed(() => route.params.token as string);
const shareUrl = computed(() => `${window.location.origin}/results/${token.value}`);

const bmcSentinel = ref<HTMLElement | null>(null);
const bmcPopup = ref<{ show: () => void } | null>(null);
let bmcObserver: IntersectionObserver | null = null;

const { dateFrom, dateTo, sortBy, activeFilters, hasActiveFilters, resetFilters } = useFilters();

const {
  loadingStates,
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
  trackTimeline,
  trackCumulative,
  contentSplit,
  obsessionTimeline,
  sessionStamina,
  artistIntent,
  trackIntent,
  shuffleSerendipity,
  introTestTracks,
  artistDiscovery,
  weekdayWeekend,
  albumListeners,
  skipGraveyard,
  seasonalArtists,
  personalityInputs,
  fetchAll,
} = useStreamingData(token, activeFilters);

onMounted(() => fetchAll());

watch(bmcSentinel, (el) => {
  if (el && !bmcObserver) {
    bmcObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          bmcPopup.value?.show();
          bmcObserver?.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    bmcObserver.observe(el);
  }
});

onUnmounted(() => bmcObserver?.disconnect());
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.bmc-sentinel {
  height: 0;
  visibility: hidden;
}
</style>
