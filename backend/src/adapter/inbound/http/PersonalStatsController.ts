import { Router } from 'express';
import type { StatsFilter } from '@music-livereview/shared';
import { DEFAULT_TOP_LIMIT, DEFAULT_ARTIST_TIMELINE_LIMIT } from '@music-livereview/shared';
import type { QueryPersonalStats } from '../../../domain/port/inbound/QueryPersonalStats.js';
import type { DeleteUploadSession } from '../../../domain/port/inbound/DeleteUploadSession.js';

function parseFilters(query: Record<string, unknown>): StatsFilter {
  return {
    from: typeof query.from === 'string' ? query.from : undefined,
    to: typeof query.to === 'string' ? query.to : undefined,
    artist: typeof query.artist === 'string' ? query.artist : undefined,
    limit: typeof query.limit === 'string' ? parseInt(query.limit, 10) : undefined,
    sort: query.sort === 'count' ? 'count' : query.sort === 'hours' ? 'hours' : undefined,
  };
}

export function createPersonalStatsController(useCase: QueryPersonalStats, deleteUseCase: DeleteUploadSession): Router {
  const router = Router();

  const handle = (fn: (token: string, filters: StatsFilter) => Promise<unknown>) => {
    return async (req: { params: { token: string }; query: Record<string, unknown> }, res: { status: (code: number) => { json: (body: unknown) => void }; json: (body: unknown) => void }, next: (err?: unknown) => void) => {
      try {
        const result = await fn(req.params.token, parseFilters(req.query));
        if (result === null) {
          res.status(404).json({ error: 'Session not found or not completed' });
          return;
        }
        res.json(result);
      } catch (err) {
        next(err);
      }
    };
  };

  router.get('/:token/overview', handle((t, f) => useCase.getOverview(t, f)));
  router.get('/:token/top-artists', handle((t, f) => useCase.getTopArtists(t, { ...f, limit: f.limit ?? DEFAULT_TOP_LIMIT })));
  router.get('/:token/top-tracks', handle((t, f) => useCase.getTopTracks(t, { ...f, limit: f.limit ?? DEFAULT_TOP_LIMIT })));
  router.get('/:token/timeline', handle((t, f) => useCase.getTimeline(t, f)));
  router.get('/:token/heatmap', handle((t, f) => useCase.getHeatmap(t, f)));
  router.get('/:token/top-artists-over-time', handle((t, f) => useCase.getTopArtistsOverTime(t, f.limit ?? DEFAULT_ARTIST_TIMELINE_LIMIT, f)));
  router.get('/:token/top-tracks-over-time', handle((t, f) => useCase.getTopTracksOverTime(t, f.limit ?? DEFAULT_ARTIST_TIMELINE_LIMIT, f)));
  router.get('/:token/discovery', handle((t, f) => useCase.getDiscoveryRate(t, f)));
  router.get('/:token/skipped', handle((t, f) => useCase.getSkippedTracks(t, f.limit ?? 50)));
  router.get('/:token/artist-loyalty', handle((t, f) => useCase.getArtistLoyalty(t, f)));
  router.get('/:token/back-button', handle((t, f) => useCase.getBackButtonTracks(t, f.limit ?? 50)));
  router.get('/:token/artist-cumulative', handle((t, f) => useCase.getArtistCumulative(t, f.limit ?? DEFAULT_ARTIST_TIMELINE_LIMIT, f)));
  router.get('/:token/track-cumulative', handle((t, f) => useCase.getTrackCumulative(t, f.limit ?? DEFAULT_ARTIST_TIMELINE_LIMIT, f)));
  router.get('/:token/content-split', handle((t, f) => useCase.getContentSplit(t, f)));
  router.get('/:token/obsession-timeline', handle((t, f) => useCase.getObsessionTimeline(t, f)));
  router.get('/:token/session-stamina', handle((t, f) => useCase.getSessionStamina(t, f)));
  router.get('/:token/artist-intent', handle((t, f) => useCase.getArtistIntent(t, f)));
  router.get('/:token/track-intent', handle((t, f) => useCase.getTrackIntent(t, f, f.limit ?? 50)));
  router.get('/:token/personality', handle((t) => useCase.getPersonalityInputs(t)));
  router.get('/:token/shuffle-serendipity', handle((t, f) => useCase.getShuffleSerendipity(t, f.limit ?? 25)));
  router.get('/:token/intro-test', handle((t, f) => useCase.getIntroTestTracks(t, f.limit ?? 50)));
  router.get('/:token/artist-discovery', handle((t, f) => useCase.getArtistDiscovery(t, f)));
  router.get('/:token/weekday-weekend', handle((t, f) => useCase.getWeekdayWeekend(t, f)));
  router.get('/:token/album-listeners', handle((t, f) => useCase.getAlbumListeners(t, f)));
  router.get('/:token/skip-graveyard', handle((t, f) => useCase.getSkipGraveyard(t, f.limit ?? 50)));
  router.get('/:token/seasonal-artists', handle((t) => useCase.getSeasonalArtists(t)));
  router.get('/:token/rebound-artists', handle((t, f) => useCase.getReboundArtists(t, f.limit ?? 20)));
  router.get('/:token/marathons', handle((t, f) => useCase.getMarathons(t, f)));

  router.post('/:token/personality/record', async (req, res, next) => {
    try {
      const { personalityId } = req.body as { personalityId?: unknown };
      if (typeof personalityId !== 'string' || !personalityId) {
        res.status(400).json({ error: 'personalityId is required' });
        return;
      }
      const ok = await useCase.recordPersonality(req.params.token, personalityId);
      if (!ok) {
        res.status(404).json({ error: 'Session not found or not completed' });
        return;
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:token', async (req, res, next) => {
    try {
      const { deleted } = await deleteUseCase.execute(req.params.token);
      if (!deleted) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
