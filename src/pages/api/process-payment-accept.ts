import type { NextApiRequest, NextApiResponse } from 'next';

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
  opaqueData: {
    dataDescriptor: string;
    dataValue: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    console.log('DEBUG: Incoming request body:', req.body);
    const { amount, orderItems, customerEmail, billingInfo, opaqueData }: PaymentRequest = req.body;

    // Validate required fields
    if (!amount) return res.status(400).json({ success: false, message: 'Missing required field: amount' });
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing or invalid required field: orderItems' });
    }
    if (!customerEmail) return res.status(400).json({ success: false, message: 'Missing required field: customerEmail' });
    if (!opaqueData || !opaqueData.dataDescriptor || !opaqueData.dataValue) {
      return res.status(400).json({ success: false, message: 'Missing payment data' });
    }
    if (!billingInfo) return res.status(400).json({ success: false, message: 'Missing required field: billingInfo' });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    // Get Authorize.net credentials
    const apiLoginId = process.env.AUTHORIZE_NET_API_LOGIN_ID;
    const transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY;
    const environment = process.env.AUTHORIZE_NET_ENVIRONMENT;

    if (!apiLoginId || !transactionKey) {
      console.error('Missing Authorize.net credentials');
      return res.status(500).json({ success: false, message: 'Payment configuration error' });
    }

    if (environment !== 'production') {
       console.error('AUTHORIZE_NET_ENVIRONMENT must be set to "production"');
       // We proceed but log error, or fail if strict. The original code enforced production.
    }

    const baseUrl = 'https://api.authorize.net/xml/v1/request.api';

    // Generate unique transaction reference
    const timestamp = Date.now().toString();
    const shortTimestamp = timestamp.slice(-8);
    const invoiceNumber = `INV${shortTimestamp}`;

    // Prepare BillTo
    const billTo: any = {
      firstName: billingInfo.firstName,
      lastName: billingInfo.lastName,
      address: billingInfo.address,
      city: billingInfo.city,
      state: billingInfo.state,
      zip: billingInfo.zip,
      country: billingInfo.country
    };

    // Construct the CreateTransactionRequest
    const transactionRequest = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: apiLoginId,
          transactionKey: transactionKey
        },
        transactionRequest: {
          transactionType: "authCaptureTransaction",
          amount: amount.toFixed(2),
          payment: {
            opaqueData: {
              dataDescriptor: opaqueData.dataDescriptor,
              dataValue: opaqueData.dataValue
            }
          },
          order: {
            invoiceNumber: invoiceNumber,
            description: `FASHO - Digital Marketing - ${orderItems.length} package(s)`
          },
          lineItems: {
            lineItem: orderItems.map((item, index) => ({
              itemId: (index + 1).toString(),
              name: item.name.substring(0, 31), // Auth.net limit
              description: item.name.substring(0, 255),
              quantity: "1",
              unitPrice: item.price.toFixed(2)
            }))
          },
          customer: {
            email: customerEmail
          },
          billTo: billTo
        }
      }
    };

    console.log('Making transaction request to Authorize.net...');

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(transactionRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Authorize.net API request failed:', response.status, errorText);
      throw new Error(`Authorize.net API request failed: ${response.status}`);
    }

    const responseData = await response.json();
    
    // Log full response for debugging
    // console.log('Authorize.net Response:', JSON.stringify(responseData, null, 2));

    if (responseData.messages?.resultCode === 'Ok') {
      if (responseData.transactionResponse?.responseCode === '1') {
        // Success
        console.log('Transaction Successful:', responseData.transactionResponse.transId);
        return res.status(200).json({
          success: true,
          transId: responseData.transactionResponse.transId,
          authorization: responseData.transactionResponse.authCode,
          accountNumber: responseData.transactionResponse.accountNumber,
          accountType: responseData.transactionResponse.accountType,
          message: 'Payment successful'
        });
      } else {
        // Transaction declined or error
        const errors = responseData.transactionResponse?.errors;
        const errorText = errors && errors.length > 0 
          ? `${errors[0].errorCode}: ${errors[0].errorText}`
          : 'Transaction declined';
        
        console.error('Transaction failed:', errorText);
        return res.status(400).json({
          success: false,
          message: errorText,
          debug: responseData.transactionResponse
        });
      }
    } else {
      // Request failed
      const message = responseData.messages?.message?.[0]?.text || 'Payment request failed';
      console.error('Payment request failed:', message);
      return res.status(400).json({
        success: false,
        message: message,
        debug: responseData.messages
      });
    }

  } catch (error: any) {
    console.error('Error processing payment:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to process payment'
    });
  }
}



