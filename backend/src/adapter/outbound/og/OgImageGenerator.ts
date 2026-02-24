import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { OgPreviewData } from '@music-livereview/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));

const interRegular = readFileSync(join(__dirname, 'fonts', 'Inter-Regular.ttf'));
const interBold = readFileSync(join(__dirname, 'fonts', 'Inter-Bold.ttf'));

const W = 1200;
const H = 630;

// Cache: token → { buffer, expiresAt }
const imageCache = new Map<string, { buffer: Buffer; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export function getCachedImage(token: string): Buffer | null {
  const entry = imageCache.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    imageCache.delete(token);
    return null;
  }
  return entry.buffer;
}

export function setCachedImage(token: string, buffer: Buffer): void {
  imageCache.set(token, { buffer, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function cleanImageCache(): void {
  const now = Date.now();
  for (const [key, entry] of imageCache) {
    if (now > entry.expiresAt) imageCache.delete(key);
  }
}

export async function generateOgImage(data: OgPreviewData): Promise<Buffer> {
  const svg = await satori(buildLayout(data), {
    width: W,
    height: H,
    fonts: [
      { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
      { name: 'Inter', data: interBold, weight: 700, style: 'normal' },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: W } });
  return Buffer.from(resvg.render().asPng());
}

// ─── Layout ──────────────────────────────────────────────────────────────────

function el(
  type: string,
  style: Record<string, unknown>,
  ...children: unknown[]
): object {
  const props: Record<string, unknown> = { style };
  if (children.length === 1) props.children = children[0];
  else if (children.length > 1) props.children = children;
  // 0 children → omit the property entirely (satori rejects children: [])
  return { type, props };
}

const CHART_H = 96;

function buildLayout(data: OgPreviewData): object {
  return el(
    'div',
    {
      width: W,
      height: H,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '48px 72px',
      background: '#0f0f0f',
      fontFamily: 'Inter',
      color: '#e0e0e0',
    },
    // Top: brand + headline + subline
    el(
      'div',
      { display: 'flex', flexDirection: 'column' },
      el('div', { fontSize: 20, fontWeight: 700, color: '#1db954', marginBottom: 28 }, 'music livereview'),
      el('div', { fontSize: 46, fontWeight: 700, lineHeight: 1.15, color: '#ffffff', marginBottom: 12 }, data.headline),
      el('div', { fontSize: 24, color: '#888888' }, data.subline),
    ),
    // Middle: timeline bar chart
    timelineChart(data.timelineValues),
    // Bottom: stat cards + accent lines
    el(
      'div',
      { display: 'flex', flexDirection: 'column', gap: '20px' },
      el(
        'div',
        { display: 'flex', gap: '16px' },
        statCard(data.totalHours.toLocaleString('en'), 'hours listened'),
        statCard(data.uniqueArtists.toLocaleString('en'), 'artists'),
        statCard(data.dateRange, 'time span'),
      ),
      el(
        'div',
        { display: 'flex', flexDirection: 'column', gap: '8px' },
        ...(data.topArtist
          ? [
              el(
                'div',
                { display: 'flex', alignItems: 'center', gap: '10px', fontSize: 18 },
                el('span', { color: '#1db954', fontWeight: 700 }, '#1 Artist'),
                el('span', { color: '#555555' }, '·'),
                el('span', { color: '#cccccc' }, data.topArtist),
              ),
            ]
          : []),
        ...(data.topTrack && data.topTrackPlays
          ? [
              el(
                'div',
                { display: 'flex', alignItems: 'center', gap: '10px', fontSize: 18 },
                el('span', { color: '#1db954', fontWeight: 700 }, 'Most-played song'),
                el('span', { color: '#555555' }, '·'),
                el('span', { color: '#cccccc' }, `${data.topTrack} — played ${data.topTrackPlays.toLocaleString('en')} times`),
              ),
            ]
          : []),
      ),
    ),
  );
}

function timelineChart(values: number[]): object {
  const bars = values.map((v) =>
    el('div', {
      flex: 1,
      height: Math.max(3, Math.round(v * CHART_H)),
      background: v > 0.7 ? '#1db954' : v > 0.35 ? '#17a349' : '#0f7a35',
      borderRadius: '2px 2px 0 0',
    }),
  );

  return el(
    'div',
    { display: 'flex', flexDirection: 'column' },
    el(
      'div',
      {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '3px',
        height: CHART_H,
        width: W - 144,
      },
      ...bars,
    ),
    el('div', { height: 1, background: '#2a2a2a', width: W - 144 }),
  );
}

function statCard(value: string, label: string): object {
  return el(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      background: '#1a1a1a',
      borderRadius: 12,
      padding: '18px 26px',
      minWidth: 180,
    },
    el('div', { fontSize: 30, fontWeight: 700, color: '#1db954' }, value),
    el('div', { fontSize: 14, color: '#666666', marginTop: 4 }, label),
  );
}
