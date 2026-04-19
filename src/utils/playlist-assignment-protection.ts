/**
 * Playlist assignment algorithm with weighted genre scoring and duplicate protection.
 *
 * This file powers the *recommendation* layer that pre-fills the playlist dropdowns
 * inside the Active Campaigns table. Admins can always override the picks manually.
 *
 * ── Immutable rules (must hold for every output, every time) ─────────────────
 *   1. A playlist with health_status of 'removed' / 'error' / 'unknown' / 'private'
 *      is NEVER auto-assigned.  (Defended at the SQL layer AND with a final filter.)
 *   2. A playlist with is_active = false is NEVER auto-assigned.
 *   3. A playlist already running for the same track_id is NEVER duplicated
 *      (see getExcludedPlaylistsForTrack).
 *   4. Music orders never receive Podcast-only playlists, and Podcast orders never
 *      receive music playlists. (Domain guardrail.)
 *
 * ── Scoring tiers (from GENRE_GROUPS in constants/genres.ts) ─────────────────
 *   - Core Genre match (Hip-Hop, R&B, Pop …) = 10 pts each
 *   - Vibe match (Chill, Happy, Sad …)       =  3 pts each
 *   - Sound match (Piano, Acoustic …)        =  2 pts each
 *
 * Tie-break order (descending priority):
 *   score → overlapCount → cached_saves → playlist_name (asc, deterministic)
 *
 * A playlist MUST match at least one core genre to be eligible for the primary
 * pass. If we still need more slots, we fall through to a *scored* General pass
 * (also tier-weighted, also domain-guarded). Anything left over is filled with
 * `-Empty-` placeholders so the UI shows the admin which slots still need work.
 *
 * NO Spotify API calls are made here — health status is read from the DB as-is.
 * NO capacity/slot check — human editors manage playlist fullness.
 */

import { GENRE_GROUPS } from '../constants/genres';
import {
  parsePlaylistGenres,
  playlistHasGenre,
} from './playlist-genres';

// ── Tier lookup maps (built once at module load) ────────────────────────────

const CORE_GENRES = new Set(
  (GENRE_GROUPS.find((g) => g.label === 'Genres')?.items ?? []).map((i) => i.toLowerCase())
);
const VIBES = new Set(
  (GENRE_GROUPS.find((g) => g.label === 'Vibes')?.items ?? []).map((i) => i.toLowerCase())
);
const SOUNDS = new Set(
  (GENRE_GROUPS.find((g) => g.label === 'Sounds')?.items ?? []).map((i) => i.toLowerCase())
);

const TIER_WEIGHTS = { genre: 10, vibe: 3, sound: 2 } as const;

/** Health statuses that disqualify a playlist from auto-assignment (defense in depth). */
const FORBIDDEN_HEALTH_STATUSES = new Set(['removed', 'error', 'unknown', 'private']);

/**
 * Local user-genre normalization for legacy order data.
 * Maps old/renamed genre values from historical orders to current canonical values.
 * Intentionally does NOT collapse "General" → anything — the General sentinel must
 * be preserved so legacy "General" orders still flow into the General fallback bucket.
 */
const USER_GENRE_RENAME: Record<string, string> = {
  'hip-hop/rap': 'Hip-Hop',
  'r&b/soul': 'R&B',
  'electronic/dance (edm)': 'Electronic',
  'gospel/religious': 'Gospel',
  blues: 'Sad',
  classical: 'Orchestral',
  metal: 'Rock',
  world: 'Afrobeats',
};

const PODCAST_GENRE = 'podcast';

function getTier(genre: string): keyof typeof TIER_WEIGHTS | null {
  const g = genre.toLowerCase();
  if (CORE_GENRES.has(g)) return 'genre';
  if (VIBES.has(g)) return 'vibe';
  if (SOUNDS.has(g)) return 'sound';
  return null;
}

/** Apply the rename map without dropping unknown values (less destructive than migrateGenres). */
function normalizeUserGenres(rawGenres: string[]): string[] {
  const out = new Set<string>();
  for (const raw of rawGenres) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const renamed = USER_GENRE_RENAME[trimmed.toLowerCase()];
    out.add(renamed || trimmed);
  }
  return Array.from(out);
}

type Domain = 'music' | 'podcast';

/** Detect what domain the user is in. Podcast wins if any requested genre is Podcast. */
function detectUserDomain(requestedGenres: string[]): Domain {
  return requestedGenres.some((g) => g.toLowerCase() === PODCAST_GENRE) ? 'podcast' : 'music';
}

/**
 * Detect a playlist's domain.
 * - Has Podcast as the only core tag → 'podcast'
 * - Otherwise → 'music' (multi-tag playlists like ["Hip-Hop","Podcast"] count as music)
 */
function getPlaylistDomain(playlistGenreStr: string): Domain {
  const tags = parsePlaylistGenres(playlistGenreStr).map((g) => g.toLowerCase());
  const coreTags = tags.filter((t) => CORE_GENRES.has(t));
  if (coreTags.length === 0) return 'music';
  return coreTags.every((t) => t === PODCAST_GENRE) ? 'podcast' : 'music';
}

/** Domain guardrail — true if the playlist may be assigned to this user domain. */
function isDomainCompatible(playlistGenreStr: string, userDomain: Domain): boolean {
  const playlistDomain = getPlaylistDomain(playlistGenreStr);
  return playlistDomain === userDomain;
}

// ── Public helpers ──────────────────────────────────────────────────────────

export function extractTrackIdFromUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  const patterns = [
    /spotify\.com\/track\/([a-zA-Z0-9]+)(?:[?&]|$)/,
    /open\.spotify\.com\/track\/([a-zA-Z0-9]+)(?:[?&]|$)/,
    /spotify:track:([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export async function getExcludedPlaylistsForTrack(
  supabase: any,
  trackId: string,
  excludeCampaignId?: string
): Promise<string[]> {
  if (!trackId) return [];

  try {
    let query = supabase
      .from('marketing_campaigns')
      .select('id, playlist_assignments, order_number, song_name')
      .eq('track_id', trackId)
      .eq('campaign_status', 'Running');

    if (excludeCampaignId) {
      query = query.neq('id', excludeCampaignId);
    }

    const { data: existingCampaigns, error } = await query;

    if (error || !existingCampaigns?.length) return [];

    const ids: string[] = [];
    for (const campaign of existingCampaigns) {
      if (Array.isArray(campaign.playlist_assignments)) {
        for (const a of campaign.playlist_assignments) {
          if (a.id && a.id !== 'empty') ids.push(a.id);
        }
      }
    }

    const unique = [...new Set(ids)];
    console.log(`🚫 DUPLICATE-PROTECTION: ${unique.length} playlists excluded for track ${trackId}`);
    return unique;
  } catch (error) {
    console.error('🚫 DUPLICATE-PROTECTION: Error:', error);
    return [];
  }
}

// ── Scoring ─────────────────────────────────────────────────────────────────

interface ScoredPlaylist {
  id: string;
  name: string;
  genre: string;
  score: number;
  overlapCount: number;
  hasCoreGenreMatch: boolean;
  cachedSaves: number;
  domain: Domain;
}

function scorePlaylist(
  playlistGenreStr: string,
  requestedSet: Map<string, keyof typeof TIER_WEIGHTS>
): { score: number; overlapCount: number; hasCoreGenreMatch: boolean } {
  const playlistGenres = parsePlaylistGenres(playlistGenreStr).map((g) => g.toLowerCase());

  let score = 0;
  let overlapCount = 0;
  let hasCoreGenreMatch = false;

  for (const pg of playlistGenres) {
    const tier = requestedSet.get(pg);
    if (tier) {
      score += TIER_WEIGHTS[tier];
      overlapCount++;
      if (tier === 'genre') hasCoreGenreMatch = true;
    }
  }

  return { score, overlapCount, hasCoreGenreMatch };
}

/** Deterministic comparator: score → overlap → cached_saves → name asc. */
function compareScored(a: ScoredPlaylist, b: ScoredPlaylist): number {
  if (b.score !== a.score) return b.score - a.score;
  if (b.overlapCount !== a.overlapCount) return b.overlapCount - a.overlapCount;
  if (b.cachedSaves !== a.cachedSaves) return b.cachedSaves - a.cachedSaves;
  return a.name.localeCompare(b.name);
}

// ── Main assignment function ────────────────────────────────────────────────

export async function getAvailablePlaylistsWithProtection(
  supabase: any,
  userGenre: string,
  playlistsNeeded: number,
  trackId: string,
  excludeCampaignId?: string
): Promise<any[]> {
  // Normalize and tier-classify the requested genres
  const rawRequested = parsePlaylistGenres(userGenre);
  const requestedGenres = normalizeUserGenres(rawRequested);
  const userDomain: Domain = detectUserDomain(requestedGenres);

  console.log(
    `🎵 ASSIGNMENT: Need ${playlistsNeeded} playlists | domain="${userDomain}" | requested=[${requestedGenres.join(', ') || 'none'}]${
      rawRequested.join('|') !== requestedGenres.join('|')
        ? ` (normalized from [${rawRequested.join(', ')}])`
        : ''
    }`
  );

  // Build a map of requested genres → their tier for O(1) lookup during scoring
  const requestedMap = new Map<string, keyof typeof TIER_WEIGHTS>();
  for (const g of requestedGenres) {
    const tier = getTier(g);
    if (tier) requestedMap.set(g.toLowerCase(), tier);
  }

  // Duplicate protection — never co-place the same track on the same playlist
  const excludedPlaylistIds = await getExcludedPlaylistsForTrack(
    supabase,
    trackId,
    excludeCampaignId
  );

  // Query eligible playlists. Trust health_status from the DB; humans/refreshers maintain it.
  // We pull cached_saves so we can use it as a popularity tiebreaker.
  let query = supabase
    .from('playlist_network')
    .select('id, playlist_name, genre, health_status, cached_saves')
    .eq('is_active', true)
    .in('health_status', ['active', 'public']);

  if (excludedPlaylistIds.length > 0) {
    query = query.not('id', 'in', `(${excludedPlaylistIds.join(',')})`);
  }

  const { data: rawEligiblePlaylists, error } = await query;

  if (error) {
    console.error('🚫 ASSIGNMENT: Error fetching playlists:', error);
    return [];
  }

  // ── Belt-and-suspenders defensive filter ────────────────────────────────
  // Even though the SQL filter already excludes 'removed'/'private'/etc.,
  // we double-check in app code in case the column ever gains a new disallowed
  // value or an 'active' flag drifts. This is the immutable rule the user
  // explicitly called out: a 'removed' playlist must NEVER reach the UI.
  const eligiblePlaylists = (rawEligiblePlaylists || []).filter((p: any) => {
    const status = (p.health_status || '').toString().toLowerCase();
    if (FORBIDDEN_HEALTH_STATUSES.has(status)) return false;
    if (p.is_active === false) return false;
    return true;
  });

  if ((rawEligiblePlaylists || []).length !== eligiblePlaylists.length) {
    console.warn(
      `🛡️  ASSIGNMENT: Defensive filter dropped ${
        (rawEligiblePlaylists || []).length - eligiblePlaylists.length
      } playlist(s) that slipped through the SQL guard`
    );
  }

  // Score every playlist (and tag with domain + cached_saves for tiebreaking)
  const scored: ScoredPlaylist[] = [];
  for (const p of eligiblePlaylists) {
    const { score, overlapCount, hasCoreGenreMatch } = scorePlaylist(p.genre, requestedMap);
    scored.push({
      id: p.id,
      name: p.playlist_name,
      genre: p.genre,
      score,
      overlapCount,
      hasCoreGenreMatch,
      cachedSaves: typeof p.cached_saves === 'number' ? p.cached_saves : 0,
      domain: getPlaylistDomain(p.genre),
    });
  }

  // ── Pass 1: core-genre matches, domain-compatible ────────────────────────
  const coreMatches = scored
    .filter((p) => p.hasCoreGenreMatch && p.domain === userDomain)
    .sort(compareScored);

  let selectedPlaylists = coreMatches.slice(0, playlistsNeeded).map((p) => ({
    id: p.id,
    name: p.name,
    genre: p.genre,
  }));

  console.log(
    `🎵 ASSIGNMENT: Pass 1 (core-genre, ${userDomain}) — ${selectedPlaylists.length}/${playlistsNeeded} filled (${coreMatches.length} candidates)`
  );

  // Audit log: top picks for visibility
  if (coreMatches.length > 0) {
    const topPreview = coreMatches.slice(0, Math.min(3, selectedPlaylists.length));
    for (const t of topPreview) {
      console.log(
        `   ✅ "${t.name}" — score ${t.score}, overlap ${t.overlapCount}, saves ${t.cachedSaves} | tags: ${t.genre}`
      );
    }
  }

  // ── Pass 2: scored General fallback, domain-compatible ───────────────────
  if (selectedPlaylists.length < playlistsNeeded) {
    const selectedIds = new Set(selectedPlaylists.map((p) => p.id));
    const remaining = playlistsNeeded - selectedPlaylists.length;

    const generalCandidates = scored
      .filter(
        (p) =>
          !selectedIds.has(p.id) &&
          p.domain === userDomain &&
          playlistHasGenre(p.genre, 'General')
      )
      .sort(compareScored);

    const generalFill = generalCandidates.slice(0, remaining).map((p) => ({
      id: p.id,
      name: p.name,
      genre: p.genre,
    }));

    if (generalFill.length > 0) {
      selectedPlaylists = [...selectedPlaylists, ...generalFill];
      console.log(
        `🎵 ASSIGNMENT: Pass 2 (General, ${userDomain}) — added ${generalFill.length} (${generalCandidates.length} candidates)`
      );
      const topGeneral = generalCandidates.slice(0, Math.min(3, generalFill.length));
      for (const t of topGeneral) {
        console.log(
          `   🎯 "${t.name}" — score ${t.score}, overlap ${t.overlapCount}, saves ${t.cachedSaves} | tags: ${t.genre}`
        );
      }
    } else {
      console.log(
        `🎵 ASSIGNMENT: Pass 2 (General, ${userDomain}) — no domain-compatible General playlists available`
      );
    }
  }

  // ── Empty slot placeholders ──────────────────────────────────────────────
  if (selectedPlaylists.length < playlistsNeeded) {
    const emptyCount = playlistsNeeded - selectedPlaylists.length;
    for (let i = 0; i < emptyCount; i++) {
      selectedPlaylists.push({ id: 'empty', name: '-Empty-', genre: 'empty' });
    }
    console.log(
      `📭 ASSIGNMENT: Added ${emptyCount} empty slot(s) — admin can fill manually`
    );
  }

  const realCount = selectedPlaylists.filter((p) => p.id !== 'empty').length;
  const emptySlots = selectedPlaylists.length - realCount;
  console.log(
    `🎵 ASSIGNMENT: Final — ${realCount} real + ${emptySlots} empty = ${selectedPlaylists.length} total`
  );
  return selectedPlaylists;
}
