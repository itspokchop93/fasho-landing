import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';
import { getFollowizServices } from '../../../../utils/followiz-api';

interface PlaylistService {
  id: string;
  service_type: string;
  service_id: string;
  service_name: string | null;
  price_per_1k: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Helper function to fetch service info from Followiz API
async function getServiceInfo(serviceId: string): Promise<{ name: string | null; price: number | null }> {
  try {
    const result = await getFollowizServices();
    
    if (!result.success || !result.services) {
      console.error('Failed to fetch services from Followiz');
      return { name: null, price: null };
    }

    const service = result.services.find(s => s.service.toString() === serviceId);
    
    if (service) {
      const price = parseFloat(service.rate);
      console.log(`📊 Found service ${serviceId}: ${service.name}, $${price}/1k`);
      return { name: service.name, price: price };
    }
    
    console.warn(`⚠️ Service ${serviceId} not found in Followiz services list`);
    return { name: null, price: null };
  } catch (error) {
    console.error('Error fetching service info:', error);
    return { name: null, price: null };
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  const supabase = createAdminClient();

  // GET - Fetch all playlist service settings
  if (req.method === 'GET') {
    try {
      const { data: services, error } = await supabase
        .from('smm_playlist_services')
        .select('*')
        .eq('is_active', true)
        .order('service_type', { ascending: true });

      if (error) {
        console.error('Error fetching playlist services:', error);
        return res.status(500).json({ error: 'Failed to fetch playlist services' });
      }

      // Convert to a map for easier access
      const servicesMap: { [key: string]: PlaylistService } = {};
      (services || []).forEach((service: PlaylistService) => {
        servicesMap[service.service_type] = service;
      });

      return res.status(200).json({
        success: true,
        services: servicesMap,
      });
    } catch (error) {
      console.error('Error in GET playlist services:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST - Create or update a playlist service setting
  if (req.method === 'POST') {
    try {
      const { service_type, service_id } = req.body;

      if (!service_type || !service_id) {
        return res.status(400).json({ error: 'Missing required fields: service_type, service_id' });
      }

      // Validate service_type
      if (!['playlist_followers', 'playlist_streams'].includes(service_type)) {
        return res.status(400).json({ error: 'Invalid service_type. Must be "playlist_followers" or "playlist_streams"' });
      }

      // Fetch service info from Followiz API
      const serviceInfo = await getServiceInfo(service_id.toString());

      // Check if service exists
      const { data: existingService, error: fetchError } = await supabase
        .from('smm_playlist_services')
        .select('*')
        .eq('service_type', service_type)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking existing service:', fetchError);
        return res.status(500).json({ error: 'Failed to check existing service' });
      }

      if (existingService) {
        // Update existing service
        const { data: updatedService, error: updateError } = await supabase
          .from('smm_playlist_services')
          .update({
            service_id: service_id.toString(),
            service_name: serviceInfo.name,
            price_per_1k: serviceInfo.price,
            updated_at: new Date().toISOString(),
          })
          .eq('service_type', service_type)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating playlist service:', updateError);
          return res.status(500).json({ error: 'Failed to update playlist service' });
        }

        console.log(`✅ Playlist service updated: ${service_type} = ${service_id}`);
        return res.status(200).json({
          success: true,
          service: updatedService,
        });
      } else {
        // Create new service
        const { data: newService, error: insertError } = await supabase
          .from('smm_playlist_services')
          .insert({
            service_type,
            service_id: service_id.toString(),
            service_name: serviceInfo.name,
            price_per_1k: serviceInfo.price,
            is_active: true,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating playlist service:', insertError);
          return res.status(500).json({ error: 'Failed to create playlist service' });
        }

        console.log(`✅ Playlist service created: ${service_type} = ${service_id}`);
        return res.status(201).json({
          success: true,
          service: newService,
        });
      }
    } catch (error) {
      console.error('Error in POST playlist service:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAdminAuth(handler);
