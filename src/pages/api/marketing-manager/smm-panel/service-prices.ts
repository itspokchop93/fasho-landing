import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';
import { getFollowizServices } from '../../../../utils/followiz-api';

/**
 * GET /api/marketing-manager/smm-panel/service-prices?ids=5755,5756
 * Fetches live pricing from Followiz API for the given service IDs.
 * Returns price per 1k for each service.
 */
async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ids } = req.query;

    if (!ids || typeof ids !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required query parameter: ids (comma-separated service IDs)' 
      });
    }

    const serviceIds = ids.split(',').map(id => id.trim()).filter(Boolean);

    if (serviceIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No valid service IDs provided' 
      });
    }

    // Fetch all services from Followiz
    const result = await getFollowizServices();

    if (!result.success || !result.services) {
      return res.status(500).json({ 
        success: false, 
        error: result.error || 'Failed to fetch services from Followiz API' 
      });
    }

    // Build a map of requested service IDs to their pricing
    const prices: { [serviceId: string]: { name: string; rate: string; pricePerK: number; min: string; max: string; } | null } = {};

    for (const sid of serviceIds) {
      const service = result.services.find(s => s.service.toString() === sid);
      if (service) {
        prices[sid] = {
          name: service.name,
          rate: service.rate,
          pricePerK: parseFloat(service.rate),
          min: service.min,
          max: service.max,
        };
      } else {
        prices[sid] = null;
      }
    }

    return res.status(200).json({
      success: true,
      prices,
    });
  } catch (error) {
    console.error('Error fetching service prices:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

export default requireAdminAuth(handler);
