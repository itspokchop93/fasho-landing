import { useState, useEffect, useCallback } from 'react';
import { getCurrencyCode, getCountryConfig } from '../utils/countryConfig';

interface ExchangeRates {
  [currency: string]: number;
}

interface UseExchangeRatesReturn {
  rates: ExchangeRates | null;
  loading: boolean;
  error: string | null;
  convertFromUSD: (amountUSD: number, targetCurrency: string) => number | null;
  formatConvertedPrice: (amountUSD: number, countryCode: string) => string | null;
  getConversionDisplay: (amountUSD: number, countryCode: string) => string | null;
}

export function useExchangeRates(): UseExchangeRatesReturn {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/exchange-rates');
        const data = await response.json();
        
        if (data.success && data.rates) {
          setRates(data.rates);
        } else {
          setError(data.error || 'Failed to fetch exchange rates');
        }
      } catch (err) {
        console.error('Failed to fetch exchange rates:', err);
        setError('Failed to load exchange rates');
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
    
    // Refresh rates every 30 minutes
    const interval = setInterval(fetchRates, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  /**
   * Convert an amount from USD to a target currency
   */
  const convertFromUSD = useCallback((amountUSD: number, targetCurrency: string): number | null => {
    if (!rates || !rates[targetCurrency]) {
      return null;
    }
    
    // rates are relative to USD, so we multiply
    return amountUSD * rates[targetCurrency];
  }, [rates]);

  /**
   * Format a converted price with appropriate currency symbol and decimals
   */
  const formatConvertedPrice = useCallback((amountUSD: number, countryCode: string): string | null => {
    const currencyCode = getCurrencyCode(countryCode);
    
    // Don't show conversion for USD
    if (currencyCode === 'USD') {
      return null;
    }
    
    const convertedAmount = convertFromUSD(amountUSD, currencyCode);
    
    if (convertedAmount === null) {
      return null;
    }

    const config = getCountryConfig(countryCode);
    
    // Format based on currency (some currencies like JPY/KRW don't use decimals)
    const noDecimalCurrencies = ['JPY', 'KRW', 'HUF'];
    const decimals = noDecimalCurrencies.includes(currencyCode) ? 0 : 2;
    
    const formattedAmount = convertedAmount.toFixed(decimals);
    
    return `${config.currencySymbol}${formattedAmount} ${currencyCode}`;
  }, [convertFromUSD]);

  /**
   * Get a display string for the converted price in parentheses
   * Returns null if the country uses USD
   */
  const getConversionDisplay = useCallback((amountUSD: number, countryCode: string): string | null => {
    const formatted = formatConvertedPrice(amountUSD, countryCode);
    
    if (!formatted) {
      return null;
    }
    
    return `(${formatted})`;
  }, [formatConvertedPrice]);

  return {
    rates,
    loading,
    error,
    convertFromUSD,
    formatConvertedPrice,
    getConversionDisplay,
  };
}
