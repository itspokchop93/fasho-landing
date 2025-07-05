import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '../../../utils/supabase/server';

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

    // TODO: Add role-based access control here
    // For now, we'll allow any authenticated user to access admin orders
    // Later we'll check if user.user_metadata.role === 'admin'

    // Get query parameters
    const { 
      search = '', 
      status = '', 
      sortBy = 'created_at', 
      sortOrder = 'desc',
      limit = '50',
      offset = '0'
    } = req.query;

    console.log('🔍 ADMIN-ORDERS: Fetching orders with filters:', {
      search,
      status,
      sortBy,
      sortOrder,
      limit,
      offset
    });

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        add_on_items (*)
      `);

    // Apply search filter
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = search.trim();
      query = query.or(`order_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`);
    }

    // Apply status filter
    if (status && typeof status === 'string' && status.trim()) {
      query = query.eq('status', status.trim());
    }

    // Apply sorting
    const validSortColumns = ['created_at', 'order_number', 'status', 'total', 'customer_name'];
    const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy as string : 'created_at';
    const sortDirection = sortOrder === 'asc' ? { ascending: true } : { ascending: false };
    
    query = query.order(sortColumn, sortDirection);

    // Apply pagination
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100); // Max 100 orders per request
    const offsetNum = parseInt(offset as string, 10) || 0;
    
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data: orders, error } = await query;

    if (error) {
      console.error('🔍 ADMIN-ORDERS: Error fetching orders:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }

    // Get total count for pagination (separate query for performance)
    let countQuery = supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // Apply same filters to count query
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = search.trim();
      countQuery = countQuery.or(`order_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`);
    }

    if (status && typeof status === 'string' && status.trim()) {
      countQuery = countQuery.eq('status', status.trim());
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('🔍 ADMIN-ORDERS: Error counting orders:', countError);
    }

    // Format the response
    const formattedOrders = orders?.map((order: any) => {
      // Determine if order is "new" (not viewed by admin yet)
      const isNewOrder = !order.first_viewed_at;

      return {
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
        isNewOrder,
        firstViewedAt: order.first_viewed_at,
        viewedByAdmin: order.viewed_by_admin,
        adminNotes: order.admin_notes,
        billingInfo: order.billing_info,
        paymentData: order.payment_data,
        itemCount: order.order_items?.length || 0,
        items: order.order_items?.map((item: any) => ({
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
        })) || [],
        addOnItems: order.add_on_items?.map((item: any) => ({
          id: item.addon_id,
          name: item.addon_name,
          description: item.addon_description,
          emoji: item.emoji,
          originalPrice: item.original_price,
          price: item.discounted_price,
          isOnSale: item.is_discounted
        })) || []
      };
    }) || [];

    console.log('🔍 ADMIN-ORDERS: Returning orders:', {
      count: formattedOrders.length,
      totalCount: count || 0,
             newOrders: formattedOrders.filter((order: any) => order.isNewOrder).length
    });

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
    console.error('🔍 ADMIN-ORDERS: Error in orders API:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
} 