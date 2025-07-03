import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

interface OrderItem {
  name: string;
  price: number;
}

interface BillingInfo {
  firstName: string;
  lastName: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface PaymentRequest {
  amount: number;
  orderItems: OrderItem[];
  customerEmail: string;
  billingInfo: BillingInfo;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    console.log('DEBUG: Incoming request body:', req.body);
    const { amount, orderItems, customerEmail, billingInfo }: PaymentRequest = req.body;

    // Validate required fields with detailed logging
    if (!amount) {
      console.error('DEBUG: Missing amount');
      return res.status(400).json({ success: false, message: 'Missing required field: amount' });
    }
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      console.error('DEBUG: Missing or invalid orderItems');
      return res.status(400).json({ success: false, message: 'Missing or invalid required field: orderItems' });
    }
    if (!customerEmail) {
      console.error('DEBUG: Missing customerEmail');
      return res.status(400).json({ success: false, message: 'Missing required field: customerEmail' });
    }
    if (!billingInfo) {
      console.error('DEBUG: Missing billingInfo');
      return res.status(400).json({ success: false, message: 'Missing required field: billingInfo' });
    }
    // Validate billing information fields
    const billingFields = ['firstName', 'lastName', 'address', 'city', 'state', 'zip', 'country'];
    for (const field of billingFields) {
      if (!(billingInfo as any)[field]) {
        console.error(`DEBUG: Missing billingInfo.${field}`);
        return res.status(400).json({ success: false, message: `Missing required billingInfo field: ${field}` });
      }
    }

    // Get Authorize.net credentials from environment variables
    const apiLoginId = process.env.AUTHORIZE_NET_API_LOGIN_ID;
    const transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY;
    const environment = process.env.AUTHORIZE_NET_ENVIRONMENT || 'sandbox';
    const baseUrl = environment === 'production' 
      ? 'https://accept.authorize.net' 
      : 'https://apitest.authorize.net'; // Sandbox URL

    console.log('Environment check:', {
      hasApiLoginId: !!apiLoginId,
      hasTransactionKey: !!transactionKey,
      apiLoginIdValue: apiLoginId?.substring(0, 4) + '...',
      environment,
      baseUrl,
      nodeEnv: process.env.NODE_ENV
    });

    if (!apiLoginId || !transactionKey) {
      console.error('Missing Authorize.net credentials - apiLoginId:', !!apiLoginId, 'transactionKey:', !!transactionKey);
      return res.status(500).json({ 
        success: false, 
        message: 'Payment configuration error - missing Authorize.net credentials' 
      });
    }

    if (apiLoginId === 'your_sandbox_login_id' || transactionKey === 'your_sandbox_transaction_key') {
      console.error('Authorize.net credentials are still set to placeholder values');
      return res.status(500).json({ 
        success: false, 
        message: 'Payment configuration error - please configure Authorize.net credentials in .env.local' 
      });
    }

    // Generate unique transaction reference
    const timestamp = Date.now().toString();
    const sequence = Math.floor(Math.random() * 1000000).toString();
    
    // Defensive: Only include supported, non-empty fields in billTo
    const billTo: any = {
      firstName: billingInfo.firstName,
      lastName: billingInfo.lastName,
      address: billingInfo.address,
      city: billingInfo.city,
      state: billingInfo.state,
      zip: billingInfo.zip,
      country: billingInfo.country
    };
    // Remove any fields that are empty strings or undefined
    Object.keys(billTo).forEach(key => {
      if (!billTo[key]) {
        delete billTo[key];
      }
    });
    // Defensive: Check field lengths and values
    if (billTo.state && billTo.state.length !== 2) {
      console.error('DEBUG: billTo.state is not 2 characters:', billTo.state);
      return res.status(400).json({ success: false, message: 'State must be 2-letter code' });
    }
    if (billTo.country && billTo.country.length !== 2) {
      console.error('DEBUG: billTo.country is not 2 characters:', billTo.country);
      return res.status(400).json({ success: false, message: 'Country must be 2-letter code' });
    }
    if (billTo.zip && !/^\d{5}(-\d{4})?$/.test(billTo.zip)) {
      console.error('DEBUG: billTo.zip is not valid US ZIP:', billTo.zip);
      return res.status(400).json({ success: false, message: 'ZIP code must be 5 or 9 digits' });
    }

    // Create the Accept Hosted request
    const acceptHostedRequest = {
      "getHostedPaymentPageRequest": {
        "merchantAuthentication": {
          "name": apiLoginId,
          "transactionKey": transactionKey
        },
        "transactionRequest": {
          "transactionType": "authCaptureTransaction",
          "amount": amount.toFixed(2),
          "order": {
            "invoiceNumber": `INV-${timestamp}`,
            "description": `Fasho Music Promotion - ${orderItems.length} package(s)`
          },
          "customer": {
            "email": customerEmail
          },
          "billTo": billTo
        },
        "hostedPaymentSettings": {
          "setting": [
            {
              "settingName": "hostedPaymentReturnOptions",
              "settingValue": "{\"showReceipt\": false, \"url\": \"https://fasho-landing.vercel.app/thank-you\", \"cancelUrl\": \"https://fasho-landing.vercel.app/checkout\"}"
            },
            {
              "settingName": "hostedPaymentIFrameCommunicatorUrl",
              "settingValue": "\"https://fasho-landing.vercel.app/iframe-communicator.html\""
            }
          ]
        }
      }
    };

    console.log('Making request to Authorize.net:', baseUrl);
    console.log('Request payload (sanitized):', {
      ...acceptHostedRequest,
      getHostedPaymentPageRequest: {
        ...acceptHostedRequest.getHostedPaymentPageRequest,
        merchantAuthentication: {
          name: apiLoginId?.substring(0, 4) + '...',
          transactionKey: '[HIDDEN]'
        }
      }
    });

    // Make request to Authorize.net
    const response = await fetch(`${baseUrl}/xml/v1/request.api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(acceptHostedRequest),
    });

    console.log('Authorize.net response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Authorize.net API request failed:', response.status, errorText);
      return res.status(500).json({
        success: false,
        message: `Authorize.net API request failed: ${response.status} - ${errorText}`
      });
    }

    const responseData = await response.json();
    console.log('Authorize.net response structure:', {
      hasToken: !!responseData.token,
      tokenType: typeof responseData.token,
      tokenLength: responseData.token ? responseData.token.length : 0,
      messages: responseData.messages,
      keys: Object.keys(responseData)
    });
    
    // Log full response in development for debugging
    if (environment === 'sandbox') {
      console.log('Full Authorize.net response:', JSON.stringify(responseData, null, 2));
    }

    // Check if the request was successful
    if (responseData.messages?.resultCode !== 'Ok') {
      console.error('Authorize.net API error:', responseData.messages);
      return res.status(400).json({
        success: false,
        message: responseData.messages?.message?.[0]?.text || 'Payment setup failed'
      });
    }

    // Extract the payment token from the response
    // Check if the response has the expected structure
    let token;
    if (responseData.token) {
      token = responseData.token;
    } else if (responseData.getHostedPaymentPageResponse && responseData.getHostedPaymentPageResponse.token) {
      token = responseData.getHostedPaymentPageResponse.token;
    } else {
      console.error('No token found in response structure:', responseData);
      throw new Error('No payment token found in Authorize.net response');
    }
    
    console.log('Extracted token:', token ? token.substring(0, 20) + '...' : 'null');
    
    if (!token) {
      console.error('No payment token received from Authorize.net response:', responseData);
      throw new Error('No payment token received from Authorize.net');
    }

    // Validate token format - should be a string
    if (typeof token !== 'string') {
      console.error('Invalid token format received:', typeof token, token);
      throw new Error('Invalid payment token format received from Authorize.net');
    }

    // Different URLs for payment form vs API calls
    const paymentFormUrl = environment === 'production' 
      ? 'https://accept.authorize.net'
      : 'https://test.authorize.net'; // Different from API URL!

    console.log('Token generated successfully:', token.substring(0, 20) + '...');

    res.status(200).json({
      success: true,
      token: token
    });

  } catch (error: any) {
    console.error('Error generating payment token:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to generate payment token'
    });
  }
} 