import axios from 'axios';
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
import { PII_FIELDS } from '@music-livereview/shared';

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

async function sha256hex(text: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Upload — strips PII in the browser before sending.
// The username is hashed (SHA-256) and sent as a separate field for deduplication;
// the raw value never leaves the browser.
export async function uploadFiles(files: File[], optOut: boolean): Promise<{ shareToken: string; status: string }> {
  const form = new FormData();
  let userHash: string | null = null;

  for (const file of files) {
    const entries = JSON.parse(await file.text()) as Record<string, unknown>[];

    // Hash username from the first entry that has one (before stripping)
    if (!userHash) {
      const firstUsername = entries.find(e => typeof e.username === 'string')?.username as string | undefined;
      if (firstUsername) {
        userHash = await sha256hex(firstUsername);
      }
    }

    // Strip all PII fields in-browser before sending
    const cleaned = entries.map(entry => {
      const e = { ...entry };
      for (const field of PII_FIELDS) delete e[field as string];
      return e;
    });

    form.append('files', new Blob([JSON.stringify(cleaned)], { type: 'application/json' }), file.name);
  }

  if (userHash) form.append('userHash', userHash);
  form.append('optOut', String(optOut));

  const { data } = await http.post('/upload', form);
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
