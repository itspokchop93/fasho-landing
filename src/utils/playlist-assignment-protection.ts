/**
 * Playlist assignment algorithm with weighted genre scoring and duplicate protection.
 *
 * Scoring tiers (from GENRE_GROUPS in constants/genres.ts):
 *   - Core Genre match (Hip-Hop, R&B, Pop …) = 10 pts each
 *   - Vibe match (Chill, Happy, Sad …)       =  3 pts each
 *   - Sound match (Piano, Acoustic …)        =  2 pts each
 *
 * A playlist MUST match at least one core genre to be eligible (unless tagged General).
 * Playlists are sorted by score descending; ties broken by total overlap count.
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

function getTier(genre: string): keyof typeof TIER_WEIGHTS | null {
  const g = genre.toLowerCase();
  if (CORE_GENRES.has(g)) return 'genre';
  if (VIBES.has(g)) return 'vibe';
  if (SOUNDS.has(g)) return 'sound';
  return null;
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
          if (a.id) ids.push(a.id);
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

// ── Main assignment function ────────────────────────────────────────────────

export async function getAvailablePlaylistsWithProtection(
  supabase: any,
  userGenre: string,
  playlistsNeeded: number,
  trackId: string,
  excludeCampaignId?: string
): Promise<any[]> {
  const requestedGenres = parsePlaylistGenres(userGenre);
  console.log(
    `🎵 ASSIGNMENT: Starting weighted assignment for ${playlistsNeeded} playlists, vibes: "${requestedGenres.join(', ') || 'None'}"`
  );

  // Build a map of requested genres → their tier for O(1) lookup during scoring
  const requestedMap = new Map<string, keyof typeof TIER_WEIGHTS>();
  for (const g of requestedGenres) {
    const tier = getTier(g);
    if (tier) requestedMap.set(g.toLowerCase(), tier);
  }

  // Duplicate protection
  const excludedPlaylistIds = await getExcludedPlaylistsForTrack(supabase, trackId, excludeCampaignId);

  // Query eligible playlists — NO capacity filter, trust existing health_status
  let query = supabase
    .from('playlist_network')
    .select('id, playlist_name, genre, health_status')
    .eq('is_active', true)
    .in('health_status', ['active', 'public']);

  if (excludedPlaylistIds.length > 0) {
    query = query.not('id', 'in', `(${excludedPlaylistIds.join(',')})`);
  }

  const { data: eligiblePlaylists, error } = await query;

  if (error) {
    console.error('🚫 ASSIGNMENT: Error fetching playlists:', error);
    return [];
  }

  // Score every playlist
  const scored: ScoredPlaylist[] = [];
  for (const p of eligiblePlaylists || []) {
    const { score, overlapCount, hasCoreGenreMatch } = scorePlaylist(p.genre, requestedMap);
    scored.push({
      id: p.id,
      name: p.playlist_name,
      genre: p.genre,
      score,
      overlapCount,
      hasCoreGenreMatch,
    });
  }

  // Guardrail: only playlists with at least one core genre match
  const coreMatches = scored
    .filter((p) => p.hasCoreGenreMatch)
    .sort((a, b) => b.score - a.score || b.overlapCount - a.overlapCount);

  let selectedPlaylists = coreMatches.slice(0, playlistsNeeded).map((p) => ({
    id: p.id,
    name: p.name,
    genre: p.genre,
  }));

  console.log(
    `🎵 ASSIGNMENT: ${selectedPlaylists.length} core-genre playlists selected (top scores)`
  );

  // Fallback: General playlists
  if (selectedPlaylists.length < playlistsNeeded) {
    const selectedIds = new Set(selectedPlaylists.map((p) => p.id));
    const remaining = playlistsNeeded - selectedPlaylists.length;
    const generalFill = (eligiblePlaylists || [])
      .filter((p: any) => !selectedIds.has(p.id) && playlistHasGenre(p.genre, 'General'))
      .slice(0, remaining)
      .map((p: any) => ({ id: p.id, name: p.playlist_name, genre: p.genre }));

    if (generalFill.length > 0) {
      selectedPlaylists = [...selectedPlaylists, ...generalFill];
      console.log(`🎵 ASSIGNMENT: Added ${generalFill.length} General playlists as fallback`);
    }
  }

  // Empty slot placeholders
  if (selectedPlaylists.length < playlistsNeeded) {
    const emptyCount = playlistsNeeded - selectedPlaylists.length;
    for (let i = 0; i < emptyCount; i++) {
      selectedPlaylists.push({ id: 'empty', name: '-Empty-', genre: 'empty' });
    }
    console.log(`📭 ASSIGNMENT: Added ${emptyCount} empty slots`);
  }

  console.log(
    `🎵 ASSIGNMENT: Final — ${selectedPlaylists.filter((p) => p.id !== 'empty').length} real + ${selectedPlaylists.filter((p) => p.id === 'empty').length} empty = ${selectedPlaylists.length} total`
  );
  return selectedPlaylists;
}
