import { ref, watch, type Ref } from 'vue';
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
} from '@music-livereview/shared';
import * as api from '../services/api';

export function useStreamingData(token: Ref<string>, filters: Ref<StatsFilter>) {
  const loading = ref(false);
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

  async function fetchAll() {
    if (!token.value) return;
    loading.value = true;

    try {
      const f = filters.value;
      const results = await Promise.all([
        api.getOverview(token.value, f),
        api.getTopArtists(token.value, f),
        api.getTopTracks(token.value, f),
        api.getTimeline(token.value, f),
        api.getHeatmap(token.value, f),
        api.getTopArtistsOverTime(token.value, f),
        api.getDiscoveryRate(token.value, f),
        api.getSkippedTracks(token.value, f),
        api.getArtistLoyalty(token.value, f),
        api.getBackButtonTracks(token.value, f),
        api.getArtistCumulative(token.value, f),
      ]);

      overview.value = results[0];
      topArtists.value = results[1];
      topTracks.value = results[2];
      timeline.value = results[3];
      heatmap.value = results[4];
      artistTimeline.value = results[5];
      discoveryRate.value = results[6];
      skippedTracks.value = results[7];
      artistLoyalty.value = results[8];
      backButtonTracks.value = results[9];
      artistCumulative.value = results[10];
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      loading.value = false;
    }
  }

  // Re-fetch when filters change
  watch(filters, () => fetchAll(), { deep: true });

  return {
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
  };
}
