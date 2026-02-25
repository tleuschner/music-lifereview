<template>
  <div class="dashboard-wrapper">
    <!-- Mobile nav teleports here so it's sticky within the full page height -->
    <div id="mobile-nav-slot"></div>

    <div class="dashboard-layout">
      <DashboardToc v-if="overview" :sections="TOC_SECTIONS" />

      <div class="dashboard" @click="handleChartAreaClick">
        <LoadingSpinner
          v-if="loadingStates.overview && !overview"
          message="Loading your stats..."
        />

        <template v-if="overview">
          <!-- Overview: stat cards, personality, share link, filters -->
          <div id="toc-overview" class="toc-section">
            <div class="grid grid-4">
              <StatCard
                label="Total Listening"
                :value="`${overview.totalHours.toLocaleString()}h`"
                :subtitle="`${overview.totalDays} days`"
              />
              <StatCard
                label="Total Plays"
                :value="overview.totalPlays.toLocaleString()"
              />
              <StatCard
                label="Unique Artists"
                :value="overview.uniqueArtists.toLocaleString()"
              />
              <StatCard
                label="Unique Tracks"
                :value="overview.uniqueTracks.toLocaleString()"
              />
            </div>
            <ChartWrapper
              :loading="loadingStates.personalityInputs"
              :error="errorStates.personalityInputs"
            >
              <PersonalityCard :data="personalityInputs" :token="token" />
            </ChartWrapper>
            <ShareLinkCard :url="shareUrl" />
            <FilterBar
              :date-from="dateFrom"
              :date-to="dateTo"
              :min-month="overview.dateFrom.slice(0, 7)"
              :max-month="overview.dateTo.slice(0, 7)"
              :sort-by="sortBy"
              :limit="limit"
              :has-active-filters="hasActiveFilters"
              :date-range-error="dateRangeError"
              @update:date-from="dateFrom = $event"
              @update:date-to="dateTo = $event"
              @update:sort-by="sortBy = $event as 'hours' | 'count'"
              @update:limit="limit = $event"
              @reset="resetFilters"
            />
          </div>

          <!-- Listening Timeline -->
          <div id="toc-timeline">
            <ChartWrapper
              :loading="loadingStates.timeline"
              :error="errorStates.timeline"
            >
              <ListeningTimelineChart :data="timeline" />
            </ChartWrapper>
          </div>

          <!-- Top Charts -->
          <div id="toc-top-charts">
            <div class="grid grid-2">
              <div id="chart-top-artists">
                <ChartWrapper
                  :loading="loadingStates.topArtists"
                  :error="errorStates.topArtists"
                >
                  <TopArtistsChart :data="topArtists" :sort-by="sortBy" />
                </ChartWrapper>
              </div>
              <div id="chart-top-tracks">
                <ChartWrapper
                  :loading="loadingStates.topTracks"
                  :error="errorStates.topTracks"
                >
                  <TopTracksChart :data="topTracks" :sort-by="sortBy" />
                </ChartWrapper>
              </div>
            </div>
          </div>

          <!-- Heatmap -->
          <div id="toc-heatmap">
            <ChartWrapper
              :loading="loadingStates.heatmap"
              :error="errorStates.heatmap"
            >
              <HeatmapChart :data="heatmap" />
            </ChartWrapper>
          </div>

          <!-- Session Depth -->
          <div id="toc-session-depth">
            <LazySection>
              <ChartWrapper
                :loading="loadingStates.sessionStamina"
                :error="errorStates.sessionStamina"
              >
                <SessionStaminaChart :data="sessionStamina" />
              </ChartWrapper>
            </LazySection>
          </div>

          <!-- Weekday / Weekend -->
          <div id="toc-weekday-weekend">
            <LazySection>
              <ChartWrapper
                :loading="loadingStates.weekdayWeekend"
                :error="errorStates.weekdayWeekend"
              >
                <WeekdayWeekendChart :data="weekdayWeekend" />
              </ChartWrapper>
            </LazySection>
          </div>

          <!-- Marathons -->
          <div id="toc-marathons">
            <LazySection>
              <ChartWrapper
                :loading="loadingStates.marathons"
                :error="errorStates.marathons"
              >
                <MarathonChart :data="marathons" />
              </ChartWrapper>
            </LazySection>
          </div>

          <!-- Artist Trends -->
          <div id="toc-artist-trends">
            <LazySection>
              <ChartWrapper
                :loading="loadingStates.artistTimeline"
                :error="errorStates.artistTimeline"
              >
                <StackedArtistAreaChart :data="artistTimeline" />
              </ChartWrapper>
            </LazySection>
          </div>

          <!-- Track Trends -->
          <div id="toc-track-trends">
            <LazySection>
              <ChartWrapper
                :loading="loadingStates.trackTimeline"
                :error="errorStates.trackTimeline"
              >
                <StackedTrackAreaChart :data="trackTimeline" />
              </ChartWrapper>
            </LazySection>
          </div>

          <!-- Discovery Rate -->
          <div id="toc-discovery-rate">
            <LazySection>
              <ChartWrapper
                :loading="loadingStates.discoveryRate"
                :error="errorStates.discoveryRate"
              >
                <DiscoveryVsRepetitionChart :data="discoveryRate" />
              </ChartWrapper>
            </LazySection>
          </div>

          <!-- Race Charts -->
          <div id="toc-race-charts" class="toc-section">
            <div id="chart-artist-race">
              <LazySection>
                <ChartWrapper
                  :loading="loadingStates.artistCumulative"
                  :error="errorStates.artistCumulative"
                >
                  <ArtistRaceChart :data="artistCumulative" />
                </ChartWrapper>
              </LazySection>
            </div>
            <div id="chart-track-race">
              <LazySection>
                <ChartWrapper
                  :loading="loadingStates.trackCumulative"
                  :error="errorStates.trackCumulative"
                >
                  <TrackRaceChart :data="trackCumulative" />
                </ChartWrapper>
              </LazySection>
            </div>
            <div ref="bmcSentinel" class="bmc-sentinel"></div>
            <BuyMeACoffeePopup ref="bmcPopup" />
          </div>

          <!-- Artist Loyalty -->
          <div id="toc-loyalty">
            <LazySection>
              <ChartWrapper
                :loading="loadingStates.artistLoyalty"
                :error="errorStates.artistLoyalty"
              >
                <ArtistLoyaltyChart :data="artistLoyalty" />
              </ChartWrapper>
            </LazySection>
          </div>

          <!-- Skip & Replay -->
          <div id="toc-skip-replay" class="toc-section">
            <div id="chart-replay">
              <LazySection>
                <ChartWrapper
                  :loading="loadingStates.backButtonTracks"
                  :error="errorStates.backButtonTracks"
                >
                  <ReplayLeaderboard :data="backButtonTracks" />
                </ChartWrapper>
              </LazySection>
            </div>
            <div id="chart-skip-graveyard">
              <LazySection>
                <ChartWrapper
                  :loading="loadingStates.skipGraveyard"
                  :error="errorStates.skipGraveyard"
                >
                  <SkipGraveyardChart :data="skipGraveyard" />
                </ChartWrapper>
              </LazySection>
            </div>
            <div id="chart-skipped-tracks">
              <LazySection>
                <ChartWrapper
                  :loading="loadingStates.skippedTracks"
                  :error="errorStates.skippedTracks"
                >
                  <SkippedTracksLeaderboard :data="skippedTracks" />
                </ChartWrapper>
              </LazySection>
            </div>
          </div>

          <!-- Obsessions -->
          <div id="toc-obsessions" class="toc-section">
            <LazySection>
              <ChartWrapper
                :loading="loadingStates.obsessionTimeline"
                :error="errorStates.obsessionTimeline"
              >
                <ObsessionTimelineChart :data="obsessionTimeline" />
              </ChartWrapper>
            </LazySection>
            <LazySection>
              <ChartWrapper
                :loading="loadingStates.trackObsessionTimeline"
                :error="errorStates.trackObsessionTimeline"
              >
                <TrackObsessionChart :data="trackObsessionTimeline" />
              </ChartWrapper>
            </LazySection>
          </div>

          <!-- Content Split -->
          <div id="toc-content-split">
            <LazySection>
              <ChartWrapper
                :loading="loadingStates.contentSplit"
                :error="errorStates.contentSplit"
              >
                <PodcastMusicChart :data="contentSplit" />
              </ChartWrapper>
            </LazySection>
          </div>

          <!-- Intent -->
          <div id="toc-intent" class="toc-section">
            <div id="chart-artist-intent">
              <LazySection min-height="600px">
                <ChartWrapper
                  :loading="loadingStates.artistIntent"
                  :error="errorStates.artistIntent"
                >
                  <ArtistIntentChart :data="artistIntent" />
                </ChartWrapper>
              </LazySection>
            </div>
            <div id="chart-track-intent">
              <LazySection min-height="600px">
                <ChartWrapper
                  :loading="loadingStates.trackIntent"
                  :error="errorStates.trackIntent"
                >
                  <TrackIntentChart :data="trackIntent" />
                </ChartWrapper>
              </LazySection>
            </div>
          </div>

          <!-- Track Behavior -->
          <div id="toc-track-behavior" class="toc-section">
            <div id="chart-album-listeners">
              <LazySection>
                <ChartWrapper
                  :loading="loadingStates.albumListeners"
                  :error="errorStates.albumListeners"
                >
                  <AlbumListenerChart :data="albumListeners" />
                </ChartWrapper>
              </LazySection>
            </div>
            <div id="chart-shuffle">
              <LazySection>
                <ChartWrapper
                  :loading="loadingStates.shuffleSerendipity"
                  :error="errorStates.shuffleSerendipity"
                >
                  <ShuffleSerendipityChart :data="shuffleSerendipity" />
                </ChartWrapper>
              </LazySection>
            </div>
            <div id="chart-intro-test">
              <LazySection>
                <ChartWrapper
                  :loading="loadingStates.introTestTracks"
                  :error="errorStates.introTestTracks"
                >
                  <IntroTestChart :data="introTestTracks" />
                </ChartWrapper>
              </LazySection>
            </div>
          </div>

          <!-- Discovery Map -->
          <div id="toc-discovery-map">
            <LazySection>
              <ChartWrapper
                :loading="loadingStates.artistDiscovery"
                :error="errorStates.artistDiscovery"
              >
                <DiscoveryAgeMapChart :data="artistDiscovery" />
              </ChartWrapper>
            </LazySection>
          </div>

          <!-- Seasons -->
          <div id="toc-seasons" class="toc-section">
            <div id="chart-seasonal-loyalty">
              <LazySection>
                <ChartWrapper
                  :loading="loadingStates.seasonalArtists"
                  :error="errorStates.seasonalArtists"
                >
                  <SeasonalLoyaltyChart :data="seasonalArtists" />
                </ChartWrapper>
              </LazySection>
            </div>
            <div id="chart-rebound">
              <LazySection>
                <ChartWrapper
                  :loading="loadingStates.reboundArtists"
                  :error="errorStates.reboundArtists"
                >
                  <ReboundArtistsChart :data="reboundArtists" />
                </ChartWrapper>
              </LazySection>
            </div>
          </div>

          <!-- Delete -->
          <div class="delete-section">
            <template v-if="!showDeleteConfirm">
              <button class="btn btn-danger" @click="showDeleteConfirm = true">
                Delete my data
              </button>
            </template>
            <template v-else>
              <p class="delete-warning">
                This will permanently delete all your listening data. This
                cannot be undone.
              </p>
              <div class="delete-actions">
                <button
                  class="btn btn-secondary"
                  :disabled="isDeleting"
                  @click="showDeleteConfirm = false"
                >
                  Cancel
                </button>
                <button
                  class="btn btn-danger"
                  :disabled="isDeleting"
                  @click="confirmDelete"
                >
                  {{ isDeleting ? "Deleting..." : "Yes, delete everything" }}
                </button>
              </div>
            </template>
          </div>
        </template>
      </div>
    </div>
    <!-- /.dashboard-layout -->
  </div>
  <!-- /.dashboard-wrapper -->
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as api from "../services/api";
import { useStreamingData } from "../composables/useStreamingData";
import { useFilters } from "../composables/useFilters";
import LoadingSpinner from "../components/shared/LoadingSpinner.vue";
import ChartWrapper from "../components/shared/ChartWrapper.vue";
import LazySection from "../components/shared/LazySection.vue";
import StatCard from "../components/shared/StatCard.vue";
import ShareLinkCard from "../components/shared/ShareLinkCard.vue";
import FilterBar from "../components/filters/FilterBar.vue";
import DashboardToc from "../components/shared/DashboardToc.vue";
import TopArtistsChart from "../components/charts/TopArtistsChart.vue";
import TopTracksChart from "../components/charts/TopTracksChart.vue";
import ListeningTimelineChart from "../components/charts/ListeningTimelineChart.vue";
import HeatmapChart from "../components/charts/HeatmapChart.vue";
import StackedArtistAreaChart from "../components/charts/StackedArtistAreaChart.vue";
import DiscoveryVsRepetitionChart from "../components/charts/DiscoveryVsRepetitionChart.vue";
import ArtistLoyaltyChart from "../components/charts/ArtistLoyaltyChart.vue";
import ArtistRaceChart from "../components/charts/ArtistRaceChart.vue";
import StackedTrackAreaChart from "../components/charts/StackedTrackAreaChart.vue";
import TrackRaceChart from "../components/charts/TrackRaceChart.vue";
import ReplayLeaderboard from "../components/charts/ReplayLeaderboard.vue";
import SkipGraveyardChart from "../components/charts/SkipGraveyardChart.vue";
import SkippedTracksLeaderboard from "../components/charts/SkippedTracksLeaderboard.vue";
import PodcastMusicChart from "../components/charts/PodcastMusicChart.vue";
import ObsessionTimelineChart from "../components/charts/ObsessionTimelineChart.vue";
import TrackObsessionChart from "../components/charts/TrackObsessionChart.vue";
import SessionStaminaChart from "../components/charts/SessionStaminaChart.vue";
import ArtistIntentChart from "../components/charts/ArtistIntentChart.vue";
import TrackIntentChart from "../components/charts/TrackIntentChart.vue";
import ShuffleSerendipityChart from "../components/charts/ShuffleSerendipityChart.vue";
import IntroTestChart from "../components/charts/IntroTestChart.vue";
import DiscoveryAgeMapChart from "../components/charts/DiscoveryAgeMapChart.vue";
import PersonalityCard from "../components/charts/PersonalityCard.vue";
import WeekdayWeekendChart from "../components/charts/WeekdayWeekendChart.vue";
import AlbumListenerChart from "../components/charts/AlbumListenerChart.vue";
import SeasonalLoyaltyChart from "../components/charts/SeasonalLoyaltyChart.vue";
import ReboundArtistsChart from "../components/charts/ReboundArtistsChart.vue";
import MarathonChart from "../components/charts/MarathonChart.vue";
import BuyMeACoffeePopup from "../components/shared/BuyMeACoffeePopup.vue";

const TOC_SECTIONS = [
  { id: "toc-overview", label: "Overview" },
  { id: "toc-timeline", label: "Timeline" },
  { id: "toc-top-charts", label: "Top Charts" },
  { id: "toc-heatmap", label: "Heatmap" },
  { id: "toc-session-depth", label: "Session Depth" },
  { id: "toc-weekday-weekend", label: "Weekday / Weekend" },
  { id: "toc-marathons", label: "Marathons" },
  { id: "toc-artist-trends", label: "Artist Trends" },
  { id: "toc-track-trends", label: "Track Trends" },
  { id: "toc-discovery-rate", label: "Discovery Rate" },
  { id: "toc-race-charts", label: "Race Charts" },
  { id: "toc-loyalty", label: "Artist Loyalty" },
  { id: "toc-skip-replay", label: "Skip & Replay" },
  { id: "toc-obsessions", label: "Obsessions" },
  { id: "toc-content-split", label: "Content Split" },
  { id: "toc-intent", label: "Intent" },
  { id: "toc-track-behavior", label: "Track Behavior" },
  { id: "toc-discovery-map", label: "Discovery Map" },
  { id: "toc-seasons", label: "Seasons" },
];

const route = useRoute();
const router = useRouter();
const token = computed(() => route.params.token as string);
const shareUrl = computed(
  () => `${window.location.origin}/share/${token.value}`,
);

const bmcSentinel = ref<HTMLElement | null>(null);
const bmcPopup = ref<{ show: () => void } | null>(null);
let bmcObserver: IntersectionObserver | null = null;

const {
  dateFrom,
  dateTo,
  sortBy,
  limit,
  activeFilters,
  hasActiveFilters,
  dateRangeError,
  resetFilters,
} = useFilters();

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
  trackObsessionTimeline,
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

// Scroll to hash anchor once overview data is available (browser fires the
// native scroll before v-if renders the elements, so we do it manually).
watch(overview, (val) => {
  if (!val) return;
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  nextTick(() => {
    const el = document.getElementById(hash);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'instant' });
  });
}, { once: true });

const showDeleteConfirm = ref(false);
const isDeleting = ref(false);

async function confirmDelete() {
  isDeleting.value = true;
  try {
    await api.deleteSession(token.value);
    router.push("/");
  } finally {
    isDeleting.value = false;
  }
}

watch(bmcSentinel, (el) => {
  if (el && !bmcObserver) {
    bmcObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // bmcPopup.value?.show();
          bmcObserver?.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    bmcObserver.observe(el);
  }
});

onUnmounted(() => bmcObserver?.disconnect());

function handleChartAreaClick(e: MouseEvent) {
  const card = (e.target as HTMLElement).closest(".chart-container");
  if (!card) return;
  let el: HTMLElement | null = card.parentElement;
  while (el) {
    if (el.id) {
      history.replaceState(null, "", `#${el.id}`);
      return;
    }
    el = el.parentElement;
  }
}
</script>

<style scoped>
.dashboard-wrapper {
  display: flex;
  flex-direction: column;
}

.dashboard-layout {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.dashboard {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.toc-section {
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
