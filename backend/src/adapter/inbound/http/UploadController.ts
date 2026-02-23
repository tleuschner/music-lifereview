import { Router, type Request, type Response, type NextFunction } from 'express';
import express from 'express';
import { gunzip } from 'zlib';
import { promisify } from 'util';
import type { UploadAggregatedRequest } from '@music-livereview/shared';
import type { UploadStreamingHistory } from '../../../domain/port/inbound/UploadStreamingHistory.js';

const gunzipAsync = promisify(gunzip);

const MONTH_MS = 31 * 24 * 60 * 60 * 1000;

function validateUploadAggregated(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'Request body must be a JSON object';
  const d = body as Record<string, unknown>;

  if (!Array.isArray(d.artistBuckets)) return 'Missing artistBuckets';
  if (!Array.isArray(d.trackBuckets)) return 'Missing trackBuckets';
  if (!Array.isArray(d.hourlyStatsBuckets)) return 'Missing hourlyStatsBuckets';
  if (!Array.isArray(d.trackFirstPlays)) return 'Missing trackFirstPlays';
  if (!Array.isArray(d.monthlyTotals)) return 'Missing monthlyTotals';
  if (!Array.isArray(d.marathons)) return 'Missing marathons';
  if (!d.summary || typeof d.summary !== 'object') return 'Missing summary';

  const summary = d.summary as Record<string, unknown>;
  if (typeof summary.totalEntries !== 'number' || summary.totalEntries < 0) return 'Invalid summary.totalEntries';
  if (typeof summary.totalMsPlayed !== 'number' || summary.totalMsPlayed < 0) return 'Invalid summary.totalMsPlayed';

  if ((d.artistBuckets as unknown[]).length > 500_000) return 'Too many artist buckets';
  if ((d.trackBuckets as unknown[]).length > 5_000_000) return 'Too many track buckets';

  for (const b of d.artistBuckets as Record<string, unknown>[]) {
    if (typeof b.artistName !== 'string' || !b.artistName) return 'Invalid artistName in artist bucket';
    if (typeof b.playCount !== 'number' || b.playCount < 0) return 'Negative playCount in artist bucket';
    if (typeof b.msPlayed !== 'number' || b.msPlayed < 0) return 'Negative msPlayed in artist bucket';
    if (typeof b.skipCount !== 'number' || (b.skipCount as number) > (b.playCount as number)) return 'skip_count > play_count in artist bucket';
    if ((b.msPlayed as number) > MONTH_MS * 2) return 'Unrealistic msPlayed in artist bucket';
  }

  for (const b of d.monthlyTotals as Record<string, unknown>[]) {
    if (typeof b.msPlayed !== 'number' || (b.msPlayed as number) > MONTH_MS * 2) return 'Unrealistic msPlayed in monthly total';
    if (typeof b.podcastPlayCount === 'number' && typeof b.playCount === 'number' &&
        (b.podcastPlayCount as number) > (b.playCount as number)) return 'podcast_play_count > play_count';
    if (typeof b.shuffleCount === 'number' && typeof b.playCount === 'number' &&
        (b.shuffleCount as number) > (b.playCount as number)) return 'shuffle_count > play_count';
  }

  return null;
}

// Accepts a gzip-compressed JSON body (Content-Type: application/octet-stream).
// The 10 MB limit applies to the compressed bytes (~3–5 MB in practice),
// so decompressed payloads of 100+ MB are handled without bumping Express's global JSON limit.
const rawBody = express.raw({ type: 'application/octet-stream', limit: '10mb' });

export function createUploadController(useCase: UploadStreamingHistory): Router {
  const router = Router();

  router.post('/upload', rawBody, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!Buffer.isBuffer(req.body)) {
        res.status(400).json({ error: 'Expected gzip-compressed binary body' });
        return;
      }

      let parsed: unknown;
      try {
        const decompressed = await gunzipAsync(req.body);
        parsed = JSON.parse(decompressed.toString('utf-8'));
      } catch {
        res.status(400).json({ error: 'Failed to decompress or parse request body' });
        return;
      }

      const validationError = validateUploadAggregated(parsed);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const result = await useCase.executeAggregated(parsed as UploadAggregatedRequest);
      res.status(202).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/status/:token', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await useCase.getStatus(req.params.token as string);
      if (!result) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
