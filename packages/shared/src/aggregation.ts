import type { SpotifyStreamEntry } from './spotify-schema.js';

// ─── Wire-format bucket types (dates as ISO strings, no integer IDs) ──────────

export interface ClientArtistBucket {
  month: string;          // "YYYY-MM-01"
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

export interface ClientTrackBucket {
  month: string;
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
  shortPlayCount: number;
  trackdoneCount: number;
  fwdSkipCount: number;
}

export interface ClientHourlyStatsBucket {
  month: string;
  dayOfWeek: number;
  hourOfDay: number;
  msPlayed: number;
  totalChainLength: number;
  chainCount: number;
}

export interface ClientTrackFirstPlay {
  spotifyTrackUri: string;
  firstPlayMonth: string;   // "YYYY-MM-01"
}

export interface ClientMonthlyTotal {
  month: string;
  playCount: number;
  msPlayed: number;
  podcastPlayCount: number;
  podcastMsPlayed: number;
  shuffleCount: number;
}

export interface ClientMarathon {
  startTime: string;        // ISO datetime
  endTime: string;
  durationMs: number;
  playCount: number;
  skipCount: number;
  skipRate: number;
  topArtist: string | null;
  topTrack: string | null;
  topTrackArtist: string | null;
  rank: number;
}

export interface ClientSessionSummary {
  totalMsPlayed: number;
  totalEntries: number;
  uniqueTracks: number;
  uniqueArtists: number;
  uniqueAlbums: number;
  dateFrom: string;         // ISO datetime
  dateTo: string;
}

export interface AggregationResult {
  summary: ClientSessionSummary;
  artistBuckets: ClientArtistBucket[];
  trackBuckets: ClientTrackBucket[];
  hourlyStatsBuckets: ClientHourlyStatsBucket[];
  trackFirstPlays: ClientTrackFirstPlay[];
  monthlyTotals: ClientMonthlyTotal[];
  marathons: ClientMarathon[];
}

// ─── Core aggregation ──────────────────────────────────────────────────────────

export function aggregateEntries(rawEntries: SpotifyStreamEntry[]): AggregationResult {
  const artistMonthly = new Map<string, {
    playCount: number; msPlayed: number; skipCount: number;
    deliberateCount: number; servedCount: number;
    weekdayPlayCount: number; weekendPlayCount: number;
    weekdaySkipCount: number; weekendSkipCount: number;
  }>();
  const trackMonthly = new Map<string, {
    trackName: string; artistName: string; albumName: string | null;
    spotifyTrackUri: string | null; playCount: number; msPlayed: number;
    skipCount: number; backCount: number; shufflePlayCount: number;
    shuffleTrackdoneCount: number; deliberateCount: number; servedCount: number;
    shortPlayCount: number; trackdoneCount: number; fwdSkipCount: number;
  }>();
  const hourlyStatsMonthly = new Map<string, { msPlayed: number; totalChainLength: number; chainCount: number }>();
  const trackFirstPlayMap = new Map<string, Date>();
  const monthlyTotals = new Map<string, {
    playCount: number; msPlayed: number;
    podcastPlayCount: number; podcastMsPlayed: number; shuffleCount: number;
  }>();

  let totalMs = 0;
  let totalEntries = 0;
  const uniqueTracks = new Set<string>();
  const uniqueArtists = new Set<string>();
  const uniqueAlbums = new Set<string>();
  let dateFrom: Date | null = null;
  let dateTo: Date | null = null;

  for (const e of rawEntries) {
    if (!e.ts || e.ms_played == null) continue;

    const ts = new Date(e.ts);
    const monthDate = new Date(Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), 1));
    const monthStr = monthDate.toISOString().slice(0, 10);
    const dow = ts.getUTCDay();
    const hour = ts.getUTCHours();
    const skipped = e.skipped ?? false;
    const wentBack = e.reason_start === 'backbtn';
    const isShufflePlay = e.shuffle === true;
    const isShuffleTrackdone = isShufflePlay && e.reason_end === 'trackdone';
    const isPodcast = !e.master_metadata_track_name && (e.episode_name != null || e.spotify_episode_uri != null);
    const isDeliberate = e.reason_start === 'clickrow' || e.reason_start === 'playbtn' || e.reason_start === 'backbtn';
    const isServed = e.reason_start === 'trackdone' || e.reason_start === 'fwdbtn';
    const isShortPlay = e.ms_played < 30000;
    const isTrackdone = e.reason_end === 'trackdone';
    const isFwdSkip = e.reason_end === 'fwdbtn';
    const isWeekend = dow === 0 || dow === 6;

    totalEntries++;
    totalMs += e.ms_played;
    if (e.spotify_track_uri) uniqueTracks.add(e.spotify_track_uri);
    if (e.master_metadata_album_artist_name) uniqueArtists.add(e.master_metadata_album_artist_name);
    if (e.master_metadata_album_album_name) uniqueAlbums.add(e.master_metadata_album_album_name);
    if (!dateFrom || ts < dateFrom) dateFrom = ts;
    if (!dateTo || ts > dateTo) dateTo = ts;

    if (e.master_metadata_album_artist_name) {
      const key = `${monthStr}|${e.master_metadata_album_artist_name}`;
      const existing = artistMonthly.get(key);
      if (existing) {
        existing.playCount++;
        existing.msPlayed += e.ms_played;
        if (skipped) existing.skipCount++;
        if (isDeliberate) existing.deliberateCount++;
        if (isServed) existing.servedCount++;
        if (isWeekend) { existing.weekendPlayCount++; if (skipped) existing.weekendSkipCount++; }
        else { existing.weekdayPlayCount++; if (skipped) existing.weekdaySkipCount++; }
      } else {
        artistMonthly.set(key, {
          playCount: 1, msPlayed: e.ms_played,
          skipCount: skipped ? 1 : 0,
          deliberateCount: isDeliberate ? 1 : 0,
          servedCount: isServed ? 1 : 0,
          weekdayPlayCount: isWeekend ? 0 : 1,
          weekendPlayCount: isWeekend ? 1 : 0,
          weekdaySkipCount: !isWeekend && skipped ? 1 : 0,
          weekendSkipCount: isWeekend && skipped ? 1 : 0,
        });
      }
    }

    if (e.master_metadata_track_name && e.master_metadata_album_artist_name) {
      const key = `${monthStr}|${e.master_metadata_track_name}|${e.master_metadata_album_artist_name}`;
      const existing = trackMonthly.get(key);
      if (existing) {
        existing.playCount++;
        existing.msPlayed += e.ms_played;
        if (skipped) existing.skipCount++;
        if (wentBack) existing.backCount++;
        if (isShufflePlay) existing.shufflePlayCount++;
        if (isShuffleTrackdone) existing.shuffleTrackdoneCount++;
        if (isDeliberate) existing.deliberateCount++;
        if (isServed) existing.servedCount++;
        if (isShortPlay) existing.shortPlayCount++;
        if (isTrackdone) existing.trackdoneCount++;
        if (isFwdSkip) existing.fwdSkipCount++;
      } else {
        trackMonthly.set(key, {
          trackName: e.master_metadata_track_name,
          artistName: e.master_metadata_album_artist_name,
          albumName: e.master_metadata_album_album_name,
          spotifyTrackUri: e.spotify_track_uri,
          playCount: 1, msPlayed: e.ms_played,
          skipCount: skipped ? 1 : 0,
          backCount: wentBack ? 1 : 0,
          shufflePlayCount: isShufflePlay ? 1 : 0,
          shuffleTrackdoneCount: isShuffleTrackdone ? 1 : 0,
          deliberateCount: isDeliberate ? 1 : 0,
          servedCount: isServed ? 1 : 0,
          shortPlayCount: isShortPlay ? 1 : 0,
          trackdoneCount: isTrackdone ? 1 : 0,
          fwdSkipCount: isFwdSkip ? 1 : 0,
        });
      }
    }

    const heatKey = `${monthStr}:${dow}:${hour}`;
    const existingHourly = hourlyStatsMonthly.get(heatKey);
    if (existingHourly) {
      existingHourly.msPlayed += e.ms_played;
    } else {
      hourlyStatsMonthly.set(heatKey, { msPlayed: e.ms_played, totalChainLength: 0, chainCount: 0 });
    }

    if (e.spotify_track_uri) {
      const existing = trackFirstPlayMap.get(e.spotify_track_uri);
      if (!existing || ts < existing) trackFirstPlayMap.set(e.spotify_track_uri, ts);
    }

    const mt = monthlyTotals.get(monthStr);
    if (mt) {
      mt.playCount++;
      mt.msPlayed += e.ms_played;
      if (isPodcast) { mt.podcastPlayCount++; mt.podcastMsPlayed += e.ms_played; }
      if (isShufflePlay) mt.shuffleCount++;
    } else {
      monthlyTotals.set(monthStr, {
        playCount: 1, msPlayed: e.ms_played,
        podcastPlayCount: isPodcast ? 1 : 0,
        podcastMsPlayed: isPodcast ? e.ms_played : 0,
        shuffleCount: isShufflePlay ? 1 : 0,
      });
    }
  }

  // Session stamina — consecutive trackdone chains
  const sorted = rawEntries
    .filter(e => e.ts && e.ms_played != null)
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  if (sorted.length > 0) {
    let chainStartTs = new Date(sorted[0].ts);
    let chainLength = 1;

    const recordChain = (startTs: Date, length: number) => {
      const m = new Date(Date.UTC(startTs.getUTCFullYear(), startTs.getUTCMonth(), 1));
      const key = `${m.toISOString().slice(0, 10)}:${startTs.getUTCDay()}:${startTs.getUTCHours()}`;
      const existing = hourlyStatsMonthly.get(key);
      if (existing) {
        existing.totalChainLength += length;
        existing.chainCount++;
      } else {
        hourlyStatsMonthly.set(key, { msPlayed: 0, totalChainLength: length, chainCount: 1 });
      }
    };

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].reason_start === 'trackdone') {
        chainLength++;
      } else {
        recordChain(chainStartTs, chainLength);
        chainStartTs = new Date(sorted[i].ts);
        chainLength = 1;
      }
    }
    recordChain(chainStartTs, chainLength);
  }

  // Marathon detection
  const MARATHON_GAP_MS = 30 * 60 * 1000;
  const MARATHON_MIN_TRACKS = 3;
  const MARATHON_MIN_DURATION_MS = 30 * 60 * 1000;
  const allMarathons: ClientMarathon[] = [];

  if (sorted.length > 0) {
    let sessionStartMs = new Date(sorted[0].ts).getTime() - (sorted[0].ms_played ?? 0);
    let sessionEntries: typeof sorted = [sorted[0]];

    const finalizeSession = () => {
      const last = sessionEntries[sessionEntries.length - 1];
      const endMs = new Date(last.ts).getTime();
      const durationMs = endMs - sessionStartMs;
      if (sessionEntries.length < MARATHON_MIN_TRACKS || durationMs < MARATHON_MIN_DURATION_MS) return;

      let plays = 0;
      let skips = 0;
      const artistMs = new Map<string, number>();
      const trackPlays = new Map<string, { track: string; artist: string; plays: number }>();

      for (const e of sessionEntries) {
        plays++;
        if (e.skipped) skips++;
        if (e.master_metadata_album_artist_name) {
          artistMs.set(
            e.master_metadata_album_artist_name,
            (artistMs.get(e.master_metadata_album_artist_name) ?? 0) + (e.ms_played ?? 0),
          );
        }
        if (e.master_metadata_track_name && e.master_metadata_album_artist_name) {
          const key = `${e.master_metadata_track_name}\0${e.master_metadata_album_artist_name}`;
          const existing = trackPlays.get(key);
          if (existing) { existing.plays++; }
          else { trackPlays.set(key, { track: e.master_metadata_track_name, artist: e.master_metadata_album_artist_name, plays: 1 }); }
        }
      }

      let topArtist: string | null = null;
      let topArtistMs = 0;
      for (const [name, ms] of artistMs) {
        if (ms > topArtistMs) { topArtistMs = ms; topArtist = name; }
      }

      let topTrack: string | null = null;
      let topTrackArtist: string | null = null;
      let topTrackPlays = 0;
      for (const v of trackPlays.values()) {
        if (v.plays > topTrackPlays) { topTrackPlays = v.plays; topTrack = v.track; topTrackArtist = v.artist; }
      }

      const skipRate = plays > 0 ? Math.round(skips / plays * 1000) / 10 : 0;
      allMarathons.push({
        startTime: new Date(sessionStartMs).toISOString(),
        endTime: new Date(endMs).toISOString(),
        durationMs, playCount: plays, skipCount: skips, skipRate,
        topArtist, topTrack, topTrackArtist, rank: 0,
      });
    };

    for (let i = 1; i < sorted.length; i++) {
      const startOfCurrent = new Date(sorted[i].ts).getTime() - (sorted[i].ms_played ?? 0);
      const endOfPrevious = new Date(sorted[i - 1].ts).getTime();
      const gap = Math.max(0, startOfCurrent - endOfPrevious);
      if (gap > MARATHON_GAP_MS) {
        finalizeSession();
        sessionStartMs = new Date(sorted[i].ts).getTime() - (sorted[i].ms_played ?? 0);
        sessionEntries = [sorted[i]];
      } else {
        sessionEntries.push(sorted[i]);
      }
    }
    finalizeSession();
  }

  allMarathons.sort((a, b) => b.durationMs - a.durationMs);
  for (let i = 0; i < allMarathons.length; i++) allMarathons[i].rank = i + 1;

  // Convert maps to arrays
  const artistBuckets: ClientArtistBucket[] = [];
  for (const [key, val] of artistMonthly) {
    const [monthStr, artistName] = key.split('|');
    artistBuckets.push({ month: monthStr, artistName, ...val });
  }

  const trackBuckets: ClientTrackBucket[] = [];
  for (const [key, val] of trackMonthly) {
    const monthStr = key.split('|')[0];
    trackBuckets.push({ month: monthStr, ...val });
  }

  const hourlyStatsBuckets: ClientHourlyStatsBucket[] = [];
  for (const [key, val] of hourlyStatsMonthly) {
    const [monthStr, dowStr, hourStr] = key.split(':');
    hourlyStatsBuckets.push({
      month: monthStr,
      dayOfWeek: Number(dowStr),
      hourOfDay: Number(hourStr),
      ...val,
    });
  }

  const trackFirstPlays: ClientTrackFirstPlay[] = [];
  for (const [uri, date] of trackFirstPlayMap) {
    const firstPlayMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);
    trackFirstPlays.push({ spotifyTrackUri: uri, firstPlayMonth });
  }

  const monthlyTotalBuckets: ClientMonthlyTotal[] = [];
  for (const [monthStr, val] of monthlyTotals) {
    monthlyTotalBuckets.push({ month: monthStr, ...val });
  }

  const now = new Date();
  return {
    summary: {
      totalMsPlayed: totalMs,
      totalEntries,
      uniqueTracks: uniqueTracks.size,
      uniqueArtists: uniqueArtists.size,
      uniqueAlbums: uniqueAlbums.size,
      dateFrom: (dateFrom ?? now).toISOString(),
      dateTo: (dateTo ?? now).toISOString(),
    },
    artistBuckets,
    trackBuckets,
    hourlyStatsBuckets,
    trackFirstPlays,
    monthlyTotals: monthlyTotalBuckets,
    marathons: allMarathons,
  };
}
