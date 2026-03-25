import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    // Get query parameters
    const { 
      search = '', 
      status = '', 
      sortBy = 'created_at', 
      sortOrder = 'desc',
      limit = '50',
      offset = '0',
      // Advanced search fields
      cardLast4 = '',
      amount = '',
      transactionId = '',
      authCode = '',
      firstName = '',
      lastName = '',
      dateFrom = '',
      dateTo = '',
    } = req.query;

    console.log('🔍 ADMIN-ORDERS: Fetching orders with filters:', {
      search, status, sortBy, sortOrder, limit, offset,
      cardLast4, amount, transactionId, authCode, firstName, lastName, dateFrom, dateTo,
    });

    // Helper to safely get a string param
    const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v.trim() : '');

    const searchVal = str(search);
    const statusVal = str(status);
    const cardLast4Val = str(cardLast4);
    const amountVal = str(amount);
    const transactionIdVal = str(transactionId);
    const authCodeVal = str(authCode);
    const firstNameVal = str(firstName);
    const lastNameVal = str(lastName);
    const dateFromVal = str(dateFrom);
    const dateToVal = str(dateTo);

    const hasAdvancedFilters = cardLast4Val || amountVal || transactionIdVal || authCodeVal || firstNameVal || lastNameVal || dateFromVal || dateToVal;

    // Build a function to apply filters to any query (for both data and count queries)
    function applyFilters(q: any) {
      // Basic text search across order_number, customer_name, customer_email
      if (searchVal) {
        q = q.or(`order_number.ilike.%${searchVal}%,customer_name.ilike.%${searchVal}%,customer_email.ilike.%${searchVal}%`);
      }

      if (statusVal) {
        q = q.eq('status', statusVal);
      }

      // Amount (exact match or range with tolerance for cents)
      if (amountVal) {
        const amt = parseFloat(amountVal);
        if (!isNaN(amt)) {
          q = q.gte('total', amt - 0.01).lte('total', amt + 0.01);
        }
      }

      // Date range
      if (dateFromVal) {
        q = q.gte('created_at', new Date(dateFromVal).toISOString());
      }
      if (dateToVal) {
        // End of the selected day
        const endDate = new Date(dateToVal);
        endDate.setHours(23, 59, 59, 999);
        q = q.lte('created_at', endDate.toISOString());
      }

      // JSONB filters — uses PostgREST arrow operators via .filter()
      // Card last 4 — payment_data->>'accountNumber' contains the last 4 digits (e.g., "XXXX1234")
      if (cardLast4Val) {
        q = q.filter('payment_data->>accountNumber', 'like', `%${cardLast4Val}`);
      }

      // Transaction ID — payment_data->>'transactionId'
      if (transactionIdVal) {
        q = q.filter('payment_data->>transactionId', 'like', `%${transactionIdVal}%`);
      }

      // Auth Code — payment_data->>'authorization'
      if (authCodeVal) {
        q = q.filter('payment_data->>authorization', 'like', `%${authCodeVal}%`);
      }

      // First name — billing_info->>'firstName'
      if (firstNameVal) {
        q = q.filter('billing_info->>firstName', 'ilike', `%${firstNameVal}%`);
      }

      // Last name — billing_info->>'lastName'
      if (lastNameVal) {
        q = q.filter('billing_info->>lastName', 'ilike', `%${lastNameVal}%`);
      }

      return q;
    }

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        add_on_items (*)
      `);

    query = applyFilters(query);

    // Apply sorting
    const validSortColumns = ['created_at', 'order_number', 'status', 'total', 'customer_name'];
    const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy as string : 'created_at';
    const sortDirection = sortOrder === 'asc' ? { ascending: true } : { ascending: false };
    
    query = query.order(sortColumn, sortDirection);

    // Apply pagination
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);
    const offsetNum = parseInt(offset as string, 10) || 0;
    
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data: orders, error } = await query;

    if (error) {
      console.error('🔍 ADMIN-ORDERS: Error fetching orders:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    countQuery = applyFilters(countQuery);

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('🔍 ADMIN-ORDERS: Error counting orders:', countError);
    }

    // Gather unique customer emails and count total orders per customer
    const uniqueEmails = [...new Set((orders || []).map((o: any) => o.customer_email).filter(Boolean))];
    const customerOrderCounts: Record<string, number> = {};

    if (uniqueEmails.length > 0) {
      const { data: countRows } = await supabase
        .from('orders')
        .select('customer_email')
        .in('customer_email', uniqueEmails);

      if (countRows) {
        for (const row of countRows) {
          customerOrderCounts[row.customer_email] = (customerOrderCounts[row.customer_email] || 0) + 1;
        }
      }
    }

    // Format the response
    const formattedOrders = orders?.map((order: any) => {
      const isNewOrder = !order.first_saved_at;

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
        customerOrderCount: customerOrderCounts[order.customer_email] || 1,
        firstViewedAt: order.first_viewed_at,
        firstSavedAt: order.first_saved_at,
        viewedByAdmin: order.viewed_by_admin,
        savedByAdmin: order.saved_by_admin,
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

export default requireAdminAuth(handler);