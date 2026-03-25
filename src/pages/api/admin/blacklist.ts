import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, requireAdminRole } from '../../../utils/admin/auth';
import type { AdminUser } from '../../../utils/admin/auth';
import {
  normalizeEmail,
  normalizePhone,
  hashBillingAddress,
  hashStreetAddress,
  extractSpotifyArtistId,
  extractSpotifyTrackId,
} from '../../../utils/blacklist';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  const supabase = createAdminClient();

  switch (req.method) {
    case 'GET':
      return handleGet(supabase, req, res);
    case 'POST':
      return handlePost(supabase, req, res, adminUser);
    case 'PUT':
      return handlePut(supabase, req, res, adminUser);
    case 'PATCH':
      return handleBackfill(supabase, req, res, adminUser);
    case 'DELETE':
      return handleDelete(supabase, req, res, adminUser);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

// ─── GET: List blacklist entries ─────────────────────────────────────────────

async function handleGet(supabase: any, req: NextApiRequest, res: NextApiResponse) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';
    const offset = (page - 1) * limit;

    let query = supabase
      .from('blacklist_customers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);
    }

    const { data: customers, error, count } = await query;

    if (error) {
      console.error('Blacklist GET error:', error);
      return res.status(500).json({ error: 'Failed to fetch blacklist entries' });
    }

    // Fetch identifier counts and log counts for each entry
    const enriched = await Promise.all(
      (customers || []).map(async (customer: any) => {
        const [identRes, logRes] = await Promise.all([
          supabase
            .from('blacklist_identifiers')
            .select('id', { count: 'exact', head: true })
            .eq('blacklist_id', customer.id),
          supabase
            .from('blacklist_check_logs')
            .select('id, created_at', { count: 'exact' })
            .eq('blacklist_id', customer.id)
            .order('created_at', { ascending: false })
            .limit(1),
        ]);

        return {
          ...customer,
          identifier_count: identRes.count || 0,
          blocked_attempts_count: logRes.count || 0,
          last_blocked_at: logRes.data?.[0]?.created_at || null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      entries: enriched,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('Blacklist GET unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── POST: Create blacklist entry ────────────────────────────────────────────

async function handlePost(supabase: any, req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  try {
    const {
      customer_name,
      customer_email,
      reason,
      source_order_id,
      associated_order_numbers,
      metadata,
      identifiers: preBuiltIdentifiers,
      raw_identifiers,
    } = req.body;

    if (!customer_name || !customer_email || !reason) {
      return res.status(400).json({ error: 'customer_name, customer_email, and reason are required' });
    }

    // Build identifiers from raw data (server-side normalization)
    let identifiers = preBuiltIdentifiers;
    if (raw_identifiers && !preBuiltIdentifiers) {
      identifiers = [];
      const raw = raw_identifiers;
      if (raw.email) {
        identifiers.push({ match_type: 'email', match_value: normalizeEmail(raw.email), is_strong: true });
      }
      if (raw.phone) {
        const norm = normalizePhone(raw.phone);
        if (norm) identifiers.push({ match_type: 'phone', match_value: norm, is_strong: true });
      }
      if (raw.billingInfo?.address && raw.billingInfo?.city && raw.billingInfo?.zip && raw.billingInfo?.country) {
        identifiers.push({
          match_type: 'billing_address',
          match_value: hashBillingAddress(raw.billingInfo),
          is_strong: true,
        });
      }
      if (raw.billingInfo?.address) {
        identifiers.push({
          match_type: 'street_address',
          match_value: hashStreetAddress(raw.billingInfo.address),
          is_strong: true,
        });
      }
      if (raw.userId) {
        identifiers.push({ match_type: 'user_id', match_value: raw.userId, is_strong: true });
      }
      if (Array.isArray(raw.spotifyArtistUrls)) {
        for (const url of raw.spotifyArtistUrls) {
          const id = extractSpotifyArtistId(url);
          if (id) identifiers.push({ match_type: 'spotify_artist', match_value: id, is_strong: true });
        }
      }
      if (Array.isArray(raw.spotifyTrackUrls)) {
        for (const url of raw.spotifyTrackUrls) {
          const id = extractSpotifyTrackId(url);
          if (id) identifiers.push({ match_type: 'spotify_track', match_value: id, is_strong: true });
        }
      }
    }

    if (!identifiers || !Array.isArray(identifiers) || identifiers.length === 0) {
      return res.status(400).json({ error: 'At least one identifier is required' });
    }

    // Check for existing active blacklist entry for this email
    const { data: existing } = await supabase
      .from('blacklist_customers')
      .select('id')
      .eq('customer_email', customer_email.toLowerCase().trim())
      .eq('is_active', true)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'This customer is already blacklisted' });
    }

    // Create the parent record
    const { data: customerRow, error: customerError } = await supabase
      .from('blacklist_customers')
      .insert({
        customer_name,
        customer_email: customer_email.toLowerCase().trim(),
        reason,
        blacklisted_by: adminUser.email,
        source_order_id: source_order_id || null,
        associated_order_numbers: associated_order_numbers || [],
        metadata: metadata || {},
      })
      .select()
      .single();

    if (customerError) {
      console.error('Blacklist POST customer error:', customerError);
      return res.status(500).json({ error: 'Failed to create blacklist entry' });
    }

    // Create identifier rows
    const identifierRows = identifiers.map((ident: any) => ({
      blacklist_id: customerRow.id,
      match_type: ident.match_type,
      match_value: ident.match_value,
      is_strong: ident.is_strong !== undefined ? ident.is_strong : true,
    }));

    const { error: identError } = await supabase
      .from('blacklist_identifiers')
      .insert(identifierRows);

    if (identError) {
      console.error('Blacklist POST identifiers error:', identError);
      // Clean up the parent if identifiers failed
      await supabase.from('blacklist_customers').delete().eq('id', customerRow.id);
      return res.status(500).json({ error: 'Failed to create blacklist identifiers' });
    }

    return res.status(201).json({
      success: true,
      entry: customerRow,
      identifier_count: identifierRows.length,
    });
  } catch (error) {
    console.error('Blacklist POST unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PUT: Toggle active/inactive (un-blacklist) ─────────────────────────────

async function handlePut(supabase: any, req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  // Super admin only for un-blacklisting
  if (adminUser.role !== 'admin') {
    return res.status(403).json({ error: 'Super admin privileges required to modify blacklist entries' });
  }

  try {
    const { id, is_active } = req.body;

    if (!id || typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'id and is_active (boolean) are required' });
    }

    const { data, error } = await supabase
      .from('blacklist_customers')
      .update({
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Blacklist PUT error:', error);
      return res.status(500).json({ error: 'Failed to update blacklist entry' });
    }

    return res.status(200).json({ success: true, entry: data });
  } catch (error) {
    console.error('Blacklist PUT unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── DELETE: Permanently remove entry ────────────────────────────────────────

async function handleDelete(supabase: any, req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (adminUser.role !== 'admin') {
    return res.status(403).json({ error: 'Super admin privileges required to delete blacklist entries' });
  }

  try {
    const id = req.query.id as string || req.body?.id;

    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    const { error } = await supabase
      .from('blacklist_customers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Blacklist DELETE error:', error);
      return res.status(500).json({ error: 'Failed to delete blacklist entry' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Blacklist DELETE unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PATCH: Backfill street_address identifiers for existing entries ─────────

async function handleBackfill(supabase: any, req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (adminUser.role !== 'admin') {
    return res.status(403).json({ error: 'Super admin privileges required' });
  }

  try {
    const { data: customers, error } = await supabase
      .from('blacklist_customers')
      .select('id, source_order_id, metadata');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch blacklist entries' });
    }

    let added = 0;
    for (const customer of (customers || [])) {
      // Skip if already has street_address identifier
      const { data: existing } = await supabase
        .from('blacklist_identifiers')
        .select('id')
        .eq('blacklist_id', customer.id)
        .eq('match_type', 'street_address')
        .limit(1);

      if (existing && existing.length > 0) continue;

      let streetLine: string | null = null;

      // Try to get address from the source order's billing_info
      if (customer.source_order_id) {
        const { data: order } = await supabase
          .from('orders')
          .select('billing_info')
          .eq('id', customer.source_order_id)
          .single();

        if (order?.billing_info?.address) {
          streetLine = order.billing_info.address;
        }
      }

      // Fallback: parse from metadata.billingAddress formatted string
      if (!streetLine && customer.metadata?.billingAddress) {
        const parts = customer.metadata.billingAddress.split(',').map((s: string) => s.trim());
        if (parts[0]) streetLine = parts[0];
      }

      if (!streetLine) continue;

      const streetHash = hashStreetAddress(streetLine);
      await supabase.from('blacklist_identifiers').insert({
        blacklist_id: customer.id,
        match_type: 'street_address',
        match_value: streetHash,
        is_strong: true,
      });
      added++;
    }

    return res.status(200).json({ success: true, message: `Backfilled ${added} street_address identifiers` });
  } catch (error) {
    console.error('Blacklist PATCH backfill error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
