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

export interface QueryPersonalStats {
  getOverview(token: string, filters: StatsFilter): Promise<OverviewResponse | null>;
  getTopArtists(token: string, filters: StatsFilter): Promise<TopArtistEntry[] | null>;
  getTopTracks(token: string, filters: StatsFilter): Promise<TopTrackEntry[] | null>;
  getTimeline(token: string, filters: StatsFilter): Promise<TimelinePoint[] | null>;
  getHeatmap(token: string, filters: StatsFilter): Promise<HeatmapResponse | null>;
  getTopArtistsOverTime(token: string, limit: number, filters: StatsFilter): Promise<ArtistTimelineResponse | null>;
  getTopTracksOverTime(token: string, limit: number, filters: StatsFilter): Promise<TrackTimelineResponse | null>;
  getDiscoveryRate(token: string, filters: StatsFilter): Promise<DiscoveryRatePoint[] | null>;
  getSkippedTracks(token: string, limit: number): Promise<SkippedTrackEntry[] | null>;
  getArtistLoyalty(token: string, filters: StatsFilter): Promise<ArtistSkipRateEntry[] | null>;
  getBackButtonTracks(token: string, limit: number): Promise<BackButtonTrackEntry[] | null>;
  getArtistCumulative(token: string, limit: number, filters: StatsFilter): Promise<ArtistTimelineResponse | null>;
  getTrackCumulative(token: string, limit: number, filters: StatsFilter): Promise<TrackTimelineResponse | null>;
  getContentSplit(token: string, filters: StatsFilter): Promise<ContentSplitPoint[] | null>;
  getObsessionTimeline(token: string, filters: StatsFilter): Promise<ObsessionPhasePoint[] | null>;
  getTrackObsessionTimeline(token: string, filters: StatsFilter): Promise<TrackObsessionPoint[] | null>;
  getSessionStamina(token: string, filters: StatsFilter): Promise<SessionStaminaResponse | null>;
  getArtistIntent(token: string, filters: StatsFilter): Promise<ArtistIntentEntry[] | null>;
  getTrackIntent(token: string, filters: StatsFilter, limit: number): Promise<TrackIntentEntry[] | null>;
  getPersonalityInputs(token: string): Promise<PersonalityInputsResponse | null>;
  recordPersonality(token: string, personalityId: string): Promise<boolean>;
  getShuffleSerendipity(token: string, limit: number): Promise<ShuffleSerendipityEntry[] | null>;
  getIntroTestTracks(token: string, limit: number): Promise<IntroTestEntry[] | null>;
  getArtistDiscovery(token: string, filters: StatsFilter): Promise<ArtistDiscoveryEntry[] | null>;
  getWeekdayWeekend(token: string, filters: StatsFilter): Promise<WeekdayWeekendResponse | null>;
  getAlbumListeners(token: string, filters: StatsFilter): Promise<AlbumListenerEntry[] | null>;
  getSkipGraveyard(token: string, limit: number): Promise<SkipGraveyardEntry[] | null>;
  getSeasonalArtists(token: string): Promise<SeasonalArtistEntry[] | null>;
  getReboundArtists(token: string, limit: number): Promise<ReboundArtistEntry[] | null>;
  getMarathons(token: string, filters: StatsFilter): Promise<MarathonEntry[] | null>;
}
