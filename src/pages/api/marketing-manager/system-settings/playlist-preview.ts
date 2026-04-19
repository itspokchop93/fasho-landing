import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';

// ============================================================================
// PLAYLIST PREVIEW (lightweight — no Spotify API key required)
// ----------------------------------------------------------------------------
// Used by the "Add New Playlist" form to give the admin instant visual
// confirmation of which playlist their pasted link points to. We deliberately
// avoid the authenticated Spotify Web API here so:
//   - No token quota is consumed for every keystroke
//   - It still works during a Spotify dev-app outage
//   - It's fast (oEmbed responds in ~100-300ms)
//
// Source: Spotify's public oEmbed endpoint
//   https://open.spotify.com/oembed?url=https://open.spotify.com/playlist/{id}
// Returns: { title, thumbnail_url, html, ... } — no auth required.
//
// We add a tiny in-memory LRU-ish cache (60s TTL) so rapid re-typing of the
// same URL doesn't hammer Spotify.
// ============================================================================

interface PreviewSuccess {
  ok: true;
  id: string;
  name: string;
  thumbnailUrl: string | null;
  providerUrl: string;
  fromCache: boolean;
}

interface PreviewError {
  ok: false;
  error: string;
  status?: number;
}

type PreviewResponse = PreviewSuccess | PreviewError;

// Tiny module-scoped cache — fine for serverless because warm instances
// will reuse it; cold starts simply re-fetch.
const CACHE_TTL_MS = 60_000;
interface CacheEntry { value: PreviewSuccess; expiresAt: number }
const previewCache = new Map<string, CacheEntry>();

function pruneCache() {
  if (previewCache.size < 200) return;
  const now = Date.now();
  for (const [k, v] of previewCache.entries()) {
    if (v.expiresAt < now) previewCache.delete(k);
  }
}

function extractPlaylistId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const patterns = [
    /spotify:playlist:([a-zA-Z0-9]{16,})/i,
    /open\.spotify\.com\/(?:embed\/)?playlist\/([a-zA-Z0-9]{16,})/i,
    /spotify\.com\/(?:embed\/)?playlist\/([a-zA-Z0-9]{16,})/i,
  ];
  for (const pat of patterns) {
    const m = trimmed.match(pat);
    if (m && m[1]) return m[1];
  }
  // Bare ID (Spotify playlist IDs are 22-char base62, but allow some slack)
  if (/^[a-zA-Z0-9]{16,40}$/.test(trimmed)) return trimmed;
  return null;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse, _adminUser: AdminUser) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' } as PreviewResponse);
  }

  const raw = (req.query.url as string) || (req.query.id as string) || '';
  const id = extractPlaylistId(raw);

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: 'Could not parse a Spotify playlist ID from the provided value.',
    } as PreviewResponse);
  }

  // Cache hit
  const cached = previewCache.get(id);
  if (cached && cached.expiresAt > Date.now()) {
    return res.status(200).json({ ...cached.value, fromCache: true } as PreviewResponse);
  }

  const playlistUrl = `https://open.spotify.com/playlist/${id}`;
  const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(playlistUrl)}`;

  try {
    const resp = await fetchWithTimeout(
      oembedUrl,
      {
        headers: {
          // Spotify's oEmbed sometimes 403s requests with no UA / odd UAs.
          'User-Agent': 'Mozilla/5.0 (compatible; FashoAdminPreview/1.0)',
          Accept: 'application/json',
        },
      },
      5_000,
    );

    if (!resp.ok) {
      // 404 typically = playlist deleted/private; 4xx/5xx otherwise = transient.
      const friendly =
        resp.status === 404
          ? 'Playlist not found on Spotify (it may be private or deleted).'
          : `Spotify oEmbed responded with HTTP ${resp.status}.`;
      return res.status(200).json({ ok: false, error: friendly, status: resp.status } as PreviewResponse);
    }

    const json = await resp.json();
    // oEmbed shape: { title, thumbnail_url, provider_url, html, ... }
    const value: PreviewSuccess = {
      ok: true,
      id,
      name: typeof json?.title === 'string' && json.title.trim()
        ? String(json.title).trim()
        : 'Unknown playlist',
      thumbnailUrl: typeof json?.thumbnail_url === 'string' ? json.thumbnail_url : null,
      providerUrl: playlistUrl,
      fromCache: false,
    };

    previewCache.set(id, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    pruneCache();

    return res.status(200).json(value as PreviewResponse);
  } catch (err: any) {
    const msg = err?.name === 'AbortError'
      ? 'Spotify preview request timed out after 5 seconds.'
      : (err?.message || String(err));
    return res.status(200).json({ ok: false, error: msg } as PreviewResponse);
  }
}

export default requireAdminAuth(handler);
