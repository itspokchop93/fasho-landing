/**
 * Followiz SMM Panel API Integration
 * API Documentation: https://followiz.com/api/v2
 */

const FOLLOWIZ_API_URL = process.env.FOLLOWIZ_API_URL || 'https://followiz.com/api/v2';
const FOLLOWIZ_API_KEY = process.env.FOLLOWIZ_API_KEY || '';

interface FollowizService {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill: boolean;
  cancel: boolean;
}

interface FollowizBalance {
  balance: string;
  currency: string;
}

interface FollowizOrderResponse {
  order?: number;
  error?: string;
}

interface FollowizOrderStatus {
  charge?: string;
  start_count?: string;
  status?: string;
  remains?: string;
  currency?: string;
  error?: string;
}

interface AddOrderParams {
  serviceId: string;
  link: string;
  quantity: number;
  runs?: number | null;  // Optional drip feed - number of runs
  interval?: number | null;  // Optional drip feed - interval in minutes between runs
}

/**
 * Get the current balance from Followiz panel
 */
export async function getFollowizBalance(): Promise<{ success: boolean; balance?: string; currency?: string; error?: string }> {
  try {
    if (!FOLLOWIZ_API_KEY) {
      return { success: false, error: 'FOLLOWIZ_API_KEY not configured' };
    }

    const formData = new URLSearchParams();
    formData.append('key', FOLLOWIZ_API_KEY);
    formData.append('action', 'balance');

    const response = await fetch(FOLLOWIZ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP error: ${response.status}` };
    }

    const data: FollowizBalance = await response.json();
    
    if (data.balance) {
      return {
        success: true,
        balance: data.balance,
        currency: data.currency || 'USD',
      };
    }

    return { success: false, error: 'Invalid response from API' };
  } catch (error) {
    console.error('Followiz API Error (balance):', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get list of available services from Followiz panel
 */
export async function getFollowizServices(): Promise<{ success: boolean; services?: FollowizService[]; error?: string }> {
  try {
    if (!FOLLOWIZ_API_KEY) {
      return { success: false, error: 'FOLLOWIZ_API_KEY not configured' };
    }

    const formData = new URLSearchParams();
    formData.append('key', FOLLOWIZ_API_KEY);
    formData.append('action', 'services');

    const response = await fetch(FOLLOWIZ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP error: ${response.status}` };
    }

    const data: FollowizService[] = await response.json();
    
    if (Array.isArray(data)) {
      return {
        success: true,
        services: data,
      };
    }

    return { success: false, error: 'Invalid response from API' };
  } catch (error) {
    console.error('Followiz API Error (services):', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Submit an order to Followiz panel
 * Uses drip feed parameters: runs = number of drip deliveries, interval = minutes between each
 */
export async function submitFollowizOrder(params: AddOrderParams): Promise<{ success: boolean; orderId?: number; error?: string; rawResponse?: any }> {
  try {
    if (!FOLLOWIZ_API_KEY) {
      return { success: false, error: 'FOLLOWIZ_API_KEY not configured' };
    }

    const formData = new URLSearchParams();
    formData.append('key', FOLLOWIZ_API_KEY);
    formData.append('action', 'add');
    formData.append('service', params.serviceId);
    formData.append('link', params.link);
    formData.append('quantity', params.quantity.toString());
    
    // Add drip feed parameters if provided
    if (params.runs && params.runs > 0) {
      formData.append('runs', params.runs.toString());
    }
    if (params.interval && params.interval > 0) {
      formData.append('interval', params.interval.toString());
    }

    console.log('📤 Followiz API Request:', {
      service: params.serviceId,
      link: params.link,
      quantity: params.quantity,
      runs: params.runs,
      interval: params.interval,
    });

    const response = await fetch(FOLLOWIZ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP error: ${response.status}` };
    }

    const data: FollowizOrderResponse = await response.json();
    
    console.log('📥 Followiz API Response:', data);

    if (data.order) {
      return {
        success: true,
        orderId: data.order,
        rawResponse: data,
      };
    }

    if (data.error) {
      return { success: false, error: data.error, rawResponse: data };
    }

    return { success: false, error: 'Invalid response from API', rawResponse: data };
  } catch (error) {
    console.error('Followiz API Error (add order):', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get order status from Followiz panel
 */
export async function getFollowizOrderStatus(orderId: string): Promise<{ success: boolean; status?: FollowizOrderStatus; error?: string }> {
  try {
    if (!FOLLOWIZ_API_KEY) {
      return { success: false, error: 'FOLLOWIZ_API_KEY not configured' };
    }

    const formData = new URLSearchParams();
    formData.append('key', FOLLOWIZ_API_KEY);
    formData.append('action', 'status');
    formData.append('order', orderId);

    const response = await fetch(FOLLOWIZ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP error: ${response.status}` };
    }

    const data: FollowizOrderStatus = await response.json();
    
    if (data.error) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      status: data,
    };
  } catch (error) {
    console.error('Followiz API Error (status):', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get multiple order statuses from Followiz panel
 */
export async function getFollowizMultipleOrderStatus(orderIds: string[]): Promise<{ success: boolean; statuses?: { [key: string]: FollowizOrderStatus }; error?: string }> {
  try {
    if (!FOLLOWIZ_API_KEY) {
      return { success: false, error: 'FOLLOWIZ_API_KEY not configured' };
    }

    if (orderIds.length === 0) {
      return { success: false, error: 'No order IDs provided' };
    }

    if (orderIds.length > 100) {
      return { success: false, error: 'Maximum 100 order IDs allowed' };
    }

    const formData = new URLSearchParams();
    formData.append('key', FOLLOWIZ_API_KEY);
    formData.append('action', 'status');
    formData.append('orders', orderIds.join(','));

    const response = await fetch(FOLLOWIZ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP error: ${response.status}` };
    }

    const data = await response.json();
    
    return {
      success: true,
      statuses: data,
    };
  } catch (error) {
    console.error('Followiz API Error (multiple status):', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

