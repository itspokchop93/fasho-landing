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
    console.log('🔍 CREATE-ORDER: Starting order creation process');
    console.log('🔍 CREATE-ORDER: Request body:', JSON.stringify(req.body, null, 2));
    
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
    
    console.log('🔍 CREATE-ORDER: Extracted data:', {
      itemsCount: items?.length,
      subtotal,
      discount,
      total,
      customerEmail,
      customerName,
      userId,
      hasBillingInfo: !!billingInfo,
      hasPaymentData: !!paymentData
    });

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order items are required' });
    }

    if (!subtotal || !total || !customerEmail || !customerName || !billingInfo || !paymentData) {
      return res.status(400).json({ success: false, message: 'Missing required order information' });
    }

    // Generate unique order number with retry logic
    console.log('🔍 CREATE-ORDER: Generating order number...');
    let orderNumber: string;
    let order: any;
    let orderCreated = false;
    const maxOrderRetries = 3;
    
    for (let orderAttempt = 1; orderAttempt <= maxOrderRetries; orderAttempt++) {
      try {
        orderNumber = await generateOrderNumber(supabase);
        console.log(`🔍 CREATE-ORDER: Generated order number (attempt ${orderAttempt}):`, orderNumber);
        
        // Create the order record
        console.log('🔍 CREATE-ORDER: Creating order record in database...');
        const orderData = {
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
        };
        console.log('🔍 CREATE-ORDER: Order data to insert:', JSON.stringify(orderData, null, 2));
        
        const { data: orderResult, error: orderError } = await supabase
          .from('orders')
          .insert([orderData])
          .select()
          .single();

        if (orderError) {
          console.error('🔍 CREATE-ORDER: Error creating order:', orderError);
          console.error('🔍 CREATE-ORDER: Order error details:', JSON.stringify(orderError, null, 2));
          
          // Check if it's a duplicate key error (order number conflict)
          if (orderError.code === '23505' || orderError.message?.includes('duplicate') || orderError.message?.includes('unique')) {
            console.log('🔍 CREATE-ORDER: Duplicate order number detected, retrying with new number...');
            if (orderAttempt < maxOrderRetries) {
              await new Promise(resolve => setTimeout(resolve, 300)); // Wait before retry
              continue;
            }
          }
          
          return res.status(500).json({ success: false, message: 'Failed to create order', error: orderError });
        }
        
        // Success!
        order = orderResult;
        orderCreated = true;
        console.log('🔍 CREATE-ORDER: Order created successfully:', order);
        break;
        
      } catch (error) {
        console.error(`🔍 CREATE-ORDER: Unexpected error on order creation attempt ${orderAttempt}:`, error);
        if (orderAttempt === maxOrderRetries) {
          throw error; // Re-throw if this was the last attempt
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (!orderCreated || !order) {
      console.error('🔍 CREATE-ORDER: Failed to create order after all attempts');
      return res.status(500).json({ success: false, message: 'Failed to create order after multiple attempts' });
    }

    // Create order items
    console.log('🔍 CREATE-ORDER: Creating order items...');
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
    
    console.log('🔍 CREATE-ORDER: Order items to insert:', JSON.stringify(orderItems, null, 2));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('🔍 CREATE-ORDER: Error creating order items:', itemsError);
      console.error('🔍 CREATE-ORDER: Items error details:', JSON.stringify(itemsError, null, 2));
      // Try to cleanup the order if items failed
      await supabase.from('orders').delete().eq('id', order.id);
      return res.status(500).json({ success: false, message: 'Failed to create order items', error: itemsError });
    }
    
    console.log('🔍 CREATE-ORDER: Order items created successfully');

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
    console.error('🔍 CREATE-ORDER: Unexpected error in create-order API:', error);
    console.error('🔍 CREATE-ORDER: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return res.status(500).json({ success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

async function generateOrderNumber(supabase: any): Promise<string> {
  const maxRetries = 5;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 ORDER-NUMBER: Attempt ${attempt} to generate unique order number`);
      
      // Get all order numbers to find the highest one
      const { data: allOrders, error } = await supabase
        .from('orders')
        .select('order_number')
        .like('order_number', 'FASHO-%');

      if (error) {
        console.error('🔍 ORDER-NUMBER: Error fetching orders:', error);
        // If we can't fetch, use timestamp-based fallback
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        const fallbackNumber = `FASHO-8${timestamp}${random}`;
        console.log('🔍 ORDER-NUMBER: Using fallback number:', fallbackNumber);
        return fallbackNumber;
      }

      let nextNumber = 3001; // Starting number

      if (allOrders && allOrders.length > 0) {
        console.log(`🔍 ORDER-NUMBER: Found ${allOrders.length} existing orders`);
        
        // Find the highest order number
        let highestNumber = 3000; // Base number
        
        for (const order of allOrders) {
          const orderNumber = order.order_number;
          // Extract the number part (e.g., "FASHO-3005" -> "3005")
          const numberPart = orderNumber.replace('FASHO-', '');
          const orderNum = parseInt(numberPart, 10);
          
          if (!isNaN(orderNum) && orderNum > highestNumber) {
            highestNumber = orderNum;
          }
        }
        
        nextNumber = highestNumber + 1;
        console.log('🔍 ORDER-NUMBER: Highest existing number:', highestNumber, 'Next number:', nextNumber);
      }

      // Add randomization to prevent conflicts in concurrent requests
      const randomOffset = Math.floor(Math.random() * 10); // 0-9
      nextNumber += randomOffset;

      // Format as 4-digit number with leading zeros if needed
      const formattedNumber = nextNumber.toString().padStart(4, '0');
      const proposedOrderNumber = `FASHO-${formattedNumber}`;
      
      console.log('🔍 ORDER-NUMBER: Proposed order number:', proposedOrderNumber);
      
      // Check if this order number already exists (race condition protection)
      const { data: existingOrder, error: checkError } = await supabase
        .from('orders')
        .select('order_number')
        .eq('order_number', proposedOrderNumber)
        .limit(1);
        
      if (checkError) {
        console.error('🔍 ORDER-NUMBER: Error checking for existing order:', checkError);
        // Continue to next attempt
        continue;
      }
      
      if (existingOrder && existingOrder.length > 0) {
        console.log('🔍 ORDER-NUMBER: Order number already exists, retrying...');
        // Add a small delay before retry to avoid rapid-fire attempts
        await new Promise(resolve => setTimeout(resolve, 100 + (attempt * 50)));
        continue;
      }
      
      console.log('🔍 ORDER-NUMBER: Order number is unique, using:', proposedOrderNumber);
      return proposedOrderNumber;

    } catch (error) {
      console.error(`🔍 ORDER-NUMBER: Error on attempt ${attempt}:`, error);
      if (attempt === maxRetries) {
        // Final fallback - use timestamp with random component
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const fallbackNumber = `FASHO-9${timestamp}${random}`;
        console.log('🔍 ORDER-NUMBER: Using final fallback number:', fallbackNumber);
        return fallbackNumber;
      }
      // Wait before retry with increasing delay
      await new Promise(resolve => setTimeout(resolve, 200 + (attempt * 100)));
    }
  }
  
  // This should never be reached, but just in case
  const emergencyNumber = `FASHO-${Date.now().toString().slice(-6)}`;
  console.log('🔍 ORDER-NUMBER: Using emergency fallback:', emergencyNumber);
  return emergencyNumber;
} 