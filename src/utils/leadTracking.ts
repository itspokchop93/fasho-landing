interface LeadSourceData {
  source: string;           // google-ads, microsoft-ads, google-organic, bing-organic, direct
  medium: string;           // cpc, organic, direct
  campaign?: string;        // campaign name from ads
  keyword?: string;         // keyword from paid search
  referrer?: string;        // referring website
  landingPage: string;      // first page they visited
  userAgent: string;        // browser/device info
  gclid?: string;          // Google Ads click ID
  msclkid?: string;        // Microsoft Ads click ID
  timestamp: string;        // when they first arrived
  sessionId: string;        // unique session identifier
}

interface ProcessedLeadData {
  leadSource: string;       // "Google Ads", "Microsoft Ads", "Google Organic", etc.
  campaign?: string;        // campaign name
  keyword?: string;         // keyword
  referrer?: string;        // referring site
  landingPage: string;      // first page visited
  deviceInfo: string;       // browser and device details
  timestamp: string;        // formatted timestamp
  sessionId: string;        // session ID
}

class LeadTracker {
  private static readonly STORAGE_KEY = 'fasho_lead_data';
  private static readonly SESSION_KEY = 'fasho_session_id';

  /**
   * Generate a unique session ID
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get or create session ID
   */
  private static getSessionId(): string {
    if (typeof window === 'undefined') return '';
    
    let sessionId = sessionStorage.getItem(this.SESSION_KEY);
    if (!sessionId) {
      sessionId = this.generateSessionId();
      sessionStorage.setItem(this.SESSION_KEY, sessionId);
    }
    return sessionId;
  }

  /**
   * Parse URL parameters for tracking data
   */
  private static parseUrlParams(): URLSearchParams {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }

  /**
   * Get device and browser information
   */
  private static getDeviceInfo(): string {
    if (typeof window === 'undefined') return 'Unknown';
    
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let device = 'Desktop';

    // Detect browser
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';

    // Detect device
    if (/Mobi|Android/i.test(ua)) device = 'Mobile';
    else if (/Tablet|iPad/i.test(ua)) device = 'Tablet';

    return `${browser} on ${device}`;
  }

  /**
   * Determine lead source from URL parameters and referrer
   */
  private static determineLeadSource(params: URLSearchParams, referrer: string): {
    source: string;
    medium: string;
    campaign?: string;
    keyword?: string;
  } {
    // Google Ads detection
    if (params.get('gclid')) {
      return {
        source: 'google-ads',
        medium: 'cpc',
        campaign: params.get('utm_campaign') || 'Unknown Campaign',
        keyword: params.get('utm_term') || params.get('keyword') || 'Unknown Keyword'
      };
    }

    // Microsoft Ads detection
    if (params.get('msclkid')) {
      return {
        source: 'microsoft-ads',
        medium: 'cpc',
        campaign: params.get('utm_campaign') || 'Unknown Campaign',
        keyword: params.get('utm_term') || params.get('keyword') || 'Unknown Keyword'
      };
    }

    // UTM parameters (other paid campaigns)
    if (params.get('utm_source') && params.get('utm_medium') === 'cpc') {
      const source = params.get('utm_source')?.toLowerCase();
      if (source?.includes('google')) {
        return {
          source: 'google-ads',
          medium: 'cpc',
          campaign: params.get('utm_campaign') || 'Unknown Campaign',
          keyword: params.get('utm_term') || 'Unknown Keyword'
        };
      }
      if (source?.includes('bing') || source?.includes('microsoft')) {
        return {
          source: 'microsoft-ads',
          medium: 'cpc',
          campaign: params.get('utm_campaign') || 'Unknown Campaign',
          keyword: params.get('utm_term') || 'Unknown Keyword'
        };
      }
    }

    // Organic search detection
    if (referrer) {
      if (referrer.includes('google.com')) {
        return { source: 'google-organic', medium: 'organic' };
      }
      if (referrer.includes('bing.com')) {
        return { source: 'bing-organic', medium: 'organic' };
      }
      if (referrer.includes('yahoo.com')) {
        return { source: 'yahoo-organic', medium: 'organic' };
      }
      // Other referrals
      return { source: 'referral', medium: 'referral' };
    }

    // Direct traffic
    return { source: 'direct', medium: 'direct' };
  }

  /**
   * Format lead source for display
   */
  private static formatLeadSource(source: string, medium: string): string {
    switch (source) {
      case 'google-ads':
        return 'Google Ads';
      case 'microsoft-ads':
        return 'Microsoft Ads';
      case 'google-organic':
        return 'Google Organic';
      case 'bing-organic':
        return 'Bing Organic';
      case 'yahoo-organic':
        return 'Yahoo Organic';
      case 'referral':
        return 'Referral';
      case 'direct':
        return 'Direct';
      default:
        return 'Unknown';
    }
  }

  /**
   * Capture lead tracking data when user first visits
   */
  public static captureLeadData(): LeadSourceData | null {
    if (typeof window === 'undefined') return null;

    // Check if we already have lead data for this session
    const existingData = localStorage.getItem(this.STORAGE_KEY);
    if (existingData) {
      try {
        return JSON.parse(existingData) as LeadSourceData;
      } catch (e) {
        console.error('Error parsing existing lead data:', e);
      }
    }

    const params = this.parseUrlParams();
    const referrer = document.referrer;
    const sessionId = this.getSessionId();
    
    const leadInfo = this.determineLeadSource(params, referrer);
    
    const leadData: LeadSourceData = {
      source: leadInfo.source,
      medium: leadInfo.medium,
      campaign: leadInfo.campaign,
      keyword: leadInfo.keyword,
      referrer: referrer || undefined,
      landingPage: window.location.pathname + window.location.search,
      userAgent: navigator.userAgent,
      gclid: params.get('gclid') || undefined,
      msclkid: params.get('msclkid') || undefined,
      timestamp: new Date().toISOString(),
      sessionId
    };

    // Store lead data
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(leadData));
    
    console.log('Lead data captured:', leadData);
    return leadData;
  }

  /**
   * Get stored lead data
   */
  public static getLeadData(): LeadSourceData | null {
    if (typeof window === 'undefined') return null;

    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return null;

    try {
      return JSON.parse(data) as LeadSourceData;
    } catch (e) {
      console.error('Error parsing lead data:', e);
      return null;
    }
  }

  /**
   * Process lead data for AirTable submission
   */
  public static processLeadDataForSubmission(): ProcessedLeadData | null {
    const rawData = this.getLeadData();
    if (!rawData) return null;

    return {
      leadSource: this.formatLeadSource(rawData.source, rawData.medium),
      campaign: rawData.campaign,
      keyword: rawData.keyword,
      referrer: rawData.referrer,
      landingPage: rawData.landingPage,
      deviceInfo: this.getDeviceInfo(),
      timestamp: rawData.timestamp,
      sessionId: rawData.sessionId
    };
  }

  /**
   * Clear lead data (useful for testing)
   */
  public static clearLeadData(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem(this.SESSION_KEY);
  }
}

export default LeadTracker;
export type { LeadSourceData, ProcessedLeadData }; 