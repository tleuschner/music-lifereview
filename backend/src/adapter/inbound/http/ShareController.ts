import { Router } from 'express';
import type { GenerateOgPreview } from '../../../domain/port/inbound/GenerateOgPreview.js';
import {
  generateOgImage,
  getCachedImage,
  setCachedImage,
  cleanImageCache,
} from '../../outbound/og/OgImageGenerator.js';

export function createShareController(useCase: GenerateOgPreview): Router {
  const router = Router();

  // Periodically evict expired images from the in-memory cache
  setInterval(cleanImageCache, 10 * 60 * 1000);

  // ── OG image ───────────────────────────────────────────────────────────────
  router.get('/:token/og-image.png', async (req, res, next) => {
    try {
      const { token } = req.params;

      const cached = getCachedImage(token);
      if (cached) {
        return sendImage(res, cached);
      }

      const data = await useCase.getPreviewData(token);
      if (!data) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const png = await generateOgImage(data);
      setCachedImage(token, png);
      sendImage(res, png);
    } catch (err) {
      next(err);
    }
  });

  // ── OG HTML page ───────────────────────────────────────────────────────────
  // Crawlers read the meta tags. Humans get an instant JS redirect to the SPA.
  router.get('/:token', async (req, res, next) => {
    try {
      const { token } = req.params;
      const data = await useCase.getPreviewData(token);

      // Token not found — redirect to SPA which handles its own 404
      if (!data) {
        res.redirect(302, `/results/${token}`);
        return;
      }

      // Absolute URL for OG meta tags (social crawlers need a full URL).
      // Relative path for the browser redirect so it works behind any proxy/port.
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const ogImageUrl = `${baseUrl}/share/${token}/og-image.png`;
      const spaUrl = `${baseUrl}/results/${token}`;
      const spaPath = `/results/${token}`;

      const title = escapeHtml(data.headline);
      const parts = [data.subline];
      if (data.topArtist) parts.push(`#1 Artist: ${data.topArtist}`);
      if (data.topTrack && data.topTrackPlays) {
        parts.push(`Most-played song: ${data.topTrack} (${data.topTrackPlays.toLocaleString('en')}x)`);
      }
      const description = escapeHtml(parts.join(' · '));

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | music livereview</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="music livereview">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${spaUrl}">

  <!-- Twitter / X Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImageUrl}">

  <!-- Redirect humans to the SPA (relative path works behind any proxy/port) -->
  <meta http-equiv="refresh" content="0;url=${spaPath}">
  <link rel="canonical" href="${spaUrl}">
</head>
<body>
  <p>Redirecting to <a href="${spaPath}">your dashboard</a>…</p>
  <script>window.location.replace("${spaPath}");</script>
</body>
</html>`);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

function sendImage(res: import('express').Response, buf: Buffer): void {
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Content-Length', String(buf.length));
  res.send(buf);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
