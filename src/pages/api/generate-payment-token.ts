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
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      console.error('DEBUG: Invalid email format:', customerEmail);
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    
    // Check email length (Authorize.net has a 255 character limit)
    if (customerEmail.length > 255) {
      console.error('DEBUG: Email too long:', customerEmail.length);
      return res.status(400).json({ success: false, message: 'Email address is too long (max 255 characters)' });
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
    const environment = process.env.AUTHORIZE_NET_ENVIRONMENT;
    
    // Production only - no sandbox fallback
    if (!environment || environment !== 'production') {
      console.error('AUTHORIZE_NET_ENVIRONMENT must be set to "production"');
      return res.status(500).json({ 
        success: false, 
        message: 'Payment configuration error - AUTHORIZE_NET_ENVIRONMENT must be set to "production"',
        debug: { environment, envVarExists: !!process.env.AUTHORIZE_NET_ENVIRONMENT }
      });
    }
    
    const baseUrl = 'https://api.authorize.net/xml/v1/request.api';

    console.log('🔧 PRODUCTION ENVIRONMENT CHECK (Updated Transaction Key):', {
      hasApiLoginId: !!apiLoginId,
      hasTransactionKey: !!transactionKey,
      apiLoginIdLength: apiLoginId?.length,
      transactionKeyLength: transactionKey?.length,
      apiLoginIdValue: apiLoginId?.substring(0, 6) + '...',
      transactionKeyValue: transactionKey?.substring(0, 6) + '...',
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

    // Validate credentials format
    if (apiLoginId.trim() !== apiLoginId || transactionKey.trim() !== transactionKey) {
      console.error('Credentials contain leading/trailing whitespace');
      return res.status(500).json({ 
        success: false, 
        message: 'Payment configuration error - credentials contain whitespace' 
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
    
    // Create a shorter, simpler invoice number to avoid conflicts
    const shortTimestamp = timestamp.slice(-8); // Last 8 digits of timestamp
    const invoiceNumber = `INV${shortTimestamp}`;
    
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
      if (!billTo[key] || billTo[key] === '') {
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
    
    // Ensure required fields are present and valid
    if (!billTo.firstName || !billTo.lastName || !billTo.address || !billTo.city || !billTo.state || !billTo.zip || !billTo.country) {
      console.error('DEBUG: Missing required billing fields:', billTo);
      return res.status(400).json({ success: false, message: 'All billing information fields are required' });
    }
    
    // Additional validation - check for common issues
    if (billTo.firstName.length > 50) {
      console.error('DEBUG: firstName too long:', billTo.firstName.length);
      return res.status(400).json({ success: false, message: 'First name is too long (max 50 characters)' });
    }
    if (billTo.lastName.length > 50) {
      console.error('DEBUG: lastName too long:', billTo.lastName.length);
      return res.status(400).json({ success: false, message: 'Last name is too long (max 50 characters)' });
    }
    if (billTo.address.length > 60) {
      console.error('DEBUG: address too long:', billTo.address.length);
      return res.status(400).json({ success: false, message: 'Address is too long (max 60 characters)' });
    }
    if (billTo.city.length > 40) {
      console.error('DEBUG: city too long:', billTo.city.length);
      return res.status(400).json({ success: false, message: 'City is too long (max 40 characters)' });
    }

    // Determine base URL for iframe communicator and return URLs based on environment
    let iframeCommunicatorBaseUrl, returnBaseUrl;
    
    // Always use production URLs for Authorize.net (they require HTTPS)
    iframeCommunicatorBaseUrl = 'https://www.fasho.co';
    returnBaseUrl = 'https://www.fasho.co';
    console.log('🔧 PAYMENT-TOKEN: Using production URLs for iframe communicator and return URLs');

    console.log('🔧 PAYMENT-TOKEN: Using base URL for iframe communicator:', iframeCommunicatorBaseUrl);

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
            "invoiceNumber": invoiceNumber,
            "description": `FASHO - Digital Marketing - ${orderItems.length} package(s)`
          },
          "customer": {
            "email": customerEmail.toString().trim()
          },
          "billTo": billTo
        },
        "hostedPaymentSettings": {
          "setting": [
            {
              "settingName": "hostedPaymentReturnOptions",
              "settingValue": JSON.stringify({
                showReceipt: false,
                url: `${returnBaseUrl}/thank-you`,
                cancelUrl: `${returnBaseUrl}/checkout`
              })
            },
            {
              "settingName": "hostedPaymentIFrameCommunicatorUrl",
              "settingValue": JSON.stringify({
                url: `${iframeCommunicatorBaseUrl}/iframe-communicator.html`
              })
            },
                        {
              "settingName": "hostedPaymentStyleOptions",
              "settingValue": "{\"bgColor\": \"#49ba87\"}"
            },
            {
              "settingName": "hostedPaymentPaymentOptions",
              "settingValue": "{\"cardCodeRequired\": true, \"showCreditCard\": true, \"showBankAccount\": false}"
            },
            {
              "settingName": "hostedPaymentSecurityOptions",
              "settingValue": "{\"captcha\": false}"
            },
            {
              "settingName": "hostedPaymentShippingAddressOptions",
              "settingValue": "{\"show\": false, \"required\": false}"
            },
            {
              "settingName": "hostedPaymentBillingAddressOptions",
              "settingValue": "{\"show\": false, \"required\": false}"
            },
            {
              "settingName": "hostedPaymentCustomerOptions",
              "settingValue": "{\"showEmail\": false, \"requiredEmail\": false, \"addPaymentProfile\": false}"
            },
            {
              "settingName": "hostedPaymentOrderOptions",
              "settingValue": "{\"show\": true, \"merchantName\": \"FASHO.co\"}"
            },
            {
              "settingName": "hostedPaymentButtonOptions",
              "settingValue": "{\"text\": \"Complete Checkout\"}"
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
    
    // Log the full request payload for debugging (without sensitive data)
    console.log('FULL REQUEST PAYLOAD:', JSON.stringify({
      ...acceptHostedRequest,
      getHostedPaymentPageRequest: {
        ...acceptHostedRequest.getHostedPaymentPageRequest,
        merchantAuthentication: {
          name: '[HIDDEN]',
          transactionKey: '[HIDDEN]'
        }
      }
    }, null, 2));
    
    // DEBUGGING: Log the exact billTo object being sent
    console.log('DEBUGGING: billTo object:', JSON.stringify(billTo, null, 2));
    console.log('DEBUGGING: customerEmail:', customerEmail);
    console.log('DEBUGGING: customerEmail length:', customerEmail.length);
    console.log('DEBUGGING: customerEmail type:', typeof customerEmail);
    
    // DEBUG: Log the exact authentication being sent
    console.log('🚨 DEBUGGING ACTUAL AUTH BEING SENT:');
    console.log('🚨 API Login ID (full):', `"${apiLoginId}"`);
    console.log('🚨 Transaction Key (full):', `"${transactionKey}"`);
    console.log('🚨 API Login ID length:', apiLoginId.length);
    console.log('🚨 Transaction Key length:', transactionKey.length);
    console.log('🚨 API Login ID has whitespace?', apiLoginId !== apiLoginId.trim());
    console.log('🚨 Transaction Key has whitespace?', transactionKey !== transactionKey.trim());

    // Make request to Authorize.net
    const response = await fetch(baseUrl, {
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
    
    // Always log full response for debugging
    console.log('Full Authorize.net response:', JSON.stringify(responseData, null, 2));

    // Check if the request was successful
    if (responseData.messages?.resultCode !== 'Ok') {
      console.error('Authorize.net API error:', responseData.messages);
      return res.status(400).json({
        success: false,
        message: responseData.messages?.message?.[0]?.text || 'Payment setup failed',
        // Temporary debugging - include full error details
        debug: {
          messages: responseData.messages,
          fullResponse: responseData,
          errorMessage: responseData.messages?.message?.[0]?.text,
          errorCode: responseData.messages?.message?.[0]?.code
        }
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

    // Production payment form URL (different from API URL)
    const paymentFormUrl = 'https://accept.authorize.net';

    console.log('Token generated successfully:', token.substring(0, 20) + '...');

    res.status(200).json({
      success: true,
      token: token,
      paymentFormUrl: `${paymentFormUrl}/payment/payment`
    });

  } catch (error: any) {
    console.error('Error generating payment token:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to generate payment token'
    });
  }
} 