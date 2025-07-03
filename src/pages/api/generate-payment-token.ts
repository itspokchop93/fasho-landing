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
    const { amount, orderItems, customerEmail, billingInfo }: PaymentRequest = req.body;

    // Validate required fields
    if (!amount || !orderItems || !customerEmail || !billingInfo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: amount, orderItems, customerEmail, billingInfo' 
      });
    }

    // Validate billing information
    if (!billingInfo.firstName || !billingInfo.lastName || !billingInfo.address || 
        !billingInfo.city || !billingInfo.state || !billingInfo.zip || !billingInfo.country) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required billing information fields' 
      });
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
          "billTo": {
            "firstName": billingInfo.firstName,
            "lastName": billingInfo.lastName,
            "address": billingInfo.address,
            "city": billingInfo.city,
            "state": billingInfo.state,
            "zip": billingInfo.zip,
            "country": billingInfo.country
          }
        },
        "hostedPaymentSettings": {
          "setting": [
            {
              "settingName": "hostedPaymentReturnOptions",
              "settingValue": `{"showReceipt": true, "url": "${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/thank-you", "urlText": "Continue", "cancelUrl": "${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/checkout", "cancelUrlText": "Cancel"}`
            },
            {
              "settingName": "hostedPaymentButtonOptions", 
              "settingValue": `{"text": "Pay Now"}`
            },
            {
              "settingName": "hostedPaymentStyleOptions",
              "settingValue": `{"bgColor": "000000"}`
            },
            {
              "settingName": "hostedPaymentSecurityOptions",
              "settingValue": `{"captcha": false}`
            },
            {
              "settingName": "hostedPaymentShippingAddressOptions",
              "settingValue": `{"show": false, "required": false}`
            },
            {
              "settingName": "hostedPaymentBillingAddressOptions",
              "settingValue": `{"show": false, "required": false}`
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
      throw new Error(`Authorize.net API request failed: ${response.status} - ${errorText}`);
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

    console.log('Final payment URL:', `${paymentFormUrl}/payment/payment?token=${token.substring(0, 20)}...`);

    res.status(200).json({
      success: true,
      token: token,
      paymentUrl: `${paymentFormUrl}/payment/payment?token=${token}`
    });

  } catch (error: any) {
    console.error('Error generating payment token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment token'
    });
  }
} 