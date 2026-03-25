import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../utils/supabase/server';
import {
  buildIdentifiersToCheck,
  evaluateBlacklistResults,
  extractSpotifyArtistId,
  getClientIP,
  type BlacklistCheckData,
  type BlacklistIdentifierRow,
} from '../../utils/blacklist';

// Simple in-memory rate limiter: max 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodically clean up stale entries (runs at most once per 5 min)
let lastCleanup = Date.now();
function cleanupRateLimits() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ blocked: false, error: 'Method not allowed' });
  }

  const clientIP = getClientIP(req);
  console.log(`🛡️ BLACKLIST-CHECK: Client IP captured: ${clientIP} | x-forwarded-for: ${req.headers['x-forwarded-for'] || 'none'} | x-real-ip: ${req.headers['x-real-ip'] || 'none'}`);

  cleanupRateLimits();
  if (isRateLimited(clientIP)) {
    return res.status(429).json({ blocked: false, error: 'Too many requests' });
  }

  try {
    const {
      email,
      phone,
      billingAddress,
      spotifyArtistUrls,
      spotifyTrackIds,
      userId,
      deviceFingerprint,
    } = req.body || {};

    // Convert artist URLs to IDs
    const spotifyArtistIds: string[] = [];
    if (Array.isArray(spotifyArtistUrls)) {
      for (const url of spotifyArtistUrls) {
        const id = extractSpotifyArtistId(url);
        if (id) spotifyArtistIds.push(id);
      }
    }

    const checkData: BlacklistCheckData = {
      email,
      phone,
      billingInfo: billingAddress || undefined,
      spotifyArtistIds: spotifyArtistIds.length > 0 ? spotifyArtistIds : undefined,
      spotifyTrackIds: Array.isArray(spotifyTrackIds) && spotifyTrackIds.length > 0 ? spotifyTrackIds : undefined,
      userId,
      deviceFingerprint,
      ip: clientIP,
    };

    const identifiersToCheck = buildIdentifiersToCheck(checkData);
    console.log(`🛡️ BLACKLIST-CHECK: Identifiers built (${identifiersToCheck.length}):`, identifiersToCheck.map(i => `${i.match_type}=${i.match_value.slice(0, 20)}...`));

    if (identifiersToCheck.length === 0) {
      console.log('🛡️ BLACKLIST-CHECK: No identifiers to check, allowing through');
      return res.status(200).json({ blocked: false });
    }

    const supabase = createAdminClient();

    // Query: get all identifiers whose match_value is in our set, joined with active blacklist entries.
    // Then filter client-side to ensure match_type also matches (safe from PostgREST special char issues).
    const matchValues = identifiersToCheck.map(p => p.match_value);

    const { data: matchedRows, error: queryError } = await supabase
      .from('blacklist_identifiers')
      .select(`
        id,
        blacklist_id,
        match_type,
        match_value,
        is_strong,
        created_at,
        blacklist_customers!inner (
          id,
          is_active
        )
      `)
      .in('match_value', matchValues)
      .eq('blacklist_customers.is_active', true);

    if (queryError) {
      console.error('🛡️ BLACKLIST-CHECK: Query error:', queryError);
      return res.status(200).json({ blocked: false });
    }

    console.log(`🛡️ BLACKLIST-CHECK: Raw DB matches: ${matchedRows?.length || 0}`);
    if (matchedRows && matchedRows.length > 0) {
      console.log('🛡️ BLACKLIST-CHECK: Raw matched rows:', matchedRows.map((r: any) => `${r.match_type}=${r.match_value.slice(0, 20)}...`));
    }

    // Build a lookup set for exact (type, value) pair matching
    const checkSet = new Set(identifiersToCheck.map(p => `${p.match_type}::${p.match_value}`));

    const rows: BlacklistIdentifierRow[] = (matchedRows || [])
      .filter((r: any) => checkSet.has(`${r.match_type}::${r.match_value}`))
      .map((r: any) => ({
        id: r.id,
        blacklist_id: r.blacklist_id,
        match_type: r.match_type,
        match_value: r.match_value,
        is_strong: r.is_strong,
        created_at: r.created_at,
      }));

    console.log(`🛡️ BLACKLIST-CHECK: Filtered matches after type+value check: ${rows.length}`);
    if (rows.length > 0) {
      console.log('🛡️ BLACKLIST-CHECK: Matched entries:', rows.map(r => `${r.match_type}=${r.match_value.slice(0, 20)}... (strong=${r.is_strong})`));
    }

    const evaluation = evaluateBlacklistResults(rows);
    console.log(`🛡️ BLACKLIST-CHECK: Evaluation result: blocked=${evaluation.blocked}, matchedTypes=${evaluation.matchedTypes?.join(',') || 'none'}`);

    if (!evaluation.blocked) {
      return res.status(200).json({ blocked: false });
    }

    // Fetch configurable block message
    let blockMessage = 'Error: You are not allowed to make purchases on FASHO.co or any of our partner websites. This attempt has been logged.';
    try {
      const { data: settingRow } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'blacklist_message')
        .single();
      if (settingRow?.setting_value) {
        blockMessage = settingRow.setting_value;
      }
    } catch {
      // Use default message
    }

    // Log the blocked attempt
    try {
      const billingHash = identifiersToCheck.find(i => i.match_type === 'billing_address')?.match_value || null;
      const artistIds = identifiersToCheck.filter(i => i.match_type === 'spotify_artist').map(i => i.match_value);
      const trackIds = identifiersToCheck.filter(i => i.match_type === 'spotify_track').map(i => i.match_value);

      await supabase.from('blacklist_check_logs').insert({
        blacklist_id: evaluation.matchedBlacklistId,
        matched_types: evaluation.matchedTypes,
        matched_values: rows.filter(r => r.blacklist_id === evaluation.matchedBlacklistId).map(r => r.match_value),
        attempted_email: email || null,
        attempted_name: null,
        attempted_phone: phone || null,
        attempted_ip: clientIP,
        attempted_fingerprint: deviceFingerprint || null,
        attempted_billing_hash: billingHash,
        attempted_spotify_artist: artistIds.length > 0 ? artistIds[0] : null,
        attempted_spotify_tracks: trackIds,
        user_agent: req.headers['user-agent'] || null,
        request_metadata: {
          userId: userId || null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (logError) {
      console.error('Failed to log blacklist check:', logError);
    }

    return res.status(200).json({
      blocked: true,
      message: blockMessage,
    });
  } catch (error) {
    console.error('Blacklist check unexpected error:', error);
    // Fail open
    return res.status(200).json({ blocked: false });
  }
}
