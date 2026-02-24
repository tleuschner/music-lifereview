import { MS_PER_HOUR } from '@music-livereview/shared';
import type { OgPreviewData } from '@music-livereview/shared';
import type { GenerateOgPreview } from '../domain/port/inbound/GenerateOgPreview.js';
import type { UploadSessionRepository } from '../domain/port/outbound/UploadSessionRepository.js';
import type { StreamEntryRepository } from '../domain/port/outbound/StreamEntryRepository.js';

export class GenerateOgPreviewUseCase implements GenerateOgPreview {
  constructor(
    private readonly sessionRepo: UploadSessionRepository,
    private readonly entryRepo: StreamEntryRepository,
  ) {}

  async getPreviewData(token: string): Promise<OgPreviewData | null> {
    const session = await this.sessionRepo.findByToken(token);
    if (!session || session.status !== 'completed') return null;

    const [summary, topArtists, topTracks, marathons, timeline] = await Promise.all([
      this.entryRepo.getSessionSummary(session.id),
      this.entryRepo.getTopArtists(session.id, {}),
      this.entryRepo.getTopTracks(session.id, {}),
      this.entryRepo.getMarathons(session.id, {}),
      this.entryRepo.getTimeline(session.id, {}),
    ]);

    if (!summary) return null;

    const totalHours = Math.round(summary.totalMsPlayed / MS_PER_HOUR);
    const totalDays = Math.round(totalHours / 24);
    const topArtist = topArtists.length > 0 ? topArtists[0].artistName : null;
    const topTrack = topTracks.length > 0 ? topTracks[0].trackName : null;
    const topTrackPlays = topTracks.length > 0 ? topTracks[0].playCount : null;
    const longestMarathon = marathons.length > 0 ? marathons[0] : null;
    const marathonHours = longestMarathon
      ? Math.round((longestMarathon.durationMs / 3_600_000) * 10) / 10
      : 0;

    const dateRange = formatDateRange(summary.dateFrom, summary.dateTo);
    const timelineValues = buildTimelineValues(timeline.map((r) => r.totalMs));

    let headline: string;
    let subline: string;

    if (totalHours >= 5000) {
      headline = `Listened to ${totalHours.toLocaleString('en')} hours of music`;
      subline = `That's ${totalDays} days straight`;
    } else if (marathonHours >= 8) {
      headline = `${marathonHours}-hour listening marathon in one sitting`;
      subline = longestMarathon?.topArtist
        ? `Top artist: ${longestMarathon.topArtist}`
        : `${longestMarathon!.playCount} tracks played`;
    } else if (summary.uniqueArtists >= 3000) {
      headline = `Explored ${summary.uniqueArtists.toLocaleString('en')} different artists`;
      subline = `Across ${dateRange}`;
    } else if (totalHours >= 1000) {
      headline = `Listened to ${totalHours.toLocaleString('en')} hours of music`;
      subline = `That's ${totalDays} days straight`;
    } else {
      headline = `Listened to ${totalHours.toLocaleString('en')} hours of music`;
      subline = `${summary.uniqueArtists.toLocaleString('en')} artists explored`;
    }

    return {
      headline,
      subline,
      topArtist,
      topTrack,
      topTrackPlays,
      totalHours,
      uniqueArtists: summary.uniqueArtists,
      dateRange,
      timelineValues,
    };
  }
}

function formatDateRange(from: Date, to: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return `${fmt(from)} – ${fmt(to)}`;
}

/**
 * Converts raw ms-played values into normalized 0–1 bar heights.
 * If there are more than 60 monthly data points, aggregates into quarters
 * so the chart never gets too dense.
 */
function buildTimelineValues(rawMs: number[]): number[] {
  let values = rawMs;

  if (values.length > 60) {
    const quarters: number[] = [];
    for (let i = 0; i < values.length; i += 3) {
      quarters.push(values.slice(i, i + 3).reduce((a, b) => a + b, 0));
    }
    values = quarters;
  }

  const max = Math.max(...values, 1);
  return values.map((v) => v / max);
}
