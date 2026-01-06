import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';
import { getFollowizServices } from '../../../../utils/followiz-api';

interface OrderSet {
  id: string;
  package_name: string;
  service_id: string;
  quantity: number;
  drip_runs: number | null;
  interval_minutes: number | null;
  display_order: number;
  is_active: boolean;
  price_per_1k: number | null;
  set_cost: number | null;
  created_at: string;
  updated_at: string;
}

// Helper function to fetch service price from Followiz API
async function getServicePrice(serviceId: string): Promise<number | null> {
  try {
    const result = await getFollowizServices();
    
    if (!result.success || !result.services) {
      console.error('Failed to fetch services from Followiz');
      return null;
    }

    const service = result.services.find(s => s.service.toString() === serviceId);
    
    if (service) {
      const price = parseFloat(service.rate);
      console.log(`📊 Found price for service ${serviceId}: $${price}/1k`);
      return price;
    }
    
    console.warn(`⚠️ Service ${serviceId} not found in Followiz services list`);
    return null;
  } catch (error) {
    console.error('Error fetching service price:', error);
    return null;
  }
}

// Helper function to calculate set cost
function calculateSetCost(quantity: number, dripRuns: number | null, pricePerK: number | null): number | null {
  if (pricePerK === null) return null;
  
  // Total quantity = base quantity × drip runs (if drip feed is used)
  const totalQuantity = dripRuns && dripRuns > 0 ? quantity * dripRuns : quantity;
  
  // Cost = (total quantity / 1000) × price per 1k
  return (totalQuantity / 1000) * pricePerK;
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  const supabase = createAdminClient();

  // GET - Fetch order sets (optionally filtered by package_name)
  if (req.method === 'GET') {
    try {
      const { package_name } = req.query;
      
      let query = supabase
        .from('smm_order_sets')
        .select('*')
        .eq('is_active', true);
      
      // Filter by package_name if provided
      if (package_name) {
        query = query.eq('package_name', (package_name as string).toUpperCase());
      }
      
      const { data: orderSets, error } = await query
        .order('package_name', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching order sets:', error);
        return res.status(500).json({ error: 'Failed to fetch order sets' });
      }

      return res.status(200).json(orderSets || []);
    } catch (error) {
      console.error('Error in GET order sets:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST - Create a new order set
  if (req.method === 'POST') {
    try {
      const { package_name, service_id, quantity, drip_runs, interval_minutes } = req.body;

      if (!package_name || !service_id || !quantity) {
        return res.status(400).json({ error: 'Missing required fields: package_name, service_id, quantity' });
      }

      // Fetch service price from Followiz API
      const pricePerK = await getServicePrice(service_id.toString());
      
      // Parse drip feed values - null if not provided
      const parsedDripRuns = drip_runs !== null && drip_runs !== undefined && drip_runs !== '' 
        ? parseInt(drip_runs) 
        : null;
      const parsedInterval = interval_minutes !== null && interval_minutes !== undefined && interval_minutes !== '' 
        ? parseInt(interval_minutes) 
        : null;
      
      // Calculate set cost
      const setCost = calculateSetCost(parseInt(quantity), parsedDripRuns, pricePerK);

      // Get the current max display_order for this package
      const { data: existingOrders, error: countError } = await supabase
        .from('smm_order_sets')
        .select('display_order')
        .eq('package_name', package_name)
        .eq('is_active', true)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextDisplayOrder = existingOrders && existingOrders.length > 0 
        ? existingOrders[0].display_order + 1 
        : 0;

      const { data: newOrderSet, error: insertError } = await supabase
        .from('smm_order_sets')
        .insert({
          package_name: package_name.toUpperCase(),
          service_id: service_id.toString(),
          quantity: parseInt(quantity),
          drip_runs: parsedDripRuns,
          interval_minutes: parsedInterval,
          display_order: nextDisplayOrder,
          is_active: true,
          price_per_1k: pricePerK,
          set_cost: setCost,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating order set:', insertError);
        return res.status(500).json({ error: 'Failed to create order set' });
      }

      console.log(`✅ SMM Order Set created for ${package_name}: Service ${service_id}, Qty ${quantity}, Price/1k: $${pricePerK}, Set Cost: $${setCost}`);
      return res.status(201).json(newOrderSet);
    } catch (error) {
      console.error('Error in POST order set:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PUT - Update an existing order set
  if (req.method === 'PUT') {
    try {
      const { id, service_id, quantity, drip_runs, interval_minutes } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Missing required field: id' });
      }

      // Fetch current order set to get existing values
      const { data: currentOrderSet, error: fetchError } = await supabase
        .from('smm_order_sets')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !currentOrderSet) {
        return res.status(404).json({ error: 'Order set not found' });
      }

      const updateData: any = { updated_at: new Date().toISOString() };
      
      // Determine final values
      const finalServiceId = service_id !== undefined ? service_id.toString() : currentOrderSet.service_id;
      const finalQuantity = quantity !== undefined ? parseInt(quantity) : currentOrderSet.quantity;
      
      // Handle nullable drip feed values
      const finalDripRuns = drip_runs !== undefined 
        ? (drip_runs !== null && drip_runs !== '' ? parseInt(drip_runs) : null)
        : currentOrderSet.drip_runs;
      const finalInterval = interval_minutes !== undefined 
        ? (interval_minutes !== null && interval_minutes !== '' ? parseInt(interval_minutes) : null)
        : currentOrderSet.interval_minutes;

      if (service_id !== undefined) updateData.service_id = finalServiceId;
      if (quantity !== undefined) updateData.quantity = finalQuantity;
      updateData.drip_runs = finalDripRuns;
      updateData.interval_minutes = finalInterval;

      // Re-fetch price if service_id changed
      let pricePerK = currentOrderSet.price_per_1k;
      if (service_id !== undefined && service_id !== currentOrderSet.service_id) {
        pricePerK = await getServicePrice(finalServiceId);
        updateData.price_per_1k = pricePerK;
      }

      // Recalculate set cost
      const setCost = calculateSetCost(finalQuantity, finalDripRuns, pricePerK);
      updateData.set_cost = setCost;

      const { data: updatedOrderSet, error: updateError } = await supabase
        .from('smm_order_sets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating order set:', updateError);
        return res.status(500).json({ error: 'Failed to update order set' });
      }

      console.log(`✅ SMM Order Set updated: ${id}, Set Cost: $${setCost}`);
      return res.status(200).json(updatedOrderSet);
    } catch (error) {
      console.error('Error in PUT order set:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // DELETE - Soft delete an order set (set is_active to false)
  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Missing required field: id' });
      }

      const { error: deleteError } = await supabase
        .from('smm_order_sets')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting order set:', deleteError);
        return res.status(500).json({ error: 'Failed to delete order set' });
      }

      console.log(`✅ SMM Order Set deleted (soft): ${id}`);
      return res.status(200).json({ success: true, message: 'Order set deleted' });
    } catch (error) {
      console.error('Error in DELETE order set:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAdminAuth(handler);
