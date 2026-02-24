import { ref, reactive, computed, watch, type Ref } from 'vue';
import axios from 'axios';
import type {
  StatsFilter,
  OverviewResponse,
  TopArtistEntry,
  TopTrackEntry,
  TimelinePoint,
  HeatmapResponse,
  ArtistTimelineResponse,
  TrackTimelineResponse,
  DiscoveryRatePoint,
  SkippedTrackEntry,
  ArtistSkipRateEntry,
  BackButtonTrackEntry,
  ContentSplitPoint,
  ObsessionPhasePoint,
  TrackObsessionPoint,
  SessionStaminaResponse,
  ArtistIntentEntry,
  TrackIntentEntry,
  PersonalityInputsResponse,
  ShuffleSerendipityEntry,
  IntroTestEntry,
  ArtistDiscoveryEntry,
  WeekdayWeekendResponse,
  AlbumListenerEntry,
  SkipGraveyardEntry,
  SeasonalArtistEntry,
  ReboundArtistEntry,
  MarathonEntry,
} from '@music-livereview/shared';
import * as api from '../services/api';

export function useStreamingData(token: Ref<string>, filters: Ref<StatsFilter>) {
  const overview = ref<OverviewResponse | null>(null);
  const topArtists = ref<TopArtistEntry[]>([]);
  const topTracks = ref<TopTrackEntry[]>([]);
  const timeline = ref<TimelinePoint[]>([]);
  const heatmap = ref<HeatmapResponse | null>(null);
  const artistTimeline = ref<ArtistTimelineResponse | null>(null);
  const discoveryRate = ref<DiscoveryRatePoint[]>([]);
  const skippedTracks = ref<SkippedTrackEntry[]>([]);
  const artistLoyalty = ref<ArtistSkipRateEntry[]>([]);
  const backButtonTracks = ref<BackButtonTrackEntry[]>([]);
  const artistCumulative = ref<ArtistTimelineResponse | null>(null);
  const trackTimeline = ref<TrackTimelineResponse | null>(null);
  const trackCumulative = ref<TrackTimelineResponse | null>(null);
  const contentSplit = ref<ContentSplitPoint[]>([]);
  const obsessionTimeline = ref<ObsessionPhasePoint[]>([]);
  const trackObsessionTimeline = ref<TrackObsessionPoint[]>([]);
  const sessionStamina = ref<SessionStaminaResponse | null>(null);
  const artistIntent = ref<ArtistIntentEntry[]>([]);
  const trackIntent = ref<TrackIntentEntry[]>([]);
  const personalityInputs = ref<PersonalityInputsResponse | null>(null);
  const shuffleSerendipity = ref<ShuffleSerendipityEntry[]>([]);
  const introTestTracks = ref<IntroTestEntry[]>([]);
  const artistDiscovery = ref<ArtistDiscoveryEntry[]>([]);
  const weekdayWeekend = ref<WeekdayWeekendResponse | null>(null);
  const albumListeners = ref<AlbumListenerEntry[]>([]);
  const skipGraveyard = ref<SkipGraveyardEntry[]>([]);
  const seasonalArtists = ref<SeasonalArtistEntry[]>([]);
  const reboundArtists = ref<ReboundArtistEntry[]>([]);
  const marathons = ref<MarathonEntry[]>([]);

  const loadingStates = reactive<Record<string, boolean>>({
    overview: false,
    topArtists: false,
    topTracks: false,
    timeline: false,
    heatmap: false,
    artistTimeline: false,
    discoveryRate: false,
    skippedTracks: false,
    artistLoyalty: false,
    backButtonTracks: false,
    artistCumulative: false,
    trackTimeline: false,
    trackCumulative: false,
    contentSplit: false,
    obsessionTimeline: false,
    trackObsessionTimeline: false,
    sessionStamina: false,
    artistIntent: false,
    trackIntent: false,
    personalityInputs: false,
    shuffleSerendipity: false,
    introTestTracks: false,
    artistDiscovery: false,
    weekdayWeekend: false,
    albumListeners: false,
    skipGraveyard: false,
    seasonalArtists: false,
    reboundArtists: false,
    marathons: false,
  });

  const errorStates = reactive<Record<string, boolean>>({
    overview: false,
    topArtists: false,
    topTracks: false,
    timeline: false,
    heatmap: false,
    artistTimeline: false,
    discoveryRate: false,
    skippedTracks: false,
    artistLoyalty: false,
    backButtonTracks: false,
    artistCumulative: false,
    trackTimeline: false,
    trackCumulative: false,
    contentSplit: false,
    obsessionTimeline: false,
    trackObsessionTimeline: false,
    sessionStamina: false,
    artistIntent: false,
    trackIntent: false,
    personalityInputs: false,
    shuffleSerendipity: false,
    introTestTracks: false,
    artistDiscovery: false,
    weekdayWeekend: false,
    albumListeners: false,
    skipGraveyard: false,
    seasonalArtists: false,
    reboundArtists: false,
    marathons: false,
  });

  const loading = computed(() => Object.values(loadingStates).some(Boolean));

  async function fetchOne<T>(key: string, target: Ref<T>, fetcher: () => Promise<T>) {
    loadingStates[key] = true;
    errorStates[key] = false;
    try {
      target.value = await fetcher();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        errorStates[key] = true;
      } else {
        console.error(`Failed to fetch ${key}:`, err);
      }
    } finally {
      loadingStates[key] = false;
    }
  }

  async function fetchAll() {
    if (!token.value) return;
    const f = filters.value;

    const tasks = [
      () => fetchOne('overview', overview, () => api.getOverview(token.value, f)),
      () => fetchOne('topArtists', topArtists, () => api.getTopArtists(token.value, f)),
      () => fetchOne('topTracks', topTracks, () => api.getTopTracks(token.value, f)),
      () => fetchOne('timeline', timeline, () => api.getTimeline(token.value, f)),
      () => fetchOne('heatmap', heatmap, () => api.getHeatmap(token.value, f)),
      () => fetchOne('artistTimeline', artistTimeline, () => api.getTopArtistsOverTime(token.value, f)),
      () => fetchOne('discoveryRate', discoveryRate, () => api.getDiscoveryRate(token.value, f)),
      () => fetchOne('skippedTracks', skippedTracks, () => api.getSkippedTracks(token.value, f)),
      () => fetchOne('artistLoyalty', artistLoyalty, () => api.getArtistLoyalty(token.value, f)),
      () => fetchOne('backButtonTracks', backButtonTracks, () => api.getBackButtonTracks(token.value, f)),
      () => fetchOne('artistCumulative', artistCumulative, () => api.getArtistCumulative(token.value, f)),
      () => fetchOne('trackTimeline', trackTimeline, () => api.getTopTracksOverTime(token.value, f)),
      () => fetchOne('trackCumulative', trackCumulative, () => api.getTrackCumulative(token.value, f)),
      () => fetchOne('contentSplit', contentSplit, () => api.getContentSplit(token.value, f)),
      () => fetchOne('obsessionTimeline', obsessionTimeline, () => api.getObsessionTimeline(token.value, f)),
      () => fetchOne('trackObsessionTimeline', trackObsessionTimeline, () => api.getTrackObsessionTimeline(token.value, f)),
      () => fetchOne('sessionStamina', sessionStamina, () => api.getSessionStamina(token.value, f)),
      () => fetchOne('artistIntent', artistIntent, () => api.getArtistIntent(token.value, f)),
      () => fetchOne('trackIntent', trackIntent, () => api.getTrackIntent(token.value, f)),
      () => fetchOne('personalityInputs', personalityInputs, () => api.getPersonalityInputs(token.value)),
      () => fetchOne('shuffleSerendipity', shuffleSerendipity, () => api.getShuffleSerendipity(token.value, f)),
      () => fetchOne('introTestTracks', introTestTracks, () => api.getIntroTestTracks(token.value, f)),
      () => fetchOne('artistDiscovery', artistDiscovery, () => api.getArtistDiscovery(token.value, f)),
      () => fetchOne('weekdayWeekend', weekdayWeekend, () => api.getWeekdayWeekend(token.value, f)),
      () => fetchOne('albumListeners', albumListeners, () => api.getAlbumListeners(token.value, f)),
      () => fetchOne('skipGraveyard', skipGraveyard, () => api.getSkipGraveyard(token.value, f)),
      () => fetchOne('seasonalArtists', seasonalArtists, () => api.getSeasonalArtists(token.value)),
      () => fetchOne('reboundArtists', reboundArtists, () => api.getReboundArtists(token.value, f)),
      () => fetchOne('marathons', marathons, () => api.getMarathons(token.value, f)),
    ];

    // Run up to 8 requests concurrently. Unlike fixed batches, this keeps
    // slots busy immediately as each finishes — slow requests don't block fast ones.
    const concurrency = 8;
    const queue = [...tasks];
    const workers = Array.from({ length: concurrency }, async () => {
      while (queue.length > 0) {
        await queue.shift()?.();
      }
    });
    await Promise.allSettled(workers);
  }

  // Re-fetch when filters change
  watch(filters, () => fetchAll(), { deep: true });

  return {
    loading,
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
    personalityInputs,
    shuffleSerendipity,
    introTestTracks,
    artistDiscovery,
    weekdayWeekend,
    albumListeners,
    skipGraveyard,
    seasonalArtists,
    reboundArtists,
    marathons,
    fetchAll,
  };
}
