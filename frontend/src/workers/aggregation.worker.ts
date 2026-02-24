import { aggregateEntries, PII_FIELDS } from '@music-livereview/shared';
import type { SpotifyStreamEntry, AggregationResult } from '@music-livereview/shared';

export type WorkerInMessage = {
  type: 'aggregate';
  files: File[];
};

export type WorkerOutMessage =
  | { type: 'progress'; stage: 'reading'; fileIndex: number; total: number }
  | { type: 'progress'; stage: 'aggregating' }
  | { type: 'done'; result: AggregationResult; userHash: string | null; skippedEntries: number }
  | { type: 'error'; message: string };

const MAX_FILE_BYTES = 200 * 1024 * 1024; // 200 MB per file
const MAX_ENTRIES = 5_000_000;            // safety cap — ~10× any real user

async function sha256hex(text: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
  if (event.data.type !== 'aggregate') return;

  const { files } = event.data;
  const allEntries: SpotifyStreamEntry[] = [];
  let userHash: string | null = null;
  let skippedEntries = 0;
  let hitCap = false;

  outer: for (let i = 0; i < files.length; i++) {
    self.postMessage({ type: 'progress', stage: 'reading', fileIndex: i, total: files.length } satisfies WorkerOutMessage);

    if (files[i].size > MAX_FILE_BYTES) {
      self.postMessage({
        type: 'error',
        message: `${files[i].name} is too large (${(files[i].size / 1024 / 1024).toFixed(0)} MB). Max 200 MB per file.`,
      } satisfies WorkerOutMessage);
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(await files[i].text());
    } catch {
      self.postMessage({ type: 'error', message: `${files[i].name} is not valid JSON` } satisfies WorkerOutMessage);
      return;
    }

    if (!Array.isArray(parsed)) {
      self.postMessage({ type: 'error', message: `${files[i].name} is not a JSON array` } satisfies WorkerOutMessage);
      return;
    }

    const entries = parsed as Record<string, unknown>[];

    // Hash username from the first entry that has one (before stripping)
    if (!userHash) {
      const firstUsername = entries.find(e => typeof e.username === 'string')?.username as string | undefined;
      if (firstUsername) {
        userHash = await sha256hex(firstUsername);
      }
    }

    for (const raw of entries) {
      if (allEntries.length >= MAX_ENTRIES) {
        hitCap = true;
        break outer;
      }

      // Must have a valid timestamp string — without it the entry is useless
      if (typeof raw.ts !== 'string' || raw.ts.length < 10) {
        skippedEntries++;
        continue;
      }

      // Coerce ms_played to a finite number (null / undefined / NaN → 0)
      const ms = typeof raw.ms_played === 'number' && isFinite(raw.ms_played) ? raw.ms_played : 0;
      const entry = { ...raw, ms_played: ms } as Record<string, unknown>;
      for (const field of PII_FIELDS) delete entry[field];
      allEntries.push(entry as unknown as SpotifyStreamEntry);
    }
  }

  if (allEntries.length === 0) {
    self.postMessage({ type: 'error', message: 'No valid entries found in the uploaded files.' } satisfies WorkerOutMessage);
    return;
  }

  // Fall back to content fingerprint when no username was found
  if (!userHash) {
    const sample = allEntries
      .slice(0, 200)
      .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0))
      .slice(0, 20);
    const fingerprint = sample.map(e => `${e.ts}|${e.spotify_track_uri ?? e.episode_name ?? ''}`).join(',');
    userHash = await sha256hex(fingerprint);
  }

  if (hitCap) {
    console.warn(`[aggregation.worker] Entry cap reached (${MAX_ENTRIES.toLocaleString()}). Oldest entries may be missing.`);
  }

  self.postMessage({ type: 'progress', stage: 'aggregating' } satisfies WorkerOutMessage);
  const result = aggregateEntries(allEntries);

  self.postMessage({ type: 'done', result, userHash, skippedEntries } satisfies WorkerOutMessage);
};
