import type { NextApiRequest, NextApiResponse } from 'next';

interface ExchangeRatesResponse {
  success: boolean;
  rates?: Record<string, number>;
  error?: string;
  timestamp?: number;
  base?: string;
}

// Cache exchange rates for 1 hour to reduce API calls
let cachedRates: Record<string, number> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Supported currencies for conversion display
const SUPPORTED_CURRENCIES = ['USD', 'GBP', 'CAD', 'AUD', 'EUR', 'CHF', 'SEK', 'NOK', 'DKK', 'NZD', 'JPY', 'SGD', 'HKD', 'PLN', 'CZK', 'HUF', 'BRL', 'MXN', 'KRW'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExchangeRatesResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const now = Date.now();
    
    // Return cached rates if still valid
    if (cachedRates && (now - cacheTimestamp) < CACHE_DURATION) {
      return res.status(200).json({
        success: true,
        rates: cachedRates,
        timestamp: cacheTimestamp,
        base: 'USD'
      });
    }

    // Fetch fresh rates from Open Exchange Rates
    const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID;
    
    if (!appId) {
      console.error('OPEN_EXCHANGE_RATES_APP_ID not configured');
      return res.status(500).json({
        success: false,
        error: 'Exchange rate service not configured'
      });
    }

    const symbols = SUPPORTED_CURRENCIES.join(',');
    const response = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${appId}&symbols=${symbols}&base=USD`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Open Exchange Rates API error:', errorText);
      
      // If we have cached rates, return them even if expired (better than nothing)
      if (cachedRates) {
        return res.status(200).json({
          success: true,
          rates: cachedRates,
          timestamp: cacheTimestamp,
          base: 'USD'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch exchange rates'
      });
    }

    const data = await response.json();
    
    if (!data.rates) {
      console.error('Invalid response from Open Exchange Rates:', data);
      return res.status(500).json({
        success: false,
        error: 'Invalid exchange rate data'
      });
    }

    // Update cache
    cachedRates = data.rates;
    cacheTimestamp = now;

    return res.status(200).json({
      success: true,
      rates: data.rates,
      timestamp: now,
      base: 'USD'
    });

  } catch (error) {
    console.error('Exchange rates API error:', error);
    
    // If we have cached rates, return them even if expired
    if (cachedRates) {
      return res.status(200).json({
        success: true,
        rates: cachedRates,
        timestamp: cacheTimestamp,
        base: 'USD'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
