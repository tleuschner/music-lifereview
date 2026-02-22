import { Router } from 'express';
import type { QueryCommunityStats } from '../../../domain/port/inbound/QueryCommunityStats.js';

export function createCommunityStatsController(useCase: QueryCommunityStats): Router {
  const router = Router();

  router.get('/global', async (_req, res, next) => {
    try {
      const stats = await useCase.getGlobalStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });

  router.get('/percentile/:token', async (req, res, next) => {
    try {
      const result = await useCase.getPercentileRanking(req.params.token);
      if (!result) {
        res.status(404).json({ error: 'Session not found or not completed' });
        return;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/trending', async (req, res, next) => {
    try {
      const period = req.query.period as string;
      const validPeriods = ['week', 'month', 'alltime'] as const;
      const selectedPeriod = validPeriods.includes(period as typeof validPeriods[number])
        ? (period as typeof validPeriods[number])
        : 'alltime';

      const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 20;
      const result = await useCase.getTrendingArtists(selectedPeriod, limit);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
