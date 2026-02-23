import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { group_id, group_name, is_active } = req.body;

    if (!group_id || typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'group_id and is_active (boolean) are required' });
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from('mailerlite_config')
      .select('id')
      .eq('group_id', group_id)
      .limit(1)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('mailerlite_config')
        .update({ is_active, group_name: group_name || '', updated_at: new Date().toISOString() })
        .eq('group_id', group_id);

      if (error) {
        console.error('mailerlite-config update error:', error);
        return res.status(500).json({ error: error.message });
      }
    } else {
      const { error } = await supabase
        .from('mailerlite_config')
        .insert({ group_id, group_name: group_name || '', is_active, updated_at: new Date().toISOString() });

      if (error) {
        console.error('mailerlite-config insert error:', error);
        return res.status(500).json({ error: error.message });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Admin mailerlite-config error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
