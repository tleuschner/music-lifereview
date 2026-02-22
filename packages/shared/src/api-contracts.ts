// ─── Upload ─────────────────────────────────────────────

export interface UploadResponse {
  shareToken: string;
  status: UploadStatus;
}

export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed';

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
