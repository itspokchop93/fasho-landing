import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Google Indexing API
const getGoogleIndexingClient = () => {
  try {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not found in environment variables');
    }

    const credentials = JSON.parse(serviceAccountKey);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });

    return google.indexing({ version: 'v3', auth });
  } catch (error) {
    console.error('Failed to initialize Google Indexing API:', error);
    return null;
  }
};

// Ping Google sitemap
const pingGoogleSitemap = async (): Promise<{ status: string; response: string }> => {
  try {
    const sitemapUrl = 'https://fasho.co/blog/sitemap.xml';
    const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    
    const response = await fetch(pingUrl, { method: 'GET' });
    
    if (response.ok) {
      return {
        status: 'success',
        response: `Google sitemap ping successful (${response.status})`
      };
    } else {
      return {
        status: 'error',
        response: `Google sitemap ping failed with status ${response.status}`
      };
    }
  } catch (error) {
    return {
      status: 'error',
      response: `Google sitemap ping error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Ping Bing sitemap
const pingBingSitemap = async (): Promise<{ status: string; response: string }> => {
  try {
    const sitemapUrl = 'https://fasho.co/blog/sitemap.xml';
    const pingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    
    const response = await fetch(pingUrl, { method: 'GET' });
    
    if (response.ok) {
      return {
        status: 'success',
        response: `Bing sitemap ping successful (${response.status})`
      };
    } else {
      return {
        status: 'error',
        response: `Bing sitemap ping failed with status ${response.status}`
      };
    }
  } catch (error) {
    return {
      status: 'error',
      response: `Bing sitemap ping error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Submit to Google Indexing API
const submitToGoogleIndexing = async (url: string): Promise<{ status: string; response: string }> => {
  try {
    const indexingService = getGoogleIndexingClient();
    if (!indexingService) {
      return {
        status: 'error',
        response: 'Failed to initialize Google Indexing API client'
      };
    }

    const response = await indexingService.urlNotifications.publish({
      requestBody: {
        url: url,
        type: 'URL_UPDATED'
      }
    });

    return {
      status: 'success',
      response: `Google Indexing API successful: ${JSON.stringify(response.data)}`
    };
  } catch (error) {
    return {
      status: 'error',
      response: `Google Indexing API error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Submit to Bing IndexNow
const submitToBingIndexNow = async (url: string): Promise<{ status: string; response: string }> => {
  try {
    const bingKey = '7d74a786c60e481b9d28086a23118639';
    const indexNowUrl = `https://www.bing.com/indexnow?url=${encodeURIComponent(url)}&key=${bingKey}`;
    
    const response = await fetch(indexNowUrl, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok || response.status === 200 || response.status === 202) {
      return {
        status: 'success',
        response: `Bing IndexNow successful (${response.status})`
      };
    } else {
      const errorText = await response.text();
      return {
        status: 'error',
        response: `Bing IndexNow failed with status ${response.status}: ${errorText}`
      };
    }
  } catch (error) {
    return {
      status: 'error',
      response: `Bing IndexNow error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log(`Starting index submission for URL: ${url}`);

    // Execute all indexing steps sequentially
    const timestamp = new Date().toISOString();
    
    console.log('Step 1: Pinging Google sitemap...');
    const googleSitemapResult = await pingGoogleSitemap();
    console.log('Google sitemap result:', googleSitemapResult);

    console.log('Step 2: Pinging Bing sitemap...');
    const bingSitemapResult = await pingBingSitemap();
    console.log('Bing sitemap result:', bingSitemapResult);

    console.log('Step 3: Submitting to Google Indexing API...');
    const googleIndexingResult = await submitToGoogleIndexing(url);
    console.log('Google Indexing API result:', googleIndexingResult);

    console.log('Step 4: Submitting to Bing IndexNow...');
    const bingIndexNowResult = await submitToBingIndexNow(url);
    console.log('Bing IndexNow result:', bingIndexNowResult);

    // Compile results
    const results = {
      googleSitemapPing: googleSitemapResult,
      bingSitemapPing: bingSitemapResult,
      googleIndexingAPI: googleIndexingResult,
      bingIndexNowAPI: bingIndexNowResult
    };

    // Store submission in database
    const { data: submissionData, error: dbError } = await supabase
      .from('blog_index_submissions')
      .insert({
        url,
        submitted_at: timestamp,
        submitted_by: 'admin', // TODO: Get from auth context
        results
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ 
        error: 'Failed to save submission to database',
        details: dbError.message 
      });
    }

    console.log('Index submission completed successfully');

    // Return response
    res.status(200).json({
      success: true,
      data: {
        url,
        timestamp,
        results,
        submissionId: submissionData.id
      }
    });

  } catch (error) {
    console.error('Index submission error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
