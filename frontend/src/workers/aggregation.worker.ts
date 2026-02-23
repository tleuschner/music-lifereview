import { aggregateEntries, PII_FIELDS } from '@music-livereview/shared';
import type { SpotifyStreamEntry, AggregationResult } from '@music-livereview/shared';

export type WorkerInMessage = {
  type: 'aggregate';
  files: File[];
};

export type WorkerOutMessage =
  | { type: 'progress'; stage: 'reading'; fileIndex: number; total: number }
  | { type: 'progress'; stage: 'aggregating' }
  | { type: 'done'; result: AggregationResult; userHash: string | null }
  | { type: 'error'; message: string };

async function sha256hex(text: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
  if (event.data.type !== 'aggregate') return;

  const { files } = event.data;
  const allEntries: SpotifyStreamEntry[] = [];
  let userHash: string | null = null;

  // Read and parse each file
  for (let i = 0; i < files.length; i++) {
    self.postMessage({ type: 'progress', stage: 'reading', fileIndex: i, total: files.length } satisfies WorkerOutMessage);

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

    // Strip PII and collect entries
    for (const raw of entries) {
      const entry = { ...raw } as Record<string, unknown>;
      for (const field of PII_FIELDS) delete entry[field];
      allEntries.push(entry as unknown as SpotifyStreamEntry);
    }
  }

  if (allEntries.length === 0) {
    self.postMessage({ type: 'error', message: 'No entries found in uploaded files' } satisfies WorkerOutMessage);
    return;
  }

  // Run aggregation
  self.postMessage({ type: 'progress', stage: 'aggregating' } satisfies WorkerOutMessage);
  const result = aggregateEntries(allEntries);

  self.postMessage({ type: 'done', result, userHash } satisfies WorkerOutMessage);
};
