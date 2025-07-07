import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../../../utils/supabase/server';
import { sendOrderStatusChangeEmail } from '../../../../utils/email/emailService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { orderId } = req.query;

  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  const supabase = createClient(req, res);

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      console.log(`🔍 ADMIN-ORDER-DETAIL: Fetching order details for: ${orderId}`);

      // Fetch order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('🔍 ADMIN-ORDER-DETAIL: Error fetching order:', orderError);
        return res.status(404).json({ error: 'Order not found' });
      }

      // Fetch order items with fresh data
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.error('🔍 ADMIN-ORDER-DETAIL: Error fetching order items:', itemsError);
        return res.status(500).json({ error: 'Failed to fetch order items' });
      }

      // Fetch add-on items
      const { data: addOnItems, error: addOnError } = await supabase
        .from('add_on_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (addOnError) {
        console.error('🔍 ADMIN-ORDER-DETAIL: Error fetching add-on items:', addOnError);
        // Don't fail the request, just log the error
      }

      console.log('🔍 ADMIN-ORDER-DETAIL: Found', orderItems?.length || 0, 'order items');
      console.log('🔍 ADMIN-ORDER-DETAIL: Found', addOnItems?.length || 0, 'add-on items');

      // Debug: Log current track information
      if (orderItems && orderItems.length > 0) {
        console.log('🔍 ADMIN-ORDER-DETAIL: Current track info in database:', {
          itemId: orderItems[0].id,
          trackId: orderItems[0].track_id,
          trackTitle: orderItems[0].track_title,
          trackArtist: orderItems[0].track_artist,
          trackUrl: orderItems[0].track_url,
          updatedAt: orderItems[0].updated_at
        });
      }

      // Mark order as viewed by admin if not already viewed
      if (!order.first_viewed_at) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            first_viewed_at: new Date().toISOString(),
            viewed_by_admin: user.id
          })
          .eq('id', orderId);

        if (updateError) {
          console.error('🔍 ADMIN-ORDER-DETAIL: Error marking order as viewed:', updateError);
        } else {
          console.log(`🔍 ADMIN-ORDER-DETAIL: Marked order ${orderId} as viewed by admin`);
        }
      }

      // Transform add-on items to match the expected format
      const transformedAddOnItems = addOnItems?.map(item => ({
        id: item.addon_id,
        name: item.addon_name,
        description: item.addon_description,
        emoji: item.emoji || '🎵',
        originalPrice: item.original_price,
        price: item.discounted_price,
        isOnSale: item.is_discounted
      })) || [];

      console.log(`🔍 ADMIN-ORDER-DETAIL: Returning order details for: ${order.order_number}`);
      
      return res.status(200).json({
        success: true,
        order: {
          ...order,
          items: orderItems,
          addOnItems: transformedAddOnItems
        }
      });
    } else if (req.method === 'PUT') {
      // Update order details
      const { status, admin_notes, track_updates } = req.body;

      console.log(`🔍 ADMIN-ORDER-UPDATE: Updating order ${orderId}:`, {
        status,
        hasAdminNotes: !!admin_notes,
        hasTrackUpdates: !!track_updates && track_updates.length > 0
      });

      // First, get the current order data for email notification
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) {
        console.error('🔍 ADMIN-ORDER-UPDATE: Error fetching current order:', fetchError);
        return res.status(500).json({ error: 'Failed to fetch current order' });
      }

      // Update order status and notes
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (status) {
        updateData.status = status;
      }

      if (admin_notes !== undefined) {
        updateData.admin_notes = admin_notes;
      }

      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (orderUpdateError) {
        console.error('🔍 ADMIN-ORDER-UPDATE: Error updating order:', orderUpdateError);
        return res.status(500).json({ error: 'Failed to update order' });
      }

      // CRITICAL: Send email notification if status changed
      if (status && status !== currentOrder.status) {
        console.log(`📧 ADMIN-ORDER-UPDATE: Status changed from ${currentOrder.status} to ${status}, sending email notification...`);
        
        try {
          // Pass the server-side Supabase client to the email service
          const emailSent = await sendOrderStatusChangeEmail(currentOrder, status, supabase);
          
          if (emailSent) {
            console.log(`📧 ADMIN-ORDER-UPDATE: ✅ Email notification sent successfully for order ${orderId}`);
          } else {
            console.log(`📧 ADMIN-ORDER-UPDATE: ❌ Email notification failed for order ${orderId}`);
          }
        } catch (emailError) {
          console.error(`📧 ADMIN-ORDER-UPDATE: ❌ Error sending email notification for order ${orderId}:`, emailError);
          // Don't fail the entire request if email fails
        }
      }

      // Update track URLs if provided
      if (track_updates && track_updates.length > 0) {
        for (const trackUpdate of track_updates) {
          const { item_id, track_url } = trackUpdate;
          
          if (item_id && track_url) {
            const { error: itemUpdateError } = await supabase
              .from('order_items')
              .update({
                track_url,
                updated_at: new Date().toISOString()
              })
              .eq('id', item_id);

            if (itemUpdateError) {
              console.error('🔍 ADMIN-ORDER-UPDATE: Error updating track URL:', itemUpdateError);
              return res.status(500).json({ error: 'Failed to update track URL' });
            }
          }
        }
      }

      console.log(`🔍 ADMIN-ORDER-UPDATE: Successfully updated order ${orderId}`);
      
      return res.status(200).json({
        success: true,
        message: 'Order updated successfully'
      });
    } else {
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('🔍 ADMIN-ORDER-DETAIL: Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 