import crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BlacklistCheckData {
  email?: string;
  phone?: string;
  billingInfo?: {
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  spotifyArtistIds?: string[];
  spotifyTrackIds?: string[];
  userId?: string;
  deviceFingerprint?: string;
  ip?: string;
}

export interface BlacklistCheckResult {
  blocked: boolean;
  matchedBlacklistId?: string;
  matchedTypes?: string[];
  message?: string;
}

export interface IdentifierPair {
  match_type: string;
  match_value: string;
}

export interface BlacklistIdentifierRow {
  id: string;
  blacklist_id: string;
  match_type: string;
  match_value: string;
  is_strong: boolean;
  created_at: string;
}

export type MatchType =
  | 'email'
  | 'phone'
  | 'billing_address'
  | 'street_address'
  | 'spotify_artist'
  | 'spotify_track'
  | 'user_id'
  | 'device_fingerprint'
  | 'ip_address';

export const STRONG_TYPES: MatchType[] = [
  'email',
  'phone',
  'billing_address',
  'street_address',
  'spotify_artist',
  'spotify_track',
  'user_id',
];

export const WEAK_TYPES: MatchType[] = [
  'device_fingerprint',
  'ip_address',
];

// ─── Normalization ───────────────────────────────────────────────────────────

const GMAIL_DOMAINS = ['gmail.com', 'googlemail.com'];

export function normalizeEmail(email: string): string {
  if (!email) return '';
  let normalized = email.toLowerCase().trim();

  const atIdx = normalized.indexOf('@');
  if (atIdx === -1) return normalized;

  let local = normalized.slice(0, atIdx);
  const domain = normalized.slice(atIdx + 1);

  // Strip +alias
  const plusIdx = local.indexOf('+');
  if (plusIdx !== -1) {
    local = local.slice(0, plusIdx);
  }

  // Strip dots for Gmail
  if (GMAIL_DOMAINS.includes(domain)) {
    local = local.replace(/\./g, '');
  }

  return `${local}@${domain}`;
}

export function normalizePhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

const ADDRESS_ABBREVIATIONS: Record<string, string> = {
  'ST': 'STREET', 'AVE': 'AVENUE', 'DR': 'DRIVE', 'BLVD': 'BOULEVARD',
  'LN': 'LANE', 'RD': 'ROAD', 'CT': 'COURT', 'PL': 'PLACE',
  'APT': 'APARTMENT', 'STE': 'SUITE', 'FLR': 'FLOOR', 'BLDG': 'BUILDING',
  'HWY': 'HIGHWAY', 'PKY': 'PARKWAY', 'PKWY': 'PARKWAY', 'CIR': 'CIRCLE',
  'TER': 'TERRACE', 'TERR': 'TERRACE', 'TRL': 'TRAIL', 'WAY': 'WAY',
};

function standardizeAddress(raw: string): string {
  let s = raw.toUpperCase().trim();
  // Strip punctuation except spaces
  s = s.replace(/[.,#\-\/\\]/g, ' ');
  // Collapse multiple spaces
  s = s.replace(/\s+/g, ' ').trim();
  // Replace abbreviations (word-boundary safe)
  const words = s.split(' ');
  const expanded = words.map(w => ADDRESS_ABBREVIATIONS[w] || w);
  return expanded.join(' ');
}

export function hashBillingAddress(billingInfo: {
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}): string {
  const parts = [
    standardizeAddress(billingInfo.address),
    billingInfo.city.toUpperCase().trim(),
    billingInfo.state.toUpperCase().trim(),
    billingInfo.zip.toUpperCase().replace(/\s+/g, '').trim(),
    billingInfo.country.toUpperCase().trim(),
  ];
  const concatenated = parts.join('|');
  return crypto.createHash('sha256').update(concatenated).digest('hex');
}

export function hashStreetAddress(address: string): string {
  const standardized = standardizeAddress(address);
  return crypto.createHash('sha256').update(standardized).digest('hex');
}

// ─── Spotify ID Extraction ───────────────────────────────────────────────────

const SPOTIFY_ARTIST_RE = /(?:open\.spotify\.com\/artist\/)([a-zA-Z0-9]{22})/;
const SPOTIFY_TRACK_RE = /(?:open\.spotify\.com\/track\/)([a-zA-Z0-9]{22})/;
const SPOTIFY_ID_RE = /^[a-zA-Z0-9]{22}$/;

export function extractSpotifyArtistId(url: string): string | null {
  if (!url) return null;
  const m = url.match(SPOTIFY_ARTIST_RE);
  if (m) return m[1];
  if (SPOTIFY_ID_RE.test(url.trim())) return url.trim();
  return null;
}

export function extractSpotifyTrackId(url: string): string | null {
  if (!url) return null;
  const m = url.match(SPOTIFY_TRACK_RE);
  if (m) return m[1];
  if (SPOTIFY_ID_RE.test(url.trim())) return url.trim();
  return null;
}

// ─── Identifier Builder ─────────────────────────────────────────────────────

export function buildIdentifiersToCheck(data: BlacklistCheckData): IdentifierPair[] {
  const pairs: IdentifierPair[] = [];

  if (data.email) {
    const norm = normalizeEmail(data.email);
    if (norm) pairs.push({ match_type: 'email', match_value: norm });
  }

  if (data.phone) {
    const norm = normalizePhone(data.phone);
    if (norm) pairs.push({ match_type: 'phone', match_value: norm });
  }

  if (data.billingInfo && data.billingInfo.address && data.billingInfo.city && data.billingInfo.zip && data.billingInfo.country) {
    const hash = hashBillingAddress(data.billingInfo);
    pairs.push({ match_type: 'billing_address', match_value: hash });
  }

  if (data.billingInfo && data.billingInfo.address) {
    const streetHash = hashStreetAddress(data.billingInfo.address);
    pairs.push({ match_type: 'street_address', match_value: streetHash });
  }

  if (data.spotifyArtistIds) {
    for (const raw of data.spotifyArtistIds) {
      const id = extractSpotifyArtistId(raw);
      if (id) pairs.push({ match_type: 'spotify_artist', match_value: id });
    }
  }

  if (data.spotifyTrackIds) {
    for (const raw of data.spotifyTrackIds) {
      const id = extractSpotifyTrackId(raw);
      if (id) pairs.push({ match_type: 'spotify_track', match_value: id });
    }
  }

  if (data.userId) {
    pairs.push({ match_type: 'user_id', match_value: data.userId });
  }

  if (data.deviceFingerprint) {
    pairs.push({ match_type: 'device_fingerprint', match_value: data.deviceFingerprint });
  }

  if (data.ip && data.ip !== 'unknown') {
    pairs.push({ match_type: 'ip_address', match_value: data.ip });
  }

  return pairs;
}

// ─── Match Evaluation ────────────────────────────────────────────────────────

export interface EvaluationResult {
  blocked: boolean;
  matchedBlacklistId: string | null;
  matchedTypes: string[];
}

/**
 * Evaluate matched identifier rows to determine if the checkout should be blocked.
 *
 * Rules:
 *  - If ANY strong identifier matches, block immediately.
 *  - If 2+ weak identifiers match from the SAME blacklist_customers entry, block.
 *  - Otherwise, do not block.
 */
export function evaluateBlacklistResults(matchedRows: BlacklistIdentifierRow[]): EvaluationResult {
  if (!matchedRows || matchedRows.length === 0) {
    return { blocked: false, matchedBlacklistId: null, matchedTypes: [] };
  }

  // Group matched rows by blacklist_id
  const byEntry = new Map<string, BlacklistIdentifierRow[]>();
  for (const row of matchedRows) {
    const existing = byEntry.get(row.blacklist_id) || [];
    existing.push(row);
    byEntry.set(row.blacklist_id, existing);
  }

  for (const [blacklistId, rows] of byEntry) {
    // Check for any strong match
    const strongMatch = rows.find(r => r.is_strong);
    if (strongMatch) {
      return {
        blocked: true,
        matchedBlacklistId: blacklistId,
        matchedTypes: rows.map(r => r.match_type),
      };
    }

    // Check for 2+ weak matches from the same entry
    const weakMatches = rows.filter(r => !r.is_strong);
    if (weakMatches.length >= 2) {
      return {
        blocked: true,
        matchedBlacklistId: blacklistId,
        matchedTypes: weakMatches.map(r => r.match_type),
      };
    }
  }

  return { blocked: false, matchedBlacklistId: null, matchedTypes: [] };
}

// ─── IP Capture Utility ──────────────────────────────────────────────────────

import type { NextApiRequest } from 'next';

export function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];

  let ip: string;
  if (typeof forwarded === 'string') {
    ip = forwarded.split(',')[0].trim();
  } else if (typeof realIp === 'string') {
    ip = realIp.trim();
  } else {
    ip = req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
  }

  // Normalize IPv6 loopback to IPv4 for clarity
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
  }

  // Strip IPv6-mapped IPv4 prefix (e.g. "::ffff:203.0.113.42" → "203.0.113.42")
  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }

  return ip;
}
