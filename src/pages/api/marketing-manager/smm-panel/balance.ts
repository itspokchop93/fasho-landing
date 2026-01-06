import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdminAuth, AdminUser } from '../../../../utils/admin/auth';
import { getFollowizBalance } from '../../../../utils/followiz-api';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📊 Fetching Followiz balance...');
    
    const result = await getFollowizBalance();
    
    if (!result.success) {
      console.error('❌ Failed to fetch Followiz balance:', result.error);
      return res.status(500).json({ 
        success: false, 
        error: result.error || 'Failed to fetch balance' 
      });
    }

    console.log(`✅ Followiz balance: ${result.balance} ${result.currency}`);
    
    return res.status(200).json({
      success: true,
      balance: result.balance,
      currency: result.currency,
    });
  } catch (error) {
    console.error('Error fetching SMM panel balance:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

export default requireAdminAuth(handler);

