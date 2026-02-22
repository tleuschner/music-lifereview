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

export interface QueryPersonalStats {
  getOverview(token: string, filters: StatsFilter): Promise<OverviewResponse | null>;
  getTopArtists(token: string, filters: StatsFilter): Promise<TopArtistEntry[] | null>;
  getTopTracks(token: string, filters: StatsFilter): Promise<TopTrackEntry[] | null>;
  getTimeline(token: string, filters: StatsFilter): Promise<TimelinePoint[] | null>;
  getHeatmap(token: string, filters: StatsFilter): Promise<HeatmapResponse | null>;
  getTopArtistsOverTime(token: string, limit: number, filters: StatsFilter): Promise<ArtistTimelineResponse | null>;
  getDiscoveryRate(token: string, filters: StatsFilter): Promise<DiscoveryRatePoint[] | null>;
  getSkippedTracks(token: string, limit: number): Promise<SkippedTrackEntry[] | null>;
  getArtistLoyalty(token: string, filters: StatsFilter): Promise<ArtistSkipRateEntry[] | null>;
  getBackButtonTracks(token: string, limit: number): Promise<BackButtonTrackEntry[] | null>;
  getArtistCumulative(token: string, limit: number, filters: StatsFilter): Promise<ArtistTimelineResponse | null>;
  getContentSplit(token: string, filters: StatsFilter): Promise<ContentSplitPoint[] | null>;
  getObsessionTimeline(token: string, filters: StatsFilter): Promise<ObsessionPhasePoint[] | null>;
  getSessionStamina(token: string, filters: StatsFilter): Promise<SessionStaminaResponse | null>;
}
