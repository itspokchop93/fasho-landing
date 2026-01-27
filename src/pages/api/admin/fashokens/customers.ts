import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { verifyAdminToken, getAdminTokenFromRequest } from '../../../../utils/admin/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Verify admin authentication
  const token = getAdminTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const adminSession = await verifyAdminToken(token);

  if (!adminSession) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const supabase = createAdminClient();
    const { search, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;

    // Get all orders to build customer list (same approach as admin/customers.ts)
    let query = supabase
      .from('orders')
      .select('customer_email, customer_name, user_id, created_at, total');

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      console.error('🪙 ADMIN-CUSTOMERS: Error fetching orders:', ordersError);
      return res.status(500).json({ success: false, message: 'Failed to fetch customers' });
    }

    // Group orders by customer email to get unique customers
    const customerMap = new Map<string, {
      user_id: string | null;
      email: string;
      customer_name: string;
      first_order_date: Date;
      total_spent: number;
    }>();

    orders?.forEach(order => {
      const email = order.customer_email;
      if (!email) return;

      const orderDate = new Date(order.created_at);

      if (!customerMap.has(email)) {
        customerMap.set(email, {
          user_id: order.user_id,
          email: email,
          customer_name: order.customer_name || email.split('@')[0],
          first_order_date: orderDate,
          total_spent: order.total || 0
        });
      } else {
        const customer = customerMap.get(email)!;
        customer.total_spent += order.total || 0;
        // Keep earliest order date
        if (orderDate < customer.first_order_date) {
          customer.first_order_date = orderDate;
        }
        // Update user_id if we have one and current is null
        if (order.user_id && !customer.user_id) {
          customer.user_id = order.user_id;
        }
      }
    });

    // Convert to array and sort by most recent first
    let customers = Array.from(customerMap.values()).sort((a, b) => 
      b.first_order_date.getTime() - a.first_order_date.getTime()
    );

    // Apply search filter if provided
    if (search && (search as string).length >= 2) {
      const searchLower = (search as string).toLowerCase();
      customers = customers.filter(c => 
        c.email.toLowerCase().includes(searchLower) ||
        c.customer_name.toLowerCase().includes(searchLower)
      );
    }

    // Get user IDs that have values
    const userIds = customers.map(c => c.user_id).filter(Boolean) as string[];

    // Fetch loyalty accounts for these users
    let loyaltyAccounts: any[] = [];
    if (userIds.length > 0) {
      const { data: accounts, error: accountsError } = await supabase
        .from('loyalty_accounts')
        .select('*')
        .in('user_id', userIds);

      if (!accountsError) {
        loyaltyAccounts = accounts || [];
      }
    }

    // Merge customer data with loyalty account data
    const customersWithLoyalty = customers.map(customer => {
      const account = customer.user_id 
        ? loyaltyAccounts.find(a => a.user_id === customer.user_id)
        : null;

      return {
        user_id: customer.user_id,
        email: customer.email,
        full_name: customer.customer_name,
        balance: account?.balance || 0,
        lifetime_earned: account?.lifetime_earned || 0,
        lifetime_spent: account?.lifetime_spent || 0,
        created_at: customer.first_order_date.toISOString()
      };
    });

    // Apply pagination
    const totalCount = customersWithLoyalty.length;
    const offset = (pageNum - 1) * limitNum;
    const paginatedCustomers = customersWithLoyalty.slice(offset, offset + limitNum);
    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      success: true,
      customers: paginatedCustomers,
      totalPages,
      totalCount,
      page: pageNum
    });

  } catch (error) {
    console.error('🪙 ADMIN-CUSTOMERS: Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
