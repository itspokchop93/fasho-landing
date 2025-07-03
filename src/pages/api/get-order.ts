import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const supabase = createClient(req, res);
    const { orderNumber, orderId } = req.query;

    if (!orderNumber && !orderId) {
      return res.status(400).json({ success: false, message: 'Order number or order ID is required' });
    }

    // Build query based on what's provided
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `);

    if (orderNumber) {
      query = query.eq('order_number', orderNumber);
    } else if (orderId) {
      query = query.eq('id', orderId);
    }

    const { data: order, error } = await query.single();

    if (error) {
      console.error('Error fetching order:', error);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Format the response to match the frontend expectations
    const formattedOrder = {
      id: order.id,
      orderNumber: order.order_number,
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      status: order.status,
      paymentStatus: order.payment_status,
      billingInfo: order.billing_info,
      paymentData: order.payment_data,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items: order.order_items.map((item: any) => ({
        id: item.id,
        track: {
          id: item.track_id,
          title: item.track_title,
          artist: item.track_artist,
          imageUrl: item.track_image_url,
          url: item.track_url
        },
        package: {
          id: item.package_id,
          name: item.package_name,
          price: item.package_price,
          plays: item.package_plays,
          placements: item.package_placements,
          description: item.package_description
        },
        originalPrice: item.original_price,
        discountedPrice: item.discounted_price,
        isDiscounted: item.is_discounted
      }))
    };

    return res.status(200).json({
      success: true,
      order: formattedOrder
    });

  } catch (error) {
    console.error('Error in get-order API:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
} 