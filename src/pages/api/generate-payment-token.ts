import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

interface OrderItem {
  name: string;
  price: number;
}

interface PaymentRequest {
  amount: number;
  orderItems: OrderItem[];
  customerEmail: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { amount, orderItems, customerEmail }: PaymentRequest = req.body;

    // Validate required fields
    if (!amount || !orderItems || !customerEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: amount, orderItems, customerEmail' 
      });
    }

    // Get Authorize.net credentials from environment variables
    const apiLoginId = process.env.AUTHORIZE_NET_API_LOGIN_ID;
    const transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY;
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://accept.authorize.net' 
      : 'https://apitest.authorize.net'; // Sandbox URL

    if (!apiLoginId || !transactionKey) {
      console.error('Missing Authorize.net credentials');
      return res.status(500).json({ 
        success: false, 
        message: 'Payment configuration error' 
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
          "currencyCode": "USD",
          "order": {
            "invoiceNumber": `INV-${timestamp}`,
            "description": `Fasho Music Promotion - ${orderItems.length} package(s)`
          },
          "customer": {
            "email": customerEmail
          },
          "billTo": {
            "email": customerEmail
          },
          "lineItems": orderItems.map((item, index) => ({
            "itemId": (index + 1).toString(),
            "name": item.name.substring(0, 31), // Authorize.net limit
            "description": item.name.substring(0, 255), // Authorize.net limit
            "quantity": "1",
            "unitPrice": item.price.toFixed(2)
          }))
        },
        "hostedPaymentSettings": {
          "setting": [
            {
              "settingName": "hostedPaymentReturnOptions",
              "settingValue": JSON.stringify({
                "showReceipt": true,
                "url": `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/thank-you`,
                "urlText": "Continue",
                "cancelUrl": `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/checkout`,
                "cancelUrlText": "Cancel"
              })
            },
            {
              "settingName": "hostedPaymentButtonOptions",
              "settingValue": JSON.stringify({
                "text": "Pay Now"
              })
            },
            {
              "settingName": "hostedPaymentStyleOptions",
              "settingValue": JSON.stringify({
                "bgColor": "000000",
                "color": "ffffff"
              })
            },
            {
              "settingName": "hostedPaymentSecurityOptions",
              "settingValue": JSON.stringify({
                "captcha": false
              })
            },
            {
              "settingName": "hostedPaymentShippingAddressOptions", 
              "settingValue": JSON.stringify({
                "show": false
              })
            },
            {
              "settingName": "hostedPaymentBillingAddressOptions",
              "settingValue": JSON.stringify({
                "show": true,
                "required": false
              })
            }
          ]
        }
      }
    };

    // Make request to Authorize.net
    const response = await fetch(`${baseUrl}/xml/v1/request.api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(acceptHostedRequest),
    });

    if (!response.ok) {
      throw new Error(`Authorize.net API request failed: ${response.status}`);
    }

    const responseData = await response.json();

    // Check if the request was successful
    if (responseData.messages?.resultCode !== 'Ok') {
      console.error('Authorize.net API error:', responseData.messages);
      return res.status(400).json({
        success: false,
        message: responseData.messages?.message?.[0]?.text || 'Payment setup failed'
      });
    }

    // Return the payment token
    const token = responseData.token;
    if (!token) {
      throw new Error('No payment token received from Authorize.net');
    }

    res.status(200).json({
      success: true,
      token: token,
      paymentUrl: `${baseUrl}/payment/payment?token=${token}`
    });

  } catch (error: any) {
    console.error('Error generating payment token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment token'
    });
  }
} 