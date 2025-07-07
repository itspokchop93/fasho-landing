import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(410).json({ error: 'This endpoint is obsolete. Use ElasticEmail test endpoint.' });
} 