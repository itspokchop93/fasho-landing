import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { fetchGroups } from '../../../utils/mailerlite/mailerliteService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await fetchGroups();

    if (!result.success) {
      return res.status(502).json({ error: result.error || 'Failed to fetch groups from MailerLite' });
    }

    const supabase = createAdminClient();
    const { data: savedConfigs } = await supabase
      .from('mailerlite_config')
      .select('group_id, is_active');

    const activeMap = new Map<string, boolean>();
    (savedConfigs || []).forEach((c: any) => {
      activeMap.set(c.group_id, c.is_active);
    });

    const groups = result.groups.map((g) => ({
      ...g,
      is_selected: activeMap.get(g.id) === true,
    }));

    return res.status(200).json({ groups });
  } catch (err: any) {
    console.error('Admin mailerlite-groups error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
