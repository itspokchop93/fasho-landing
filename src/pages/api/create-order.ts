import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../utils/supabase/server';

interface OrderItem {
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
}

interface CreateOrderRequest {
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  customerEmail: string;
  customerName: string;
  billingInfo: {
    firstName: string;
    lastName: string;
    address: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  paymentData: {
    transactionId: string;
    authorization: string;
    accountNumber: string;
    accountType: string;
  };
  userId?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const supabase = createClient(req, res);
    const {
      items,
      subtotal,
      discount,
      total,
      customerEmail,
      customerName,
      billingInfo,
      paymentData,
      userId
    }: CreateOrderRequest = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order items are required' });
    }

    if (!subtotal || !total || !customerEmail || !customerName || !billingInfo || !paymentData) {
      return res.status(400).json({ success: false, message: 'Missing required order information' });
    }

    // Generate unique order number
    const orderNumber = await generateOrderNumber(supabase);
    
    // Create the order record
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          order_number: orderNumber,
          user_id: userId || null,
          customer_email: customerEmail,
          customer_name: customerName,
          subtotal: subtotal,
          discount: discount,
          total: total,
          status: 'completed',
          payment_status: 'paid',
          billing_info: billingInfo,
          payment_data: paymentData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return res.status(500).json({ success: false, message: 'Failed to create order' });
    }

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      track_id: item.track.id,
      track_title: item.track.title,
      track_artist: item.track.artist,
      track_image_url: item.track.imageUrl,
      track_url: item.track.url,
      package_id: item.package.id,
      package_name: item.package.name,
      package_price: item.package.price,
      package_plays: item.package.plays,
      package_placements: item.package.placements,
      package_description: item.package.description,
      original_price: item.originalPrice,
      discounted_price: item.discountedPrice,
      is_discounted: item.isDiscounted
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Try to cleanup the order if items failed
      await supabase.from('orders').delete().eq('id', order.id);
      return res.status(500).json({ success: false, message: 'Failed to create order items' });
    }

    return res.status(200).json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.order_number,
        total: order.total,
        createdAt: order.created_at
      }
    });

  } catch (error) {
    console.error('Error in create-order API:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function generateOrderNumber(supabase: any): Promise<string> {
  try {
    // Get the latest order number to determine the next sequence
    const { data: latestOrder, error } = await supabase
      .from('orders')
      .select('order_number')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching latest order:', error);
      // If we can't fetch, start with 3001
      return 'FASHO-3001';
    }

    let nextNumber = 3001; // Starting number

    if (latestOrder && latestOrder.length > 0) {
      const lastOrderNumber = latestOrder[0].order_number;
      // Extract the number part (e.g., "FASHO-3005" -> "3005")
      const numberPart = lastOrderNumber.replace('FASHO-', '');
      const lastNumber = parseInt(numberPart, 10);
      
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Format as 4-digit number with leading zeros if needed
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    return `FASHO-${formattedNumber}`;

  } catch (error) {
    console.error('Error generating order number:', error);
    // Fallback to timestamp-based number if all else fails
    const timestamp = Date.now().toString().slice(-4);
    return `FASHO-3${timestamp}`;
  }
} 