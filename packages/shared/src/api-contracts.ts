// ─── Upload ─────────────────────────────────────────────

export interface UploadResponse {
  shareToken: string;
  status: UploadStatus;
}

export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** POST /api/upload — body sent by the browser after client-side aggregation */
export interface UploadAggregatedRequest {
  optOut: boolean;
  userHash: string | null;
  summary: {
    totalMsPlayed: number; totalEntries: number;
    uniqueTracks: number; uniqueArtists: number; uniqueAlbums: number;
    dateFrom: string; dateTo: string;
  };
  artistBuckets: Array<{
    month: string; artistName: string; playCount: number; msPlayed: number;
    skipCount: number; deliberateCount: number; servedCount: number;
    weekdayPlayCount: number; weekendPlayCount: number;
    weekdaySkipCount: number; weekendSkipCount: number;
  }>;
  trackBuckets: Array<{
    month: string; trackName: string; artistName: string;
    albumName: string | null; spotifyTrackUri: string | null;
    playCount: number; msPlayed: number; skipCount: number; backCount: number;
    shufflePlayCount: number; shuffleTrackdoneCount: number;
    deliberateCount: number; servedCount: number;
    shortPlayCount: number; trackdoneCount: number; fwdSkipCount: number;
  }>;
  hourlyStatsBuckets: Array<{
    month: string; dayOfWeek: number; hourOfDay: number;
    msPlayed: number; totalChainLength: number; chainCount: number;
  }>;
  trackFirstPlays: Array<{ spotifyTrackUri: string; firstPlayMonth: string }>;
  monthlyTotals: Array<{
    month: string; playCount: number; msPlayed: number;
    podcastPlayCount: number; podcastMsPlayed: number; shuffleCount: number;
  }>;
  marathons: Array<{
    startTime: string; endTime: string; durationMs: number;
    playCount: number; skipCount: number; skipRate: number;
    topArtist: string | null; topTrack: string | null; topTrackArtist: string | null;
    rank: number;
  }>;
}

export interface StatusResponse {
  status: UploadStatus;
  entryCount?: number;
  dateFrom?: string;
  dateTo?: string;
}

// ─── Filters ────────────────────────────────────────────

export interface StatsFilter {
  from?: string;
  to?: string;
  artist?: string;
  limit?: number;
  sort?: 'hours' | 'count';
}

// ─── Personal Stats ─────────────────────────────────────

export interface OverviewResponse {
  totalHours: number;
  totalDays: number;
  totalPlays: number;
  uniqueTracks: number;
  uniqueArtists: number;
  uniqueAlbums: number;
  dateFrom: string;
  dateTo: string;
}

export interface TopArtistEntry {
  name: string;
  playCount: number;
  totalHours: number;
}

export interface TopTrackEntry {
  name: string;
  artistName: string;
  playCount: number;
  totalHours: number;
}

export interface TimelinePoint {
  period: string;
  totalHours: number;
  totalPlays: number;
}

export interface HeatmapResponse {
  /** 7 rows (Mon–Sun) × 24 cols (0–23h) */
  data: number[][];
}

export interface ArtistTimelineResponse {
  periods: string[];
  artists: Array<{
    name: string;
    values: number[];
  }>;
}

export interface TrackTimelineResponse {
  periods: string[];
  tracks: Array<{
    name: string;       // track name
    artistName: string; // artist name
    values: number[];   // hours per period
  }>;
}

export interface DiscoveryRatePoint {
  period: string;
  newSongs: number;
  repeats: number;
  discoveryRate: number;
}

export interface SkippedTrackEntry {
  name: string;
  artistName: string;
  skipCount: number;
  totalPlays: number;
  skipRate: number;     // 0–100 percentage
  avgListenSec: number; // average seconds listened per play before stopping
}

export interface ArtistSkipRateEntry {
  name: string;
  totalPlays: number;
  totalSkips: number;
  skipRate: number; // 0–100 percentage
}

export interface BackButtonTrackEntry {
  name: string;
  artistName: string;
  backCount: number;   // times replayed via back button
  totalPlays: number;
  replayRate: number;  // backCount / totalPlays × 100
}

export interface ContentSplitPoint {
  period: string;       // "YYYY-MM"
  musicHours: number;
  podcastHours: number;
  musicPlays: number;
  podcastPlays: number;
}

export interface ObsessionPhasePoint {
  period: string;       // "YYYY-MM"
  artistName: string;   // the dominant artist that month
  artistHours: number;  // hours listened to that artist
  totalHours: number;   // total listening hours that month
  percentage: number;   // artistHours / totalHours × 100 (always >= 40)
}

export interface SessionStaminaResponse {
  /** 7 rows (Mon–Sun) × 24 cols (0–23h), each cell = average chain length */
  data: number[][];
  overallAverage: number;
}

export interface ArtistIntentEntry {
  name: string;
  totalPlays: number;
  deliberatePlays: number; // reason_start: clickrow / playbtn / backbtn
  servedPlays: number;     // reason_start: trackdone / fwdbtn
  deliberateRate: number;  // deliberatePlays / (deliberatePlays + servedPlays) × 100
}

export interface TrackIntentEntry {
  name: string;
  artistName: string;
  totalPlays: number;
  deliberatePlays: number; // reason_start: clickrow / playbtn / backbtn
  servedPlays: number;     // reason_start: trackdone / fwdbtn
  deliberateRate: number;  // deliberatePlays / (deliberatePlays + servedPlays) × 100
}

export interface ShuffleSerendipityEntry {
  name: string;
  artistName: string;
  shufflePlays: number;    // plays where shuffle = true
  completionRate: number;  // shuffle_trackdone / shuffle_plays × 100 (0–100)
  totalPlays: number;
}

export interface IntroTestEntry {
  name: string;
  artistName: string;
  totalPlays: number;
  shortPlayCount: number;    // plays where ms_played < 30s
  completionCount: number;   // plays where reason_end = 'trackdone'
}

export interface ArtistDiscoveryEntry {
  name: string;
  discoveryYear: number;   // year of first play (all-time)
  totalHours: number;
}

export interface WeekdayWeekendSlice {
  totalHours: number;
  avgSessionLength: number;   // avg consecutive-trackdone chain length (songs per session)
  skipRate: number;            // 0–100 percentage
  topArtists: Array<{ name: string; playCount: number }>;
}

export interface WeekdayWeekendResponse {
  weekday: WeekdayWeekendSlice;
  weekend: WeekdayWeekendSlice;
}

export interface SkipGraveyardEntry {
  name: string;
  artistName: string;
  fwdSkipCount: number;  // times forward-skipped (reason_end = fwdbtn)
  totalPlays: number;
  fwdSkipRate: number;   // fwdSkipCount / totalPlays × 100 (0–100)
  avgListenSec: number;  // average seconds listened before being forward-skipped
}

export interface SeasonalArtistEntry {
  name: string;
  season: 'Winter' | 'Spring' | 'Summer' | 'Fall';
  peakPlays: number;    // plays in peak season (across all years)
  totalPlays: number;   // all-time plays
  peakPct: number;      // peakPlays / totalPlays × 100
  activeYears: number;  // distinct years where they had plays in their peak season
}

export interface ReboundArtistEntry {
  artistName: string;
  peakMonth: string;       // YYYY-MM — last high-activity month before gap
  peakPlays: number;
  cooldownMonths: number;  // months of silence between peak and revival
  revivalMonth: string;    // YYYY-MM — first month back
  revivalPlays: number;
  reboundScore: number;    // peak_plays × cooldown_months × revival_plays
}

export interface MarathonEntry {
  rank: number;
  date: string;            // "YYYY-MM-DD" UTC date of session start
  durationMinutes: number; // wall-clock duration in minutes
  playCount: number;       // number of tracks in the session
  skipRate: number;        // 0–100 percentage
  mood: string;            // "In the Zone" | "Exploratory" | "Restless"
  topArtist: string | null;
  topTrack: string | null;
  topTrackArtist: string | null;
}

export interface AlbumListenerEntry {
  name: string;
  totalPlays: number;
  uniqueTracks: number;        // distinct tracks ever played
  albumCount: number;          // distinct albums played from
  topTrackName: string;        // the single most-played track
  topTrackPct: number;         // topTrack plays / totalPlays × 100 (0–100)
  avgTracksPerAlbum: number;   // uniqueTracks / albumCount — depth of exploration
}

export interface PersonalityInputsResponse {
  /** Total ms_played per hour of day (index 0 = midnight, 23 = 11pm) */
  hourTotals: number[];
  /** % of total listening time accounted for by the top 10 artists (0–100) */
  top10ArtistMsPct: number;
  /** Skipped tracks / total music plays × 100 (0–100) */
  globalSkipRate: number;
  /** Average consecutive-trackdone chain length (proxy for session length in songs) */
  avgChainLength: number;
  /** Shuffled plays / total plays × 100 (0–100) */
  shuffleRate: number;
  /** Total unique artists in the user's history */
  uniqueArtistCount: number;
}

// ─── Personality Distribution ────────────────────────────

export interface PersonalityDistributionEntry {
  personalityId: string;
  count: number;
  percentage: number; // 0–100, rounded to 1 decimal
}

export interface PersonalityDistributionResponse {
  entries: PersonalityDistributionEntry[];
  total: number;
}

// ─── Community Stats ────────────────────────────────────

export interface GlobalStatsResponse {
  totalUploads: number;
  avgTotalHours: number;
  medianTotalHours: number;
  avgUniqueArtists: number;
  avgUniqueTracks: number;
  topGlobalArtists: Array<{ name: string; uploadCount: number }>;
}

export interface PercentileResponse {
  totalHoursPercentile: number;
  uniqueArtistsPercentile: number;
  uniqueTracksPercentile: number;
}

export interface TrendingArtistEntry {
  name: string;
  uploadCount: number;
  totalPlays: number;
}
