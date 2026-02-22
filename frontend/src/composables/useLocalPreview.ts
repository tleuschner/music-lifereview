import { ref } from 'vue';
import type { SpotifyStreamEntry } from '@music-livereview/shared';

export interface PreviewSummary {
  entryCount: number;
  dateFrom: string;
  dateTo: string;
  totalHoursEstimate: number;
  topArtists: Array<{ name: string; count: number }>;
}

export function useLocalPreview() {
  const preview = ref<PreviewSummary | null>(null);
  const parsing = ref(false);

  async function parseFiles(files: File[]): Promise<void> {
    parsing.value = true;
    preview.value = null;

    try {
      const allEntries: SpotifyStreamEntry[] = [];

      for (const file of files) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          allEntries.push(...parsed);
        }
      }

      if (allEntries.length === 0) {
        preview.value = null;
        return;
      }

      // Compute quick summary
      const timestamps = allEntries.map(e => e.ts).filter(Boolean).sort();
      const totalMs = allEntries.reduce((sum, e) => sum + (e.ms_played ?? 0), 0);

      // Top 5 artists
      const artistCounts = new Map<string, number>();
      for (const entry of allEntries) {
        const artist = entry.master_metadata_album_artist_name;
        if (artist) {
          artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);
        }
      }
      const topArtists = Array.from(artistCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      preview.value = {
        entryCount: allEntries.length,
        dateFrom: timestamps[0] ?? '',
        dateTo: timestamps[timestamps.length - 1] ?? '',
        totalHoursEstimate: Math.round(totalMs / 3600000 * 10) / 10,
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
