import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';

interface StreamPurchaseRequest {
  playlistId: string;
  streamQty: number;
  drips: number;
  intervalMinutes: number;
}

interface StreamPurchase {
  id: string;
  playlistId: string;
  streamQty: number;
  drips: number;
  intervalMinutes: number;
  purchaseDate: string;
  nextPurchaseDate: string;
  createdAt: string;
  updatedAt: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  const supabase = createAdminClient();

  if (req.method === 'GET') {
    try {
      // Fetch all stream purchases with playlist information
      const { data: purchases, error } = await supabase
        .from('stream_purchases')
        .select(`
          id,
          playlist_id,
          stream_qty,
          drips,
          interval_minutes,
          purchase_date,
          next_purchase_date,
          created_at,
          updated_at,
          playlist_network (
            id,
            playlist_name,
            genre
          )
        `)
        .order('purchase_date', { ascending: false });

      if (error) {
        console.error('Error fetching stream purchases:', error);
        return res.status(500).json({ error: 'Failed to fetch stream purchases' });
      }

      // Transform the data to match the frontend interface (camelCase)
      const transformedPurchases = (purchases || []).map(purchase => ({
        id: purchase.id,
        playlistId: purchase.playlist_id,
        streamQty: purchase.stream_qty,
        drips: purchase.drips,
        intervalMinutes: purchase.interval_minutes,
        purchaseDate: purchase.purchase_date,
        nextPurchaseDate: purchase.next_purchase_date,
        createdAt: purchase.created_at,
        updatedAt: purchase.updated_at,
        playlist: purchase.playlist_network
      }));

      return res.status(200).json(transformedPurchases);
    } catch (error) {
      console.error('Error in GET stream purchases:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { purchaseId } = req.body;

      if (!purchaseId) {
        return res.status(400).json({ error: 'Purchase ID is required' });
      }

      // Delete the stream purchase record
      const { error: deleteError } = await supabase
        .from('stream_purchases')
        .delete()
        .eq('id', purchaseId);

      if (deleteError) {
        console.error('Error deleting stream purchase:', deleteError);
        return res.status(500).json({ error: 'Failed to delete stream purchase record' });
      }

      console.log(`🗑️ STREAM PURCHASE DELETED: ID ${purchaseId}`);

      return res.status(200).json({
        success: true,
        message: 'Stream purchase deleted successfully'
      });

    } catch (error) {
      console.error('Error in DELETE stream purchase:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { playlistId, streamQty, drips, intervalMinutes }: StreamPurchaseRequest = req.body;

      // Validate required fields
      if (!playlistId || !streamQty || !drips || !intervalMinutes) {
        return res.status(400).json({ 
          error: 'Missing required fields: playlistId, streamQty, drips, intervalMinutes' 
        });
      }

      // Validate data types and ranges
      if (typeof streamQty !== 'number' || streamQty <= 0) {
        return res.status(400).json({ error: 'Stream quantity must be a positive number' });
      }

      if (typeof drips !== 'number' || drips <= 0) {
        return res.status(400).json({ error: 'Drips must be a positive number' });
      }

      if (typeof intervalMinutes !== 'number' || intervalMinutes <= 0) {
        return res.status(400).json({ error: 'Interval minutes must be a positive number' });
      }

      // Verify playlist exists
      const { data: playlist, error: playlistError } = await supabase
        .from('playlist_network')
        .select('id, playlist_name')
        .eq('id', playlistId)
        .single();

      if (playlistError || !playlist) {
        return res.status(404).json({ error: 'Playlist not found' });
      }

      // Calculate next purchase date
      const purchaseDate = new Date();
      const totalMinutes = drips * intervalMinutes;
      const nextPurchaseDate = new Date(purchaseDate.getTime() + (totalMinutes * 60 * 1000));

      // Insert stream purchase record
      const { data: purchase, error: insertError } = await supabase
        .from('stream_purchases')
        .insert({
          playlist_id: playlistId,
          stream_qty: streamQty,
          drips,
          interval_minutes: intervalMinutes,
          purchase_date: purchaseDate.toISOString(),
          next_purchase_date: nextPurchaseDate.toISOString()
        })
        .select(`
          id,
          playlist_id,
          stream_qty,
          drips,
          interval_minutes,
          purchase_date,
          next_purchase_date,
          created_at,
          updated_at
        `)
        .single();

      if (insertError) {
        console.error('Error inserting stream purchase:', insertError);
        return res.status(500).json({ error: 'Failed to create stream purchase record' });
      }

      console.log(`✅ STREAM PURCHASE: Added ${streamQty} streams for "${playlist.playlist_name}" with ${drips} drips every ${intervalMinutes} minutes`);
      console.log(`📅 NEXT PURCHASE: ${nextPurchaseDate.toLocaleDateString()}`);

      // Transform the response to match frontend interface
      const transformedPurchase = {
        id: purchase.id,
        playlistId: purchase.playlist_id,
        streamQty: purchase.stream_qty,
        drips: purchase.drips,
        intervalMinutes: purchase.interval_minutes,
        purchaseDate: purchase.purchase_date,
        nextPurchaseDate: purchase.next_purchase_date,
        createdAt: purchase.created_at,
        updatedAt: purchase.updated_at
      };

      return res.status(201).json({
        success: true,
        purchase: transformedPurchase,
        message: `Stream purchase recorded for ${playlist.playlist_name}`
      });

    } catch (error) {
      console.error('Error in POST stream purchase:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAdminAuth(handler);
