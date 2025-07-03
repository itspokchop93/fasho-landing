import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const supabase = createClient(req, res);
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get query parameters
    const { limit = '10', offset = '0' } = req.query;
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    // Fetch user's orders with items
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (error) {
      console.error('Error fetching user orders:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }

    // Format the response
    const formattedOrders = orders.map((order: any) => ({
      id: order.id,
      orderNumber: order.order_number,
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      status: order.status,
      paymentStatus: order.payment_status,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      itemCount: order.order_items.length,
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
    }));

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('Error counting user orders:', countError);
    }

    return res.status(200).json({
      success: true,
      orders: formattedOrders,
      pagination: {
        total: count || 0,
        limit: limitNum,
        offset: offsetNum,
        hasMore: (count || 0) > offsetNum + limitNum
      }
    });

  } catch (error) {
    console.error('Error in get-user-orders API:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
} 