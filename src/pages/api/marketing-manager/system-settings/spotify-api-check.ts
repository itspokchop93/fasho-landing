import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';

// ============================================================================
// SPOTIFY API HEALTH CHECK
// ----------------------------------------------------------------------------
// Confirms the Spotify Web API integration is fully operational by:
//   1. Verifying SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET env vars are present
//   2. Forcing a FRESH token fetch from accounts.spotify.com (no cache) so we
//      catch any credential revocation / dev-app suspension immediately
//   3. Calling GET /v1/playlists/{id} against a REAL playlist from the
//      playlist_network table — this is the exact endpoint the app depends
//      on (see getSpotifyPlaylistDataWithHealth in src/utils/spotify-api.ts).
//      If the DB has no playlists, falls back to GET /v1/search.
//
// Why we don't use /v1/browse/new-releases anymore:
//   Spotify removed it for Development Mode apps as part of the Feb 2026
//   Web API changes (along with /browse/categories, /artists/{id}/top-tracks,
//   /users/{id}, /markets, batch /tracks?ids=, etc.). See:
//   https://developer.spotify.com/documentation/web-api/references/changes/february-2026
//
// Premium requirement (Feb 2026 change):
//   Development Mode apps now require the app owner to have active Spotify
//   Premium. If Premium lapses, the dev app stops working entirely until the
//   owner resubscribes. We surface that possibility in error messages.
//
// What this check verifies:
//   - SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET are present and valid
//   - Spotify accounts service issues a fresh token (catches revoked/suspended apps)
//   - The token works on the REAL endpoint the app uses (/v1/playlists/{id})
//   - The dev-app owner's Premium subscription is active (any 401/403 here
//     after a successful token fetch is a strong signal Premium lapsed or the
//     app was migrated under the Feb 2026 dev-mode rules)
//
// What this check does NOT verify:
//   - Per-end-user Premium status (Client Credentials flow has no end user)
//   - Apify integration (separate API entirely)
// ============================================================================

interface CheckResult {
  success: boolean;
  message: string;
  durationMs: number;
  details: {
    envVars: {
      hasClientId: boolean;
      hasClientSecret: boolean;
      maskedClientId: string | null;
    };
    tokenFetch: {
      attempted: boolean;
      ok: boolean;
      status?: number;
      durationMs?: number;
      tokenType?: string;
      expiresIn?: number;
      error?: string;
    };
    apiCall: {
      attempted: boolean;
      ok: boolean;
      status?: number;
      durationMs?: number;
      endpoint?: string;
      mode?: 'playlist' | 'search' | 'none';
      testedPlaylistName?: string | null;
      testedPlaylistId?: string | null;
      sample?: { type: string; name: string; artist?: string } | null;
      error?: string;
      hint?: string;
    };
  };
  checkedAt: string;
}

const TOKEN_URL = 'https://accounts.spotify.com/api/token';

function maskClientId(id: string | undefined): string | null {
  if (!id) return null;
  if (id.length <= 8) return id.slice(0, 2) + '…';
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

// Try to grab a real Spotify playlist ID from the playlist_network table.
// We prefer non-removed (is_active = true) playlists with a stored
// spotify_playlist_id. Falls back to null if none found or query errors.
async function pickSamplePlaylist(): Promise<{ id: string; name: string } | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('playlist_network')
      .select('spotify_playlist_id, playlist_name, is_active, health_status')
      .not('spotify_playlist_id', 'is', null)
      .order('is_active', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) return null;

    // Prefer an active playlist whose health isn't already 'removed'.
    const preferred = data.find(
      (p: any) =>
        p.spotify_playlist_id &&
        p.is_active !== false &&
        p.health_status !== 'removed',
    );
    const chosen = preferred || data.find((p: any) => p.spotify_playlist_id);
    if (!chosen?.spotify_playlist_id) return null;

    return {
      id: String(chosen.spotify_playlist_id),
      name: String(chosen.playlist_name || 'Unnamed playlist'),
    };
  } catch {
    return null;
  }
}

// Map auth errors after a successful token fetch to a useful, honest hint.
// 401/403 on a known-good endpoint after a valid token almost always means
// the dev app was migrated under the Feb 2026 dev-mode rules OR the owner's
// Premium lapsed.
function buildApiCallHint(status: number | undefined, mode: 'playlist' | 'search'): string | undefined {
  if (status === 401) {
    return 'Token was issued but rejected on the actual endpoint. Common causes: (1) the dev-app owner\'s Spotify Premium lapsed (required for Dev Mode apps as of Feb 2026), (2) the token scope is insufficient, or (3) the dev app was suspended.';
  }
  if (status === 403) {
    if (mode === 'playlist') {
      return 'Spotify returned 403 on /v1/playlists/{id}. This typically means the dev-app owner\'s Premium subscription lapsed, or the app was migrated under the Feb 2026 Dev Mode rules. Confirm Premium is active and try again.';
    }
    return 'Spotify returned 403 on /v1/search. The Feb 2026 Dev Mode changes restrict /search behavior — confirm the dev-app owner has active Premium and that the app status is healthy in the Spotify dashboard.';
  }
  if (status === 404 && mode === 'playlist') {
    return 'Playlist not found. The Spotify playlist may have been deleted or made private. The auth itself is working — try refreshing the playlist network or test again.';
  }
  if (status === 429) {
    return 'Rate limited by Spotify. Wait a minute and try again. Auth itself is fine.';
  }
  return undefined;
}

async function handler(req: NextApiRequest, res: NextApiResponse, _adminUser: AdminUser) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const overallStart = Date.now();
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  const result: CheckResult = {
    success: false,
    message: '',
    durationMs: 0,
    details: {
      envVars: {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        maskedClientId: maskClientId(clientId),
      },
      tokenFetch: { attempted: false, ok: false },
      apiCall: { attempted: false, ok: false },
    },
    checkedAt: new Date().toISOString(),
  };

  // --- Step 1: env var check ---
  if (!clientId || !clientSecret) {
    result.message = !clientId && !clientSecret
      ? 'Both SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are missing from server env.'
      : !clientId
        ? 'SPOTIFY_CLIENT_ID is missing from server env.'
        : 'SPOTIFY_CLIENT_SECRET is missing from server env.';
    result.durationMs = Date.now() - overallStart;
    return res.status(200).json(result);
  }

  // --- Step 2: force-fresh token fetch (no cache) ---
  let accessToken: string | null = null;
  result.details.tokenFetch.attempted = true;
  const tokenStart = Date.now();
  try {
    const tokenResp = await fetchWithTimeout(
      TOKEN_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      },
      10_000,
    );
    result.details.tokenFetch.durationMs = Date.now() - tokenStart;
    result.details.tokenFetch.status = tokenResp.status;

    if (!tokenResp.ok) {
      const bodyText = await tokenResp.text().catch(() => '');
      let parsedErr = bodyText;
      try {
        const j = JSON.parse(bodyText);
        parsedErr = j.error_description || j.error || bodyText;
      } catch { /* keep raw text */ }
      result.details.tokenFetch.error = parsedErr || `HTTP ${tokenResp.status}`;
      result.message =
        `Token fetch failed (HTTP ${tokenResp.status}): ${parsedErr || 'no error body'}. ` +
        'Most common causes: SPOTIFY_CLIENT_ID/SECRET are wrong, the developer app was deleted or suspended, ' +
        'or (as of Feb 2026) the dev-app owner\'s Spotify Premium subscription lapsed.';
      result.durationMs = Date.now() - overallStart;
      return res.status(200).json(result);
    }

    const tokenJson = await tokenResp.json();
    accessToken = tokenJson.access_token;
    result.details.tokenFetch.ok = true;
    result.details.tokenFetch.tokenType = tokenJson.token_type;
    result.details.tokenFetch.expiresIn = tokenJson.expires_in;

    if (!accessToken) {
      result.details.tokenFetch.error = 'Spotify returned 200 but no access_token in body.';
      result.message = 'Spotify auth returned 200 but the response is missing access_token.';
      result.durationMs = Date.now() - overallStart;
      return res.status(200).json(result);
    }
  } catch (err: any) {
    result.details.tokenFetch.durationMs = Date.now() - tokenStart;
    const msg = err?.name === 'AbortError'
      ? 'Token request timed out after 10 seconds.'
      : (err?.message || String(err));
    result.details.tokenFetch.error = msg;
    result.message = `Could not reach Spotify auth service: ${msg}`;
    result.durationMs = Date.now() - overallStart;
    return res.status(200).json(result);
  }

  // --- Step 3: real API call against an endpoint the app actually uses ---
  // Prefer GET /v1/playlists/{id} with a real playlist from the network — this
  // is what the app uses every day. Fall back to /v1/search if the DB has none.
  result.details.apiCall.attempted = true;

  const sample = await pickSamplePlaylist();

  let testUrl: string;
  let mode: 'playlist' | 'search';
  if (sample) {
    mode = 'playlist';
    // Match the field set used by the production caller in spotify-api.ts.
    const fields = 'id,name,public,owner.display_name,tracks.total,images';
    testUrl = `https://api.spotify.com/v1/playlists/${sample.id}?fields=${encodeURIComponent(fields)}`;
    result.details.apiCall.endpoint = `/v1/playlists/${sample.id}`;
    result.details.apiCall.testedPlaylistName = sample.name;
    result.details.apiCall.testedPlaylistId = sample.id;
  } else {
    mode = 'search';
    testUrl = 'https://api.spotify.com/v1/search?q=spotify&type=track&limit=1';
    result.details.apiCall.endpoint = '/v1/search?q=spotify&type=track&limit=1';
    result.details.apiCall.testedPlaylistName = null;
    result.details.apiCall.testedPlaylistId = null;
  }
  result.details.apiCall.mode = mode;

  const apiStart = Date.now();
  try {
    const apiResp = await fetchWithTimeout(
      testUrl,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      10_000,
    );
    result.details.apiCall.durationMs = Date.now() - apiStart;
    result.details.apiCall.status = apiResp.status;

    if (!apiResp.ok) {
      const bodyText = await apiResp.text().catch(() => '');
      let parsedErr = bodyText;
      try {
        const j = JSON.parse(bodyText);
        parsedErr = j?.error?.message || bodyText;
      } catch { /* keep raw text */ }
      result.details.apiCall.error = parsedErr || `HTTP ${apiResp.status}`;
      result.details.apiCall.hint = buildApiCallHint(apiResp.status, mode);
      result.message =
        `Auth succeeded but the live API call failed (HTTP ${apiResp.status}): ${parsedErr || 'no error body'}.` +
        (result.details.apiCall.hint ? ` ${result.details.apiCall.hint}` : '');
      result.durationMs = Date.now() - overallStart;
      return res.status(200).json(result);
    }

    const apiJson = await apiResp.json();

    if (mode === 'playlist') {
      // Pull a quick sample to prove we got real data back.
      result.details.apiCall.sample = {
        type: 'playlist',
        name: apiJson?.name || sample?.name || 'Unknown playlist',
        artist: apiJson?.owner?.display_name
          ? `owner: ${apiJson.owner.display_name}`
          : (typeof apiJson?.tracks?.total === 'number'
              ? `${apiJson.tracks.total} tracks`
              : undefined),
      };
    } else {
      const track = apiJson?.tracks?.items?.[0];
      if (track) {
        result.details.apiCall.sample = {
          type: 'track',
          name: track.name,
          artist: Array.isArray(track.artists) && track.artists.length > 0
            ? track.artists.map((a: any) => a.name).join(', ')
            : undefined,
        };
      } else {
        result.details.apiCall.sample = null;
      }
    }
    result.details.apiCall.ok = true;
  } catch (err: any) {
    result.details.apiCall.durationMs = Date.now() - apiStart;
    const msg = err?.name === 'AbortError'
      ? 'API request timed out after 10 seconds.'
      : (err?.message || String(err));
    result.details.apiCall.error = msg;
    result.message = `Auth succeeded but the Web API call could not complete: ${msg}`;
    result.durationMs = Date.now() - overallStart;
    return res.status(200).json(result);
  }

  // --- All checks passed ---
  result.success = true;
  if (mode === 'playlist') {
    result.message =
      `Spotify API is fully operational. Credentials valid, fresh token issued, and a live ` +
      `GET /v1/playlists/{id} call against "${result.details.apiCall.testedPlaylistName}" ` +
      `returned data. This is the exact endpoint the app uses in production.`;
  } else {
    result.message =
      'Spotify API is fully operational. Credentials valid, fresh token issued, and a live ' +
      '/v1/search call returned data. (No playlists in playlist_network — added one would let us ' +
      'test the exact production endpoint /v1/playlists/{id}.)';
  }
  result.durationMs = Date.now() - overallStart;
  return res.status(200).json(result);
}

export default requireAdminAuth(handler);
