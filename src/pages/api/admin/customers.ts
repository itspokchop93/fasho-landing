import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

export interface CustomerData {
  customer_name: string;
  customer_email: string;
  date_joined: string; // Date of first purchase
  last_order: string; // Date of most recent order
  purchases: number; // Total number of purchases
  total_spend: number; // Total amount spent
  first_order_id: string; // For navigation to first order
  latest_order_id: string; // For navigation to latest order
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    // Get query parameters
    const { 
      search = '', 
      sortBy = 'date_joined', 
      sortOrder = 'desc',
      limit = '50',
      offset = '0'
    } = req.query;

    console.log('🔍 ADMIN-CUSTOMERS: Fetching customers with filters:', {
      search,
      sortBy,
      sortOrder,
      limit,
      offset
    });

    // First, get aggregated customer data from orders
    let query = supabase
      .from('orders')
      .select('*');

    // Apply search filter - search by customer name, email, or order number
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = search.trim();
      query = query.or(`customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%,order_number.ilike.%${searchTerm}%`);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('🔍 ADMIN-CUSTOMERS: Error fetching orders for customers:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch customer data' });
    }

    // Group orders by customer email and calculate stats
    const customerMap = new Map<string, {
      customer_name: string;
      customer_email: string;
      orders: any[];
      total_spend: number;
      first_order_date: Date;
      last_order_date: Date;
      first_order_id: string;
      latest_order_id: string;
    }>();

    orders?.forEach(order => {
      const email = order.customer_email;
      const orderDate = new Date(order.created_at);
      
      if (!customerMap.has(email)) {
        customerMap.set(email, {
          customer_name: order.customer_name,
          customer_email: email,
          orders: [order],
          total_spend: order.total,
          first_order_date: orderDate,
          last_order_date: orderDate,
          first_order_id: order.id,
          latest_order_id: order.id
        });
      } else {
        const customer = customerMap.get(email)!;
        customer.orders.push(order);
        customer.total_spend += order.total;
        
        // Update first order if this one is earlier
        if (orderDate < customer.first_order_date) {
          customer.first_order_date = orderDate;
          customer.first_order_id = order.id;
        }
        
        // Update last order if this one is later
        if (orderDate > customer.last_order_date) {
          customer.last_order_date = orderDate;
          customer.latest_order_id = order.id;
        }
      }
    });

    // Convert map to array and format data
    let customers: CustomerData[] = Array.from(customerMap.values()).map(customer => ({
      customer_name: customer.customer_name,
      customer_email: customer.customer_email,
      date_joined: customer.first_order_date.toISOString(),
      last_order: customer.last_order_date.toISOString(),
      purchases: customer.orders.length,
      total_spend: customer.total_spend,
      first_order_id: customer.first_order_id,
      latest_order_id: customer.latest_order_id
    }));

    // Apply sorting
    const validSortColumns = ['date_joined', 'last_order', 'purchases', 'total_spend', 'customer_name', 'customer_email'];
    const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy as string : 'date_joined';
    const isAscending = sortOrder === 'asc';

    customers.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortColumn) {
        case 'date_joined':
        case 'last_order':
          aVal = new Date(a[sortColumn as keyof CustomerData] as string);
          bVal = new Date(b[sortColumn as keyof CustomerData] as string);
          break;
        case 'purchases':
        case 'total_spend':
          aVal = a[sortColumn as keyof CustomerData] as number;
          bVal = b[sortColumn as keyof CustomerData] as number;
          break;
        default:
          aVal = (a[sortColumn as keyof CustomerData] as string).toLowerCase();
          bVal = (b[sortColumn as keyof CustomerData] as string).toLowerCase();
      }

      if (aVal < bVal) return isAscending ? -1 : 1;
      if (aVal > bVal) return isAscending ? 1 : -1;
      return 0;
    });

    // Apply pagination
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);
    const offsetNum = parseInt(offset as string, 10) || 0;
    const totalCount = customers.length;
    const paginatedCustomers = customers.slice(offsetNum, offsetNum + limitNum);

    console.log('🔍 ADMIN-CUSTOMERS: Returning customers:', {
      count: paginatedCustomers.length,
      totalCount,
      hasMore: totalCount > offsetNum + limitNum
    });

    return res.status(200).json({
      success: true,
      customers: paginatedCustomers,
      pagination: {
        total: totalCount,
        limit: limitNum,
        offset: offsetNum,
        hasMore: totalCount > offsetNum + limitNum
      }
    });

  } catch (error) {
    console.error('🔍 ADMIN-CUSTOMERS: Error in customers API:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export default requireAdminAuth(handler);
