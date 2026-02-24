import { ref } from 'vue';
import type { SpotifyStreamEntry } from '@music-livereview/shared';

export interface PreviewSummary {
  entryCount: number;
  dateFrom: string;
  dateTo: string;
  totalHoursEstimate: number;
  topArtists: Array<{ name: string; count: number }>;
}

// Read only the first 128 KB of each file — enough for ~250-400 entries,
// which is plenty for a preview. Avoids loading 100+ MB JSON files into the
// main thread just to show a few stat cards before the user hits upload.
const HEAD_BYTES = 128 * 1024;
const TAIL_BYTES = 16 * 1024;

export function useLocalPreview() {
  const preview = ref<PreviewSummary | null>(null);
  const parsing = ref(false);

  async function parseFiles(files: File[]): Promise<void> {
    parsing.value = true;
    preview.value = null;

    try {
      let totalEstimatedEntries = 0;
      let earliestTs = '';
      let latestTs = '';
      let sampleMsPlayed = 0;
      let sampleBytes = 0;
      let totalBytes = 0;
      const artistCounts = new Map<string, number>();

      for (const file of files) {
        totalBytes += file.size;
        const readBytes = Math.min(file.size, HEAD_BYTES);
        sampleBytes += readBytes;

        const headText = await file.slice(0, readBytes).text();
        const entries = parsePartialArray(headText);

        if (entries.length > 0) {
          // Estimate total entries from bytes-per-entry observed in this sample
          totalEstimatedEntries += Math.round(file.size / (readBytes / entries.length));
        }

        for (const raw of entries) {
          const e = raw as unknown as SpotifyStreamEntry;
          if (e.ts) {
            if (!earliestTs || e.ts < earliestTs) earliestTs = e.ts;
            if (e.ts > latestTs) latestTs = e.ts;
          }
          sampleMsPlayed += e.ms_played ?? 0;
          const artist = e.master_metadata_album_artist_name;
          if (artist) artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);
        }

        // Grab the latest timestamp from the tail without loading the whole file
        if (file.size > HEAD_BYTES + TAIL_BYTES) {
          const tailText = await file.slice(file.size - TAIL_BYTES).text();
          for (const match of tailText.matchAll(/"ts"\s*:\s*"([^"]{10,})"/g)) {
            const ts = match[1];
            if (ts > latestTs) latestTs = ts;
          }
        }
      }

      const topArtists = Array.from(artistCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      // Scale observed ms_played up to the full dataset by byte ratio
      const totalHoursEstimate = sampleBytes > 0 && totalBytes > 0
        ? Math.round((sampleMsPlayed / 3_600_000) * (totalBytes / sampleBytes) * 10) / 10
        : 0;

      if (totalEstimatedEntries === 0 && topArtists.length === 0) {
        preview.value = null;
        return;
      }

      preview.value = {
        entryCount: totalEstimatedEntries,
        dateFrom: earliestTs,
        dateTo: latestTs,
        totalHoursEstimate,
        topArtists,
      };
    } catch {
      preview.value = null;
    } finally {
      parsing.value = false;
    }
  }

  return { preview, parsing, parseFiles };
}

/**
 * Extract complete JSON objects from a possibly-truncated JSON array string.
 * Falls back to a full parse when the chunk is small enough to be valid JSON.
 * Otherwise, finds the last complete entry boundary (`},`) and wraps the result.
 */
function parsePartialArray(text: string): Record<string, unknown>[] {
  // Happy path: whole chunk is valid JSON (small file or exact fit)
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* truncated — fall through */ }

  const arrayStart = text.indexOf('[');
  if (arrayStart === -1) return [];

  // Spotify exports have one object per comma-separated item; `},` is a reliable boundary
  const lastBoundary = text.lastIndexOf('},');
  if (lastBoundary === -1) return [];

  try {
    const truncated = text.slice(arrayStart, lastBoundary + 1) + ']';
    const parsed = JSON.parse(truncated);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
