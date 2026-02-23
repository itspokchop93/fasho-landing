import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../utils/supabase/server';
import { pushSubscriberToMailerLite, getActiveGroupIds } from '../../utils/mailerlite/mailerliteService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, firstName, lastName, fullName, zip, source } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const supabase = createAdminClient();
    const { groupIds, groupNames } = await getActiveGroupIds(supabase);

    if (groupIds.length === 0) {
      console.log('📬 MAILERLITE-SUBSCRIBE: No active groups configured, skipping push');
      return res.status(200).json({ success: true, skipped: true, reason: 'No active groups configured' });
    }

    const result = await pushSubscriberToMailerLite(
      {
        email,
        firstName,
        lastName,
        fullName,
        zip,
        groupIds,
        groupNames,
        source: source || 'unknown',
      },
      supabase
    );

    return res.status(200).json({
      success: result.success,
      statusCode: result.statusCode,
      errorMessage: result.errorMessage,
    });
  } catch (err: any) {
    console.error('mailerlite-subscribe error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
