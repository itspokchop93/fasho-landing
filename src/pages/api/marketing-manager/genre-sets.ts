import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '../../../utils/supabase/server';
import { requireAdminAuth, AdminUser } from '../../../utils/admin/auth';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  _adminUser: AdminUser
) {
  const supabase = createAdminClient();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('genre_sets')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data || []);
  }

  if (req.method === 'POST') {
    const { name, genres } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!genres || typeof genres !== 'string' || !genres.trim()) {
      return res.status(400).json({ error: 'At least one genre is required' });
    }

    const { data, error } = await supabase
      .from('genre_sets')
      .insert([{ name: name.trim(), genres: genres.trim() }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  }

  if (req.method === 'PUT') {
    const { id, name, genres } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!genres || typeof genres !== 'string' || !genres.trim()) {
      return res.status(400).json({ error: 'At least one genre is required' });
    }

    const { data, error } = await supabase
      .from('genre_sets')
      .update({ name: name.trim(), genres: genres.trim() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    const { error } = await supabase
      .from('genre_sets')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAdminAuth(handler);
