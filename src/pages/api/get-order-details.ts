import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../utils/supabase/server';

interface OrderDetails {
  id: string;
  orderNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  customerEmail: string;
  customerName: string;
  couponId?: string | null;
  couponCode?: string | null;
  couponDiscount?: number;
  createdAt: string;
  items: Array<{
    track: {
      id: string;
      title: string;
      artist: string;
      imageUrl: string;
      url: string;
    };
    package: {
      id: string;
      name: string;
      price: number;
      plays: string;
      placements: string;
      description: string;
    };
    originalPrice: number;
    discountedPrice: number;
    isDiscounted: boolean;
  }>;
  addOnItems?: Array<{
    id: string;
    name: string;
    emoji: string;
    price: number;
    originalPrice: number;
    isOnSale: boolean;
  }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { orderNumber } = req.query;

    if (!orderNumber || typeof orderNumber !== 'string') {
      return res.status(400).json({ success: false, message: 'Order number is required' });
    }

    console.log('🔍 GET-ORDER-DETAILS: Fetching order details for:', orderNumber);

    const supabase = createAdminClient();

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single();

    if (orderError || !order) {
      console.log('🔍 GET-ORDER-DETAILS: Order not found:', orderNumber);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    console.log('🔍 GET-ORDER-DETAILS: Order found:', order.id);

    // Check if order is within 10-minute window
    const orderCreatedAt = new Date(order.created_at);
    const now = new Date();
    const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes
    const timeDifference = now.getTime() - orderCreatedAt.getTime();

    console.log('🔍 GET-ORDER-DETAILS: Order created:', orderCreatedAt.toISOString());
    console.log('🔍 GET-ORDER-DETAILS: Current time:', now.toISOString());
    console.log('🔍 GET-ORDER-DETAILS: Time difference (ms):', timeDifference);
    console.log('🔍 GET-ORDER-DETAILS: 10-minute limit (ms):', tenMinutesInMs);

    if (timeDifference > tenMinutesInMs) {
      console.log('🔍 GET-ORDER-DETAILS: Order has expired (> 10 minutes)');
      return res.status(410).json({ 
        success: false, 
        message: 'Order thank you page has expired',
        expired: true 
      });
    }

    // Get order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    if (itemsError) {
      console.error('🔍 GET-ORDER-DETAILS: Error fetching order items:', itemsError);
      return res.status(500).json({ success: false, message: 'Failed to fetch order items' });
    }

    // Get add-on items
    const { data: addOnItems, error: addOnError } = await supabase
      .from('add_on_items')
      .select('*')
      .eq('order_id', order.id);

    if (addOnError) {
      console.error('🔍 GET-ORDER-DETAILS: Error fetching add-on items:', addOnError);
      // Don't fail the request, just log the error
    }

    console.log('🔍 GET-ORDER-DETAILS: Found', orderItems?.length || 0, 'order items');
    console.log('🔍 GET-ORDER-DETAILS: Found', addOnItems?.length || 0, 'add-on items');

    // Transform order items to match the expected format
    const transformedItems = orderItems?.map((item: any) => ({
      track: {
        id: item.track_id,
        title: item.track_title,
        artist: item.track_artist || '',
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
    })) || [];

    // Transform add-on items to match the expected format
    const transformedAddOnItems = addOnItems?.map((item: any) => ({
      id: item.addon_id,
      name: item.addon_name,
      emoji: item.emoji || '🎵',
      price: Math.round(item.discounted_price / 100), // Convert cents to dollars
      originalPrice: Math.round(item.original_price / 100), // Convert cents to dollars
      isOnSale: item.is_discounted
    })) || [];

    const orderDetails: OrderDetails = {
      id: order.id,
      orderNumber: order.order_number,
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      couponId: order.coupon_id,
      couponCode: order.coupon_code,
      couponDiscount: order.coupon_discount,
      createdAt: order.created_at,
      items: transformedItems,
      addOnItems: transformedAddOnItems.length > 0 ? transformedAddOnItems : undefined
    };

    console.log('🔍 GET-ORDER-DETAILS: Returning order details for:', orderNumber);

    return res.status(200).json({
      success: true,
      orderDetails,
      timeRemaining: Math.max(0, tenMinutesInMs - timeDifference)
    });

  } catch (error) {
    console.error('🔍 GET-ORDER-DETAILS: Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 