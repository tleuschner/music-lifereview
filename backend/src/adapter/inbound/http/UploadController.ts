import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { MAX_FILE_SIZE_MB, MAX_FILES_PER_UPLOAD, MAX_TOTAL_ENTRIES } from '@music-livereview/shared';
import type { SpotifyStreamEntry } from '@music-livereview/shared';
import type { UploadStreamingHistory } from '../../../domain/port/inbound/UploadStreamingHistory.js';

export function createUploadController(useCase: UploadStreamingHistory, maxFileSizeMb: number): Router {
  const router = Router();

  // Use disk storage to avoid buffering large files in RAM
  const storage = multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
      cb(null, tmpdir());
    },
    filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      cb(null, `mlr-${Date.now()}-${file.originalname}`);
    },
  });

  const perFileSizeLimit = Math.min(maxFileSizeMb, MAX_FILE_SIZE_MB) * 1024 * 1024;

  const upload = multer({
    storage,
    limits: { fileSize: perFileSizeLimit, files: MAX_FILES_PER_UPLOAD },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      if (!file.originalname.endsWith('.json')) {
        cb(new Error('Only .json files are accepted'));
        return;
      }
      cb(null, true);
    },
  });

  router.post('/upload', upload.array('files', MAX_FILES_PER_UPLOAD), async (req: Request, res: Response, next: NextFunction) => {
    const uploadedFiles = req.files as Express.Multer.File[] | undefined;

    try {
      if (!uploadedFiles || uploadedFiles.length === 0) {
        res.status(400).json({ error: 'No files uploaded' });
        return;
      }

      // Parse files one at a time from disk to limit peak RAM usage
      const allEntries: SpotifyStreamEntry[] = [];
      let totalEntries = 0;

      for (const file of uploadedFiles) {
        const raw = await readFile(file.path, 'utf-8');
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          res.status(400).json({ error: `File ${file.originalname} is not valid JSON` });
          return;
        }

        if (!Array.isArray(parsed)) {
          res.status(400).json({ error: `File ${file.originalname} is not a JSON array` });
          return;
        }

        totalEntries += parsed.length;
        if (totalEntries > MAX_TOTAL_ENTRIES) {
          res.status(413).json({
            error: `Too many entries (${totalEntries.toLocaleString()}). Maximum is ${MAX_TOTAL_ENTRIES.toLocaleString()}.`,
          });
          return;
        }

        // Use loop instead of spread — push(...largeArray) overflows the call stack for >65k entries
        for (const entry of parsed as SpotifyStreamEntry[]) {
          allEntries.push(entry);
        }
      }

      if (allEntries.length === 0) {
        res.status(400).json({ error: 'No entries found in uploaded files' });
        return;
      }

      // Basic validation: check first entry has required fields
      const first = allEntries[0];
      if (!first.ts || first.ms_played == null) {
        res.status(400).json({ error: 'Invalid Spotify streaming history format. Missing ts or ms_played fields.' });
        return;
      }

      const optOut = req.body?.optOut === 'true';
      const userHash = typeof req.body?.userHash === 'string' && req.body.userHash ? req.body.userHash : null;

      const result = await useCase.execute(allEntries, { optOut, userHash });
      res.status(202).json(result);
    } catch (err) {
      next(err);
    } finally {
      // Always clean up temp files
      if (uploadedFiles) {
        for (const file of uploadedFiles) {
          unlink(file.path).catch(() => {});
        }
      }
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
