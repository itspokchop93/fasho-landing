import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';

export interface CustomerDetailData {
  customer_info: {
    customer_name: string;
    customer_email: string;
    date_joined: string;
    total_purchases: number;
    total_spend: number;
    billing_info?: any; // From most recent order
  };
  orders: {
    id: string;
    order_number: string;
    created_at: string;
    status: string;
    total: number;
    items_count: number;
  }[];
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { customerEmail } = req.query;

    if (!customerEmail || typeof customerEmail !== 'string') {
      return res.status(400).json({ success: false, message: 'Customer email is required' });
    }

    const supabase = createAdminClient();

    console.log('🔍 ADMIN-CUSTOMER-DETAIL: Fetching details for customer:', customerEmail);

    // Fetch all orders for this customer with order items to count items
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        add_on_items (*)
      `)
      .eq('customer_email', customerEmail)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('🔍 ADMIN-CUSTOMER-DETAIL: Error fetching customer orders:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch customer details' });
    }

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Calculate customer statistics
    const totalPurchases = orders.length;
    const totalSpend = orders.reduce((sum, order) => sum + order.total, 0);
    const dateJoined = orders[orders.length - 1].created_at; // Earliest order (last in desc order)
    
    // Get billing info from most recent order
    const mostRecentOrder = orders[0];
    const billingInfo = mostRecentOrder.billing_info;

    // Format orders for response
    const formattedOrders = orders.map(order => {
      const itemsCount = (order.order_items?.length || 0) + (order.add_on_items?.length || 0);
      
      return {
        id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
        status: order.status,
        total: order.total,
        items_count: itemsCount
      };
    });

    const customerDetails: CustomerDetailData = {
      customer_info: {
        customer_name: mostRecentOrder.customer_name,
        customer_email: customerEmail,
        date_joined: dateJoined,
        total_purchases: totalPurchases,
        total_spend: totalSpend,
        billing_info: billingInfo
      },
      orders: formattedOrders
    };

    console.log('🔍 ADMIN-CUSTOMER-DETAIL: Returning customer details:', {
      email: customerEmail,
      totalOrders: formattedOrders.length,
      totalSpend
    });

    return res.status(200).json({
      success: true,
      customer: customerDetails
    });

  } catch (error) {
    console.error('🔍 ADMIN-CUSTOMER-DETAIL: Error in customer detail API:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
