import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminRole, AdminUser } from '../../../utils/admin/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();

    // Get current date in PST timezone
    const now = new Date();
    const pstOffset = -8 * 60; // PST is UTC-8
    const pstNow = new Date(now.getTime() + (pstOffset * 60 * 1000));
    
    // Get start of current month in PST
    const startOfMonth = new Date(pstNow.getFullYear(), pstNow.getMonth(), 1);
    const endOfMonth = new Date(pstNow.getFullYear(), pstNow.getMonth() + 1, 0, 23, 59, 59);

    // Convert to UTC for database queries
    const startOfMonthUTC = new Date(startOfMonth.getTime() - (pstOffset * 60 * 1000));
    const endOfMonthUTC = new Date(endOfMonth.getTime() - (pstOffset * 60 * 1000));

    console.log('📊 ADMIN-ANALYTICS: Fetching analytics data');
    console.log('📊 ADMIN-ANALYTICS: Current month range (PST):', {
      start: startOfMonth.toISOString(),
      end: endOfMonth.toISOString()
    });
    console.log('📊 ADMIN-ANALYTICS: Current month range (UTC):', {
      start: startOfMonthUTC.toISOString(),
      end: endOfMonthUTC.toISOString()
    });

    // Get total orders count
    const { count: totalOrders, error: totalOrdersError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    if (totalOrdersError) {
      console.error('📊 ADMIN-ANALYTICS: Error fetching total orders:', totalOrdersError);
      return res.status(500).json({ success: false, message: 'Failed to fetch total orders' });
    }

    // Get total revenue
    const { data: totalRevenueData, error: totalRevenueError } = await supabase
      .from('orders')
      .select('total');

    if (totalRevenueError) {
      console.error('📊 ADMIN-ANALYTICS: Error fetching total revenue:', totalRevenueError);
      return res.status(500).json({ success: false, message: 'Failed to fetch total revenue' });
    }

    const totalRevenue = totalRevenueData?.reduce((sum: number, order: any) => sum + (order.total || 0), 0) || 0;

    // Get this month's orders count
    const { count: monthlyOrders, error: monthlyOrdersError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonthUTC.toISOString())
      .lte('created_at', endOfMonthUTC.toISOString());

    if (monthlyOrdersError) {
      console.error('📊 ADMIN-ANALYTICS: Error fetching monthly orders:', monthlyOrdersError);
      return res.status(500).json({ success: false, message: 'Failed to fetch monthly orders' });
    }

    // Get this month's revenue
    const { data: monthlyRevenueData, error: monthlyRevenueError } = await supabase
      .from('orders')
      .select('total')
      .gte('created_at', startOfMonthUTC.toISOString())
      .lte('created_at', endOfMonthUTC.toISOString());

    if (monthlyRevenueError) {
      console.error('📊 ADMIN-ANALYTICS: Error fetching monthly revenue:', monthlyRevenueError);
      return res.status(500).json({ success: false, message: 'Failed to fetch monthly revenue' });
    }

    const monthlyRevenue = monthlyRevenueData?.reduce((sum: number, order: any) => sum + (order.total || 0), 0) || 0;

    // Get daily orders data for the current month
    const { data: dailyOrdersRaw, error: dailyOrdersError } = await supabase
      .from('orders')
      .select('created_at')
      .gte('created_at', startOfMonthUTC.toISOString())
      .lte('created_at', endOfMonthUTC.toISOString())
      .order('created_at', { ascending: true });

    if (dailyOrdersError) {
      console.error('📊 ADMIN-ANALYTICS: Error fetching daily orders:', dailyOrdersError);
      return res.status(500).json({ success: false, message: 'Failed to fetch daily orders' });
    }

    // Process daily orders data
    const daysInMonth = endOfMonth.getDate();
    const dailyOrdersData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(pstNow.getFullYear(), pstNow.getMonth(), day);
      const dayEnd = new Date(pstNow.getFullYear(), pstNow.getMonth(), day, 23, 59, 59);
      
      // Convert to UTC for comparison
      const dayStartUTC = new Date(dayStart.getTime() - (pstOffset * 60 * 1000));
      const dayEndUTC = new Date(dayEnd.getTime() - (pstOffset * 60 * 1000));

      const ordersForDay = dailyOrdersRaw?.filter((order: any) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= dayStartUTC && orderDate <= dayEndUTC;
      }).length || 0;

      dailyOrdersData.push({
        day,
        date: dayStart.toISOString().split('T')[0],
        orders: ordersForDay
      });
    }

    console.log('📊 ADMIN-ANALYTICS: Analytics summary:', {
      totalOrders: totalOrders || 0,
      totalRevenue: totalRevenue,
      monthlyOrders: monthlyOrders || 0,
      monthlyRevenue: monthlyRevenue,
      dailyDataPoints: dailyOrdersData.length
    });

    const analytics = {
      totalOrders: totalOrders || 0,
      totalRevenue: totalRevenue,
      monthlyOrders: monthlyOrders || 0,
      monthlyRevenue: monthlyRevenue,
      dailyOrdersData: dailyOrdersData,
      currentMonth: {
        name: startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        year: startOfMonth.getFullYear(),
        month: startOfMonth.getMonth() + 1
      }
    };

    return res.status(200).json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('📊 ADMIN-ANALYTICS: Error in analytics API:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export default requireAdminRole('admin')(handler);