import { ref, reactive, computed, watch, type Ref } from 'vue';
import type {
  StatsFilter,
  OverviewResponse,
  TopArtistEntry,
  TopTrackEntry,
  TimelinePoint,
  HeatmapResponse,
  ArtistTimelineResponse,
  DiscoveryRatePoint,
  SkippedTrackEntry,
  ArtistSkipRateEntry,
  BackButtonTrackEntry,
  ContentSplitPoint,
  ObsessionPhasePoint,
  SessionStaminaResponse,
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
  const contentSplit = ref<ContentSplitPoint[]>([]);
  const obsessionTimeline = ref<ObsessionPhasePoint[]>([]);
  const sessionStamina = ref<SessionStaminaResponse | null>(null);

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
    contentSplit: false,
    obsessionTimeline: false,
    sessionStamina: false,
  });

  const loading = computed(() => Object.values(loadingStates).some(Boolean));

  async function fetchOne<T>(key: string, target: Ref<T>, fetcher: () => Promise<T>) {
    loadingStates[key] = true;
    try {
      target.value = await fetcher();
    } catch (err) {
      console.error(`Failed to fetch ${key}:`, err);
    } finally {
      loadingStates[key] = false;
    }
  }

  async function fetchAll() {
    if (!token.value) return;
    const f = filters.value;

    await Promise.allSettled([
      fetchOne('overview', overview, () => api.getOverview(token.value, f)),
      fetchOne('topArtists', topArtists, () => api.getTopArtists(token.value, f)),
      fetchOne('topTracks', topTracks, () => api.getTopTracks(token.value, f)),
      fetchOne('timeline', timeline, () => api.getTimeline(token.value, f)),
      fetchOne('heatmap', heatmap, () => api.getHeatmap(token.value, f)),
      fetchOne('artistTimeline', artistTimeline, () => api.getTopArtistsOverTime(token.value, f)),
      fetchOne('discoveryRate', discoveryRate, () => api.getDiscoveryRate(token.value, f)),
      fetchOne('skippedTracks', skippedTracks, () => api.getSkippedTracks(token.value, f)),
      fetchOne('artistLoyalty', artistLoyalty, () => api.getArtistLoyalty(token.value, f)),
      fetchOne('backButtonTracks', backButtonTracks, () => api.getBackButtonTracks(token.value, f)),
      fetchOne('artistCumulative', artistCumulative, () => api.getArtistCumulative(token.value, f)),
      fetchOne('contentSplit', contentSplit, () => api.getContentSplit(token.value, f)),
      fetchOne('obsessionTimeline', obsessionTimeline, () => api.getObsessionTimeline(token.value, f)),
      fetchOne('sessionStamina', sessionStamina, () => api.getSessionStamina(token.value, f)),
    ]);
  }

  // Re-fetch when filters change
  watch(filters, () => fetchAll(), { deep: true });

  return {
    loading,
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
    contentSplit,
    obsessionTimeline,
    sessionStamina,
    fetchAll,
  };
}
