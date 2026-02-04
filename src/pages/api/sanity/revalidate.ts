// Sanity Webhook Revalidation Endpoint
// Handles on-demand revalidation when content changes in Sanity
// 
// Configure in Sanity: Settings > API > Webhooks
// URL: https://fasho.co/api/sanity/revalidate
// Secret: Use SANITY_WEBHOOK_SECRET environment variable
// Events: Create, Update, Delete for "post" document type

import type { NextApiRequest, NextApiResponse } from 'next';

// Type for the Sanity webhook payload
interface SanityWebhookPayload {
  _id: string;
  _type: string;
  _rev?: string;
  slug?: {
    current?: string;
  };
  // Previous slug (for detecting slug changes)
  delta?: {
    before?: {
      slug?: {
        current?: string;
      };
    };
    after?: {
      slug?: {
        current?: string;
      };
    };
  };
}

// Verify webhook signature using SANITY_WEBHOOK_SECRET
function verifyWebhookSecret(req: NextApiRequest): boolean {
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  
  if (!secret) {
    console.warn('⚠️ SANITY WEBHOOK: SANITY_WEBHOOK_SECRET not configured');
    return false;
  }
  
  // Sanity sends the secret in the sanity-webhook-secret header
  const providedSecret = req.headers['sanity-webhook-secret'] as string;
  
  if (!providedSecret || providedSecret !== secret) {
    console.error('❌ SANITY WEBHOOK: Invalid or missing secret');
    return false;
  }
  
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  // Verify webhook secret
  if (!verifyWebhookSecret(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    const payload = req.body as SanityWebhookPayload;
    
    console.log('📡 SANITY WEBHOOK: Received payload:', JSON.stringify(payload, null, 2));
    
    // Only handle post documents
    if (payload._type !== 'post') {
      console.log(`⏭️ SANITY WEBHOOK: Ignoring ${payload._type} document`);
      return res.status(200).json({ message: 'Ignored - not a post' });
    }
    
    const currentSlug = payload.slug?.current;
    const previousSlug = payload.delta?.before?.slug?.current;
    
    const pathsToRevalidate: string[] = ['/blog'];
    
    // Revalidate the current slug
    if (currentSlug) {
      pathsToRevalidate.push(`/blog/${currentSlug}`);
    }
    
    // If slug changed, also revalidate the old slug path
    if (previousSlug && previousSlug !== currentSlug) {
      pathsToRevalidate.push(`/blog/${previousSlug}`);
      console.log(`↪️ SANITY WEBHOOK: Slug changed from "${previousSlug}" to "${currentSlug}"`);
    }
    
    console.log(`🔄 SANITY WEBHOOK: Revalidating paths: ${pathsToRevalidate.join(', ')}`);
    
    // Revalidate all affected paths
    const revalidationResults = await Promise.allSettled(
      pathsToRevalidate.map(async (path) => {
        try {
          await res.revalidate(path);
          console.log(`✅ SANITY WEBHOOK: Revalidated ${path}`);
          return { path, success: true };
        } catch (err) {
          console.error(`❌ SANITY WEBHOOK: Failed to revalidate ${path}:`, err);
          return { path, success: false, error: String(err) };
        }
      })
    );
    
    const results = revalidationResults.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return { success: false, error: String(result.reason) };
    });
    
    return res.status(200).json({
      message: 'Revalidation triggered',
      revalidated: pathsToRevalidate,
      results
    });
    
  } catch (error) {
    console.error('❌ SANITY WEBHOOK: Error processing webhook:', error);
    return res.status(500).json({
      message: 'Error processing webhook',
      error: String(error)
    });
  }
}

// Disable body parsing to access raw body if needed for signature verification
export const config = {
  api: {
    bodyParser: true, // Keep enabled for JSON parsing
  },
};
