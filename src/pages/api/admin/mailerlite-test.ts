import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { pushSubscriberToMailerLite, getActiveGroupIds } from '../../../utils/mailerlite/mailerliteService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('📬 MAILERLITE-TEST: Request received', { method: req.method });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, zip } = req.body;
    console.log('📬 MAILERLITE-TEST: Payload:', { email, name, zip });

    if (!email) {
      console.log('📬 MAILERLITE-TEST: Missing email');
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('📬 MAILERLITE-TEST: Creating admin Supabase client...');
    const supabase = createAdminClient();

    console.log('📬 MAILERLITE-TEST: Fetching active group IDs...');
    const { groupIds, groupNames } = await getActiveGroupIds(supabase);
    console.log('📬 MAILERLITE-TEST: Active groups:', { groupIds, groupNames });

    if (groupIds.length === 0) {
      console.log('📬 MAILERLITE-TEST: No active groups selected');
      return res.status(400).json({ error: 'No active MailerLite groups selected. Please select at least one group.' });
    }

    const nameParts = (name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    console.log('📬 MAILERLITE-TEST: Parsed name:', { firstName, lastName });

    console.log('📬 MAILERLITE-TEST: Calling pushSubscriberToMailerLite...');
    const result = await pushSubscriberToMailerLite(
      {
        email,
        firstName,
        lastName,
        fullName: name || '',
        zip: zip || undefined,
        groupIds,
        groupNames,
        source: 'admin_test',
      },
      supabase
    );

    console.log('📬 MAILERLITE-TEST: Push result:', {
      success: result.success,
      statusCode: result.statusCode,
      subscriberId: result.subscriberId,
      errorMessage: result.errorMessage,
    });

    return res.status(result.success ? 200 : 502).json({
      success: result.success,
      statusCode: result.statusCode,
      subscriberId: result.subscriberId,
      errorMessage: result.errorMessage,
      data: result.data,
    });
  } catch (err: any) {
    console.error('📬 MAILERLITE-TEST: Unhandled exception:', err);
    console.error('📬 MAILERLITE-TEST: Error stack:', err?.stack);
    return res.status(500).json({ error: err.message || 'Internal server error', stack: err?.stack });
  }
}
