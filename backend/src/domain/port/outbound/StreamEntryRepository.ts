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
  artistName: string;
  playCount: number;
  msPlayed: number;
  skipCount: number;
}

export interface MonthlyTrackBucket {
  month: Date;
  trackName: string;
  artistName: string;
  albumName: string | null;
  spotifyTrackUri: string | null;
  playCount: number;
  msPlayed: number;
  skipCount: number;
  backCount: number;
}

export interface BackButtonRow {
  trackName: string;
  artistName: string;
  backCount: number;
  totalPlays: number;
  replayRate: number;
}

export interface MonthlyHeatmapBucket {
  month: Date;
  dayOfWeek: number;
  hourOfDay: number;
  msPlayed: number;
}

export interface TrackFirstPlay {
  spotifyTrackUri: string;
  firstPlayMonth: Date;
}

export interface MonthlyTotalBucket {
  month: Date;
  playCount: number;
  msPlayed: number;
}

export interface AggregatedIngestData {
  artistBuckets: MonthlyArtistBucket[];
  trackBuckets: MonthlyTrackBucket[];
  heatmapBuckets: MonthlyHeatmapBucket[];
  trackFirstPlays: TrackFirstPlay[];
  monthlyTotals: MonthlyTotalBucket[];
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
  getDiscoveryRate(sessionId: string, filters: StatsFilter): Promise<DiscoveryRow[]>;
  getSkippedTracks(sessionId: string, limit: number): Promise<SkippedRow[]>;
  getArtistSkipRates(sessionId: string, filters: StatsFilter): Promise<ArtistSkipRateRow[]>;
  getBackButtonTracks(sessionId: string, limit: number): Promise<BackButtonRow[]>;
  getArtistCumulative(sessionId: string, limit: number, filters: StatsFilter): Promise<{ periods: string[]; artists: Array<{ name: string; values: number[] }> }>;
}
