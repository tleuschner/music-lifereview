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
      <ChartWrapper :loading="loadingStates.personalityInputs" :error="errorStates.personalityInputs">
        <PersonalityCard :data="personalityInputs" :token="token" />
      </ChartWrapper>

      <!-- Share Link -->
      <ShareLinkCard :url="shareUrl" />

      <!-- Filters -->
      <FilterBar
        :date-from="dateFrom"
        :date-to="dateTo"
        :sort-by="sortBy"
        :limit="limit"
        :has-active-filters="hasActiveFilters"
        @update:date-from="dateFrom = $event"
        @update:date-to="dateTo = $event"
        @update:sort-by="sortBy = $event as 'hours' | 'count'"
        @update:limit="limit = $event"
        @reset="resetFilters"
      />

      <!-- Charts -->
      <ChartWrapper :loading="loadingStates.timeline" :error="errorStates.timeline">
        <ListeningTimelineChart :data="timeline" />
      </ChartWrapper>

      <div class="grid grid-2">
        <ChartWrapper :loading="loadingStates.topArtists" :error="errorStates.topArtists">
          <TopArtistsChart :data="topArtists" :sort-by="sortBy" />
        </ChartWrapper>

        <ChartWrapper :loading="loadingStates.topTracks" :error="errorStates.topTracks">
          <TopTracksChart :data="topTracks" :sort-by="sortBy" />
        </ChartWrapper>
      </div>

      <ChartWrapper :loading="loadingStates.heatmap" :error="errorStates.heatmap">
        <HeatmapChart :data="heatmap" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.sessionStamina" :error="errorStates.sessionStamina">
        <SessionStaminaChart :data="sessionStamina" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.weekdayWeekend" :error="errorStates.weekdayWeekend">
        <WeekdayWeekendChart :data="weekdayWeekend" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.marathons" :error="errorStates.marathons">
        <MarathonChart :data="marathons" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.artistTimeline" :error="errorStates.artistTimeline">
        <StackedArtistAreaChart :data="artistTimeline" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.trackTimeline" :error="errorStates.trackTimeline">
        <StackedTrackAreaChart :data="trackTimeline" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.discoveryRate" :error="errorStates.discoveryRate">
        <DiscoveryVsRepetitionChart :data="discoveryRate" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.artistCumulative" :error="errorStates.artistCumulative">
        <ArtistRaceChart :data="artistCumulative" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.trackCumulative" :error="errorStates.trackCumulative">
        <TrackRaceChart :data="trackCumulative" />
      </ChartWrapper>
      <div ref="bmcSentinel" class="bmc-sentinel"></div>
      <BuyMeACoffeePopup ref="bmcPopup" />

      <ChartWrapper :loading="loadingStates.artistLoyalty" :error="errorStates.artistLoyalty">
        <ArtistLoyaltyChart :data="artistLoyalty" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.backButtonTracks" :error="errorStates.backButtonTracks">
        <ReplayLeaderboard :data="backButtonTracks" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.skipGraveyard" :error="errorStates.skipGraveyard">
        <SkipGraveyardChart :data="skipGraveyard" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.skippedTracks" :error="errorStates.skippedTracks">
        <SkippedTracksLeaderboard :data="skippedTracks" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.obsessionTimeline" :error="errorStates.obsessionTimeline">
        <ObsessionTimelineChart :data="obsessionTimeline" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.contentSplit" :error="errorStates.contentSplit">
        <PodcastMusicChart :data="contentSplit" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.artistIntent" :error="errorStates.artistIntent">
        <ArtistIntentChart :data="artistIntent" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.trackIntent" :error="errorStates.trackIntent">
        <TrackIntentChart :data="trackIntent" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.albumListeners" :error="errorStates.albumListeners">
        <AlbumListenerChart :data="albumListeners" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.shuffleSerendipity" :error="errorStates.shuffleSerendipity">
        <ShuffleSerendipityChart :data="shuffleSerendipity" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.introTestTracks" :error="errorStates.introTestTracks">
        <IntroTestChart :data="introTestTracks" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.artistDiscovery" :error="errorStates.artistDiscovery">
        <DiscoveryAgeMapChart :data="artistDiscovery" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.seasonalArtists" :error="errorStates.seasonalArtists">
        <SeasonalLoyaltyChart :data="seasonalArtists" />
      </ChartWrapper>

      <ChartWrapper :loading="loadingStates.reboundArtists" :error="errorStates.reboundArtists">
        <ReboundArtistsChart :data="reboundArtists" />
      </ChartWrapper>

      <!-- Delete -->
      <div class="delete-section">
        <template v-if="!showDeleteConfirm">
          <button class="btn btn-danger" @click="showDeleteConfirm = true">Delete my data</button>
        </template>
        <template v-else>
          <p class="delete-warning">This will permanently delete all your listening data. This cannot be undone.</p>
          <div class="delete-actions">
            <button class="btn btn-secondary" :disabled="isDeleting" @click="showDeleteConfirm = false">Cancel</button>
            <button class="btn btn-danger" :disabled="isDeleting" @click="confirmDelete">
              {{ isDeleting ? 'Deleting...' : 'Yes, delete everything' }}
            </button>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import * as api from '../services/api';
import { useStreamingData } from '../composables/useStreamingData';
import { useFilters } from '../composables/useFilters';
import LoadingSpinner from '../components/shared/LoadingSpinner.vue';
import ChartWrapper from '../components/shared/ChartWrapper.vue';
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
import ReboundArtistsChart from '../components/charts/ReboundArtistsChart.vue';
import MarathonChart from '../components/charts/MarathonChart.vue';
import BuyMeACoffeePopup from '../components/shared/BuyMeACoffeePopup.vue';

const route = useRoute();
const router = useRouter();
const token = computed(() => route.params.token as string);
const shareUrl = computed(() => `${window.location.origin}/results/${token.value}`);

const bmcSentinel = ref<HTMLElement | null>(null);
const bmcPopup = ref<{ show: () => void } | null>(null);
let bmcObserver: IntersectionObserver | null = null;

const { dateFrom, dateTo, sortBy, limit, activeFilters, hasActiveFilters, resetFilters } = useFilters();

const {
  loadingStates,
  errorStates,
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
  reboundArtists,
  marathons,
  personalityInputs,
  fetchAll,
} = useStreamingData(token, activeFilters);

onMounted(() => fetchAll());

const showDeleteConfirm = ref(false);
const isDeleting = ref(false);

async function confirmDelete() {
  isDeleting.value = true;
  try {
    await api.deleteSession(token.value);
    router.push('/');
  } finally {
    isDeleting.value = false;
  }
}

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

.delete-section {
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.delete-warning {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.delete-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-danger {
  background: #c0392b;
  color: #fff;
  border: none;
}

.btn-danger:hover:not(:disabled) {
  background: #a93226;
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-border);
}
</style>
