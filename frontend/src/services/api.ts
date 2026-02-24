import axios from 'axios';
import type { AggregationResult, UploadAggregatedRequest } from '@music-livereview/shared';
import type { WorkerOutMessage } from '../workers/aggregation.worker';
import type {
  StatusResponse,
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
  PersonalityDistributionResponse,
  GlobalStatsResponse,
  PercentileResponse,
  TrendingArtistEntry,
  StatsFilter,
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
const http = axios.create({ baseURL: '/api' });

function filterParams(filters: StatsFilter): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.artist) params.artist = filters.artist;
  if (filters.limit) params.limit = String(filters.limit);
  if (filters.sort) params.sort = filters.sort;
  return params;
}

export type AggregateProgressEvent =
  | { stage: 'reading'; fileIndex: number; total: number }
  | { stage: 'aggregating' };

/** Runs PII stripping + aggregation in a Web Worker off the main thread. */
export function aggregateInWorker(
  files: File[],
  onProgress?: (event: AggregateProgressEvent) => void,
): Promise<{ result: AggregationResult; userHash: string | null }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/aggregation.worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
      const msg = event.data;
      if (msg.type === 'progress') {
        onProgress?.(msg.stage === 'reading'
          ? { stage: 'reading', fileIndex: msg.fileIndex, total: msg.total }
          : { stage: 'aggregating' });
      } else if (msg.type === 'done') {
        worker.terminate();
        resolve({ result: msg.result, userHash: msg.userHash });
      } else if (msg.type === 'error') {
        worker.terminate();
        reject(new Error(msg.message));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(err.message));
    };

    // Spread into a plain array — Vue's reactive Proxy is not structured-cloneable
    worker.postMessage({ type: 'aggregate', files: Array.from(files) });
  });
}

async function gzipJson(payload: unknown): Promise<ArrayBuffer> {
  const stream = new Blob([JSON.stringify(payload)])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

/** POSTs pre-aggregated data to the server. Returns immediately with a share token. */
export async function postAggregated(
  result: AggregationResult,
  userHash: string | null,
  optOut: boolean,
): Promise<{ shareToken: string; status: string }> {
  const body: UploadAggregatedRequest = {
    optOut,
    userHash,
    summary: result.summary,
    artistBuckets: result.artistBuckets,
    trackBuckets: result.trackBuckets,
    hourlyStatsBuckets: result.hourlyStatsBuckets,
    trackFirstPlays: result.trackFirstPlays,
    monthlyTotals: result.monthlyTotals,
    marathons: result.marathons,
  };
  const compressed = await gzipJson(body);
  // Send as raw binary — server gunzips manually so the size limit
  // applies to the compressed bytes (~3–5 MB), not the decompressed JSON.
  const { data } = await http.post('/upload', compressed, {
    headers: { 'Content-Type': 'application/octet-stream' },
  });
  return data;
}

export async function getStatus(token: string): Promise<StatusResponse> {
  const { data } = await http.get(`/status/${token}`);
  return data;
}

// Personal stats
export async function getOverview(token: string, filters: StatsFilter = {}): Promise<OverviewResponse> {
  const { data } = await http.get(`/stats/${token}/overview`, { params: filterParams(filters) });
  return data;
}

export async function getTopArtists(token: string, filters: StatsFilter = {}): Promise<TopArtistEntry[]> {
  const { data } = await http.get(`/stats/${token}/top-artists`, { params: filterParams(filters) });
  return data;
}

export async function getTopTracks(token: string, filters: StatsFilter = {}): Promise<TopTrackEntry[]> {
  const { data } = await http.get(`/stats/${token}/top-tracks`, { params: filterParams(filters) });
  return data;
}

export async function getTimeline(token: string, filters: StatsFilter = {}): Promise<TimelinePoint[]> {
  const { data } = await http.get(`/stats/${token}/timeline`, { params: filterParams(filters) });
  return data;
}

export async function getHeatmap(token: string, filters: StatsFilter = {}): Promise<HeatmapResponse> {
  const { data } = await http.get(`/stats/${token}/heatmap`, { params: filterParams(filters) });
  return data;
}

export async function getTopArtistsOverTime(token: string, filters: StatsFilter = {}): Promise<ArtistTimelineResponse> {
  const { data } = await http.get(`/stats/${token}/top-artists-over-time`, { params: filterParams(filters) });
  return data;
}

export async function getTopTracksOverTime(token: string, filters: StatsFilter = {}): Promise<TrackTimelineResponse> {
  const { data } = await http.get(`/stats/${token}/top-tracks-over-time`, { params: filterParams(filters) });
  return data;
}

export async function getDiscoveryRate(token: string, filters: StatsFilter = {}): Promise<DiscoveryRatePoint[]> {
  const { data } = await http.get(`/stats/${token}/discovery`, { params: filterParams(filters) });
  return data;
}

export async function getSkippedTracks(token: string, filters: StatsFilter = {}): Promise<SkippedTrackEntry[]> {
  const { data } = await http.get(`/stats/${token}/skipped`, { params: filterParams(filters) });
  return data;
}

export async function getArtistLoyalty(token: string, filters: StatsFilter = {}): Promise<ArtistSkipRateEntry[]> {
  const { data } = await http.get(`/stats/${token}/artist-loyalty`, { params: filterParams(filters) });
  return data;
}

export async function getBackButtonTracks(token: string, filters: StatsFilter = {}): Promise<BackButtonTrackEntry[]> {
  const { data } = await http.get(`/stats/${token}/back-button`, { params: filterParams(filters) });
  return data;
}

export async function getArtistCumulative(token: string, filters: StatsFilter = {}): Promise<ArtistTimelineResponse> {
  const { data } = await http.get(`/stats/${token}/artist-cumulative`, { params: filterParams(filters) });
  return data;
}

export async function getTrackCumulative(token: string, filters: StatsFilter = {}): Promise<TrackTimelineResponse> {
  const { data } = await http.get(`/stats/${token}/track-cumulative`, { params: filterParams(filters) });
  return data;
}

export async function getContentSplit(token: string, filters: StatsFilter = {}): Promise<ContentSplitPoint[]> {
  const { data } = await http.get(`/stats/${token}/content-split`, { params: filterParams(filters) });
  return data;
}

export async function getObsessionTimeline(token: string, filters: StatsFilter = {}): Promise<ObsessionPhasePoint[]> {
  const { data } = await http.get(`/stats/${token}/obsession-timeline`, { params: filterParams(filters) });
  return data;
}

export async function getTrackObsessionTimeline(token: string, filters: StatsFilter = {}): Promise<TrackObsessionPoint[]> {
  const { data } = await http.get(`/stats/${token}/track-obsession-timeline`, { params: filterParams(filters) });
  return data;
}

export async function getSessionStamina(token: string, filters: StatsFilter = {}): Promise<SessionStaminaResponse> {
  const { data } = await http.get(`/stats/${token}/session-stamina`, { params: filterParams(filters) });
  return data;
}

export async function getArtistIntent(token: string, filters: StatsFilter = {}): Promise<ArtistIntentEntry[]> {
  const { data } = await http.get(`/stats/${token}/artist-intent`, { params: filterParams(filters) });
  return data;
}

export async function getTrackIntent(token: string, filters: StatsFilter = {}): Promise<TrackIntentEntry[]> {
  const { data } = await http.get(`/stats/${token}/track-intent`, { params: filterParams(filters) });
  return data;
}

export async function getPersonalityInputs(token: string): Promise<PersonalityInputsResponse> {
  const { data } = await http.get(`/stats/${token}/personality`);
  return data;
}

export async function getShuffleSerendipity(token: string, filters: StatsFilter = {}): Promise<ShuffleSerendipityEntry[]> {
  const { data } = await http.get(`/stats/${token}/shuffle-serendipity`, { params: filterParams(filters) });
  return data;
}

export async function getIntroTestTracks(token: string, filters: StatsFilter = {}): Promise<IntroTestEntry[]> {
  const { data } = await http.get(`/stats/${token}/intro-test`, { params: filterParams(filters) });
  return data;
}

export async function getArtistDiscovery(token: string, filters: StatsFilter = {}): Promise<ArtistDiscoveryEntry[]> {
  const { data } = await http.get(`/stats/${token}/artist-discovery`, { params: filterParams(filters) });
  return data;
}

export async function getWeekdayWeekend(token: string, filters: StatsFilter = {}): Promise<WeekdayWeekendResponse> {
  const { data } = await http.get(`/stats/${token}/weekday-weekend`, { params: filterParams(filters) });
  return data;
}

export async function getAlbumListeners(token: string, filters: StatsFilter = {}): Promise<AlbumListenerEntry[]> {
  const { data } = await http.get(`/stats/${token}/album-listeners`, { params: filterParams(filters) });
  return data;
}

export async function getSkipGraveyard(token: string, filters: StatsFilter = {}): Promise<SkipGraveyardEntry[]> {
  const { data } = await http.get(`/stats/${token}/skip-graveyard`, { params: filterParams(filters) });
  return data;
}

export async function getSeasonalArtists(token: string): Promise<SeasonalArtistEntry[]> {
  const { data } = await http.get(`/stats/${token}/seasonal-artists`);
  return data;
}

export async function getReboundArtists(token: string, filters: StatsFilter = {}): Promise<ReboundArtistEntry[]> {
  const { data } = await http.get(`/stats/${token}/rebound-artists`, { params: filterParams(filters) });
  return data;
}

export async function getMarathons(token: string, filters: StatsFilter = {}): Promise<MarathonEntry[]> {
  const { data } = await http.get(`/stats/${token}/marathons`, { params: filterParams(filters) });
  return data;
}

export async function recordPersonality(token: string, personalityId: string): Promise<void> {
  await http.post(`/stats/${token}/personality/record`, { personalityId });
}

export async function deleteSession(token: string): Promise<void> {
  await http.delete(`/stats/${token}`);
}

export async function getPersonalityDistribution(): Promise<PersonalityDistributionResponse> {
  const { data } = await http.get('/community/personality-distribution');
  return data;
}

// Community
export async function getGlobalStats(): Promise<GlobalStatsResponse> {
  const { data } = await http.get('/community/global');
  return data;
}

export async function getPercentile(token: string): Promise<PercentileResponse> {
  const { data } = await http.get(`/community/percentile/${token}`);
  return data;
}

export async function getTrendingArtists(period: string = 'alltime', limit: number = 20): Promise<TrendingArtistEntry[]> {
  const { data } = await http.get('/community/trending', { params: { period, limit: String(limit) } });
  return data;
}
