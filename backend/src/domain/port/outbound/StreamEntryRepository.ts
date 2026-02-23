import type { StatsFilter } from '@music-livereview/shared';

export interface ArtistStatRow {
  artistName: string;
  playCount: number;
  totalMs: number;
}

export interface TrackStatRow {
  trackName: string;
  artistName: string;
  playCount: number;
  totalMs: number;
}

export interface TimelineRow {
  period: string;
  totalMs: number;
  totalPlays: number;
}

export interface HeatmapRow {
  dayOfWeek: number;
  hourOfDay: number;
  totalMs: number;
}

export interface DiscoveryRow {
  period: string;
  newSongs: number;
  repeats: number;
}

export interface SkippedRow {
  trackName: string;
  artistName: string;
  skipCount: number;
  totalPlays: number;
  skipRate: number;
  avgListenSec: number;
}

export interface ArtistSkipRateRow {
  artistName: string;
  totalPlays: number;
  totalSkips: number;
  skipRate: number;
}

export interface SessionSummary {
  totalMsPlayed: number;
  totalEntries: number;
  uniqueTracks: number;
  uniqueArtists: number;
  uniqueAlbums: number;
  dateFrom: Date;
  dateTo: Date;
}

export interface MonthlyArtistBucket {
  month: Date;
  artistId: number;
  artistName: string;
  playCount: number;
  msPlayed: number;
  skipCount: number;
  deliberateCount: number;
  servedCount: number;
  weekdayPlayCount: number;
  weekendPlayCount: number;
  weekdaySkipCount: number;
  weekendSkipCount: number;
}

export interface MonthlyTrackBucket {
  month: Date;
  trackId: number;
  artistId: number;
  trackName: string;
  artistName: string;
  albumName: string | null;
  spotifyTrackUri: string | null;
  playCount: number;
  msPlayed: number;
  skipCount: number;
  backCount: number;
  shufflePlayCount: number;
  shuffleTrackdoneCount: number;
  deliberateCount: number;
  servedCount: number;
  shortPlayCount: number;   // plays where ms_played < 30 000 ms
  trackdoneCount: number;   // plays where reason_end = 'trackdone'
  fwdSkipCount: number;     // plays where reason_end = 'fwdbtn'
}

export interface ShuffleSerendipityRow {
  trackName: string;
  artistName: string;
  shufflePlays: number;
  completionRate: number;
  totalPlays: number;
}

export interface IntroTestRow {
  trackName: string;
  artistName: string;
  totalPlays: number;
  shortPlayCount: number;
  completionCount: number;
}

export interface ArtistDiscoveryRow {
  artistName: string;
  discoveryYear: number;
  totalMs: number;
}

export interface WeekdayWeekendSliceRow {
  totalMs: number;
  avgSessionLength: number;
  skipRate: number;
  topArtists: Array<{ name: string; playCount: number }>;
}

export interface WeekdayWeekendRow {
  weekday: WeekdayWeekendSliceRow;
  weekend: WeekdayWeekendSliceRow;
}

export interface BackButtonRow {
  trackName: string;
  artistName: string;
  backCount: number;
  totalPlays: number;
  replayRate: number;
}

export interface MonthlyHourlyStatsBucket {
  month: Date;
  dayOfWeek: number;
  hourOfDay: number;
  msPlayed: number;
  totalChainLength: number;
  chainCount: number;
}

export interface TrackFirstPlay {
  trackId: number;
  firstPlayMonth: Date;
}

export interface MonthlyTotalBucket {
  month: Date;
  playCount: number;
  msPlayed: number;
  podcastPlayCount: number;
  podcastMsPlayed: number;
  shuffleCount: number;
}

export interface SkipGraveyardRow {
  trackName: string;
  artistName: string;
  fwdSkipCount: number;
  totalPlays: number;
  fwdSkipRate: number;
  avgListenSec: number;
}

export interface SeasonalArtistRow {
  artistName: string;
  season: string;
  peakPlays: number;
  totalPlays: number;
  peakPct: number;
  activeYears: number;
}

export interface ReboundArtistRow {
  artistName: string;
  peakMonth: string;
  peakPlays: number;
  cooldownMonths: number;
  revivalMonth: string;
  revivalPlays: number;
  reboundScore: number;
}

export interface AlbumListenerRow {
  artistName: string;
  totalPlays: number;
  uniqueTracks: number;
  albumCount: number;
  topTrackName: string;
  topTrackPct: number;
  avgTracksPerAlbum: number;
}

export interface PersonalityInputsRow {
  hourTotals: number[];
  top10ArtistMsPct: number;
  globalSkipRate: number;
  avgChainLength: number;
  shuffleRate: number;
  uniqueArtistCount: number;
}

export interface ContentSplitRow {
  period: string;
  musicMs: number;
  podcastMs: number;
  musicPlays: number;
  podcastPlays: number;
}

export interface ObsessionPhaseRow {
  period: string;
  artistName: string;
  artistMs: number;
  totalMs: number;
  percentage: number;
}

export interface ArtistIntentRow {
  artistName: string;
  totalPlays: number;
  deliberatePlays: number;
  servedPlays: number;
  deliberateRate: number;
}

export interface TrackIntentRow {
  trackName: string;
  artistName: string;
  totalPlays: number;
  deliberatePlays: number;
  servedPlays: number;
  deliberateRate: number;
}

export interface StaminaRow {
  dayOfWeek: number;
  hourOfDay: number;
  totalChainLength: number;
  chainCount: number;
}

export interface MarathonBucket {
  startTime: Date;
  endTime: Date;
  durationMs: number;   // wall-clock duration (endTime - startTime)
  playCount: number;
  skipCount: number;
  skipRate: number;     // 0–100
  topArtist: string | null;
  topTrack: string | null;
  topTrackArtist: string | null;
  rank: number;         // 1–10
}

export interface MarathonRow {
  startTime: Date;
  endTime: Date;
  durationMs: number;
  playCount: number;
  skipCount: number;
  skipRate: number;
  topArtist: string | null;
  topTrack: string | null;
  topTrackArtist: string | null;
  rank: number;
}

export interface AggregatedIngestData {
  artistBuckets: MonthlyArtistBucket[];
  trackBuckets: MonthlyTrackBucket[];
  hourlyStatsBuckets: MonthlyHourlyStatsBucket[];
  trackFirstPlays: TrackFirstPlay[];
  monthlyTotals: MonthlyTotalBucket[];
  marathons: MarathonBucket[];
}

export interface StreamEntryRepository {
  saveAggregatedData(sessionId: string, data: AggregatedIngestData): Promise<void>;
  saveSessionSummary(sessionId: string, summary: SessionSummary): Promise<void>;
  getSessionSummary(sessionId: string): Promise<SessionSummary | null>;

  getTopArtists(sessionId: string, filters: StatsFilter): Promise<ArtistStatRow[]>;
  getTopTracks(sessionId: string, filters: StatsFilter): Promise<TrackStatRow[]>;
  getTimeline(sessionId: string, filters: StatsFilter): Promise<TimelineRow[]>;
  getHeatmap(sessionId: string, filters: StatsFilter): Promise<HeatmapRow[]>;
  getTopArtistsOverTime(sessionId: string, limit: number, filters: StatsFilter): Promise<{ periods: string[]; artists: Array<{ name: string; values: number[] }> }>;
  getTopTracksOverTime(sessionId: string, limit: number, filters: StatsFilter): Promise<{ periods: string[]; tracks: Array<{ name: string; artistName: string; values: number[] }> }>;
  getDiscoveryRate(sessionId: string, filters: StatsFilter): Promise<DiscoveryRow[]>;
  getSkippedTracks(sessionId: string, limit: number): Promise<SkippedRow[]>;
  getArtistSkipRates(sessionId: string, filters: StatsFilter): Promise<ArtistSkipRateRow[]>;
  getBackButtonTracks(sessionId: string, limit: number): Promise<BackButtonRow[]>;
  getArtistCumulative(sessionId: string, limit: number, filters: StatsFilter): Promise<{ periods: string[]; artists: Array<{ name: string; values: number[] }> }>;
  getTrackCumulative(sessionId: string, limit: number, filters: StatsFilter): Promise<{ periods: string[]; tracks: Array<{ name: string; artistName: string; values: number[] }> }>;
  getContentSplit(sessionId: string, filters: StatsFilter): Promise<ContentSplitRow[]>;
  getObsessionTimeline(sessionId: string, filters: StatsFilter): Promise<ObsessionPhaseRow[]>;
  getSessionStamina(sessionId: string, filters: StatsFilter): Promise<StaminaRow[]>;
  getArtistIntent(sessionId: string, filters: StatsFilter): Promise<ArtistIntentRow[]>;
  getTrackIntent(sessionId: string, filters: StatsFilter, limit: number): Promise<TrackIntentRow[]>;
  getPersonalityInputs(sessionId: string): Promise<PersonalityInputsRow>;
  getShuffleSerendipity(sessionId: string, limit: number): Promise<ShuffleSerendipityRow[]>;
  getIntroTestTracks(sessionId: string, limit: number): Promise<IntroTestRow[]>;
  getArtistDiscovery(sessionId: string, filters: StatsFilter): Promise<ArtistDiscoveryRow[]>;
  getWeekdayWeekend(sessionId: string, filters: StatsFilter): Promise<WeekdayWeekendRow>;
  getAlbumListeners(sessionId: string, filters: StatsFilter): Promise<AlbumListenerRow[]>;
  getSkipGraveyard(sessionId: string, limit: number): Promise<SkipGraveyardRow[]>;
  getSeasonalArtists(sessionId: string): Promise<SeasonalArtistRow[]>;
  getReboundArtists(sessionId: string, limit: number): Promise<ReboundArtistRow[]>;
  getMarathons(sessionId: string, filters: StatsFilter): Promise<MarathonRow[]>;

  upsertArtistCatalog(artists: Array<{ artistName: string }>): Promise<Map<string, number>>;
  upsertTrackCatalog(tracks: Array<{ trackName: string; artistName: string; albumName: string | null; spotifyTrackUri: string | null }>, artistIdMap: Map<string, number>): Promise<Map<string, number>>;

  upsertPersonalityRecord(sessionId: string, personalityId: string): Promise<void>;
  getPersonalityDistribution(): Promise<Array<{ personalityId: string; count: number }>>;
}
