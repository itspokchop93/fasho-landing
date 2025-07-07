import { NextApiRequest, NextApiResponse } from 'next';
// This endpoint is obsolete and has been removed due to ElasticEmail migration.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(410).json({ error: 'This endpoint is obsolete. Use ElasticEmail test endpoint.' });
} 