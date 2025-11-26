import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { SquareClient, SquareEnvironment, Country } from 'square';

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
  countryCode?: string;
  phoneNumber?: string;
}

interface PaymentRequest {
  sourceId: string; // Payment token from Square Web Payments SDK
  amount: number;
  orderItems: OrderItem[];
  customerEmail: string;
  billingInfo: BillingInfo;
}

// Map Square error codes to user-friendly messages
function getDeclineReason(errorCode: string, errorDetail?: string): string {
  const declineReasons: { [key: string]: string } = {
    // Card declined reasons
    'INSUFFICIENT_FUNDS': 'Your card was declined due to insufficient funds. Please try a different card.',
    'CARD_DECLINED': 'Your card was declined. Please try a different card or contact your bank.',
    'CARD_DECLINED_CALL_ISSUER': 'Your card was declined. Please contact your bank for more information.',
    'CARD_DECLINED_VERIFICATION_REQUIRED': 'Your card requires additional verification. Please contact your bank.',
    'CVV_FAILURE': 'The CVV code entered is incorrect. Please check your card details and try again.',
    'INVALID_EXPIRATION': 'The expiration date is invalid. Please check your card details.',
    'INVALID_CARD': 'The card number is invalid. Please check your card details.',
    'INVALID_CARD_DATA': 'The card information is invalid. Please check your card details and try again.',
    'CARD_EXPIRED': 'Your card has expired. Please use a different card.',
    'CARD_NOT_SUPPORTED': 'This card type is not supported. Please try a different card.',
    'INVALID_PIN': 'The PIN entered is incorrect. Please try again.',
    'GENERIC_DECLINE': 'Your card was declined. Please try a different card or contact your bank.',
    
    // Transaction limits
    'TRANSACTION_LIMIT': 'This transaction exceeds your card\'s spending limit. Please try a smaller amount or contact your bank.',
    'AMOUNT_TOO_HIGH': 'The transaction amount exceeds the allowed limit. Please try a smaller amount.',
    'VOICE_FAILURE': 'Voice authorization failed. Please contact your bank.',
    
    // Fraud/Security
    'FRAUD_REJECTED': 'This transaction was declined for security reasons. Please contact your bank.',
    'ADDRESS_VERIFICATION_FAILURE': 'The billing address doesn\'t match your card. Please verify your address.',
    'INVALID_POSTAL_CODE': 'The ZIP/postal code doesn\'t match your card. Please verify your billing address.',
    
    // Processing errors
    'TEMPORARILY_UNAVAILABLE': 'The payment service is temporarily unavailable. Please try again in a few minutes.',
    'PROCESSING_ERROR': 'There was an error processing your payment. Please try again.',
    'PAYMENT_LIMIT_EXCEEDED': 'You have exceeded the payment limit. Please try again later.',
    'INVALID_LOCATION': 'Payment configuration error. Please contact support.',
    
    // Authentication
    'UNAUTHORIZED': 'Payment authorization failed. Please try again.',
    'BAD_CERTIFICATE': 'Payment service configuration error. Please contact support.',
    'INVALID_FEES': 'Payment configuration error. Please contact support.',
    
    // Other
    'PAN_FAILURE': 'Your card number could not be verified. Please check your card details.',
    'EXPIRATION_FAILURE': 'The expiration date could not be verified. Please check your card details.',
    'CHIP_INSERTION_REQUIRED': 'This card requires chip insertion. Please try a different payment method.',
    'ALLOWABLE_PIN_TRIES_EXCEEDED': 'Too many PIN attempts. Your card has been temporarily locked.',
    'CARD_TOKEN_EXPIRED': 'Your payment session has expired. Please refresh the page and try again.',
    'CARD_TOKEN_USED': 'This payment has already been processed. Please refresh the page for a new transaction.',
  };

  // Check if we have a friendly message for this error code
  if (errorCode && declineReasons[errorCode]) {
    return declineReasons[errorCode];
  }

  // If there's a detail message from Square, use it but make it friendlier
  if (errorDetail) {
    // Clean up common Square error details
    if (errorDetail.includes('TRANSACTION_LIMIT')) {
      return declineReasons['TRANSACTION_LIMIT'];
    }
    if (errorDetail.includes('insufficient') || errorDetail.includes('INSUFFICIENT')) {
      return declineReasons['INSUFFICIENT_FUNDS'];
    }
    if (errorDetail.includes('declined') || errorDetail.includes('DECLINED')) {
      return declineReasons['CARD_DECLINED'];
    }
    if (errorDetail.includes('expired') || errorDetail.includes('EXPIRED')) {
      return declineReasons['CARD_EXPIRED'];
    }
    // Return the detail if it's somewhat user-friendly
    if (errorDetail.length < 200 && !errorDetail.includes('_')) {
      return errorDetail;
    }
  }

  // Default fallback
  return 'Your payment could not be processed. Please try a different card or contact your bank.';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    console.log('🟩 SQUARE-PAYMENT: Starting payment processing');
    const { sourceId, amount, orderItems, customerEmail, billingInfo }: PaymentRequest = req.body;

    // Validate required fields
    if (!sourceId) {
      console.error('🟩 SQUARE-PAYMENT: Missing sourceId (payment token)');
      return res.status(400).json({ success: false, message: 'Payment token is required' });
    }
    if (!amount || amount <= 0) {
      console.error('🟩 SQUARE-PAYMENT: Missing or invalid amount');
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }
    if (!customerEmail) {
      console.error('🟩 SQUARE-PAYMENT: Missing customerEmail');
      return res.status(400).json({ success: false, message: 'Customer email is required' });
    }
    if (!billingInfo) {
      console.error('🟩 SQUARE-PAYMENT: Missing billingInfo');
      return res.status(400).json({ success: false, message: 'Billing information is required' });
    }

    // Get Square credentials from environment variables
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;
    const squareEnvironment = process.env.SQUARE_ENVIRONMENT || 'sandbox';

    console.log('🟩 SQUARE-PAYMENT: Environment check:', {
      hasAccessToken: !!accessToken,
      hasLocationId: !!locationId,
      environment: squareEnvironment,
      accessTokenLength: accessToken?.length,
      locationIdLength: locationId?.length
    });

    if (!accessToken || !locationId) {
      console.error('🟩 SQUARE-PAYMENT: Missing Square credentials');
      return res.status(500).json({ 
        success: false, 
        message: 'Payment configuration error - missing Square credentials' 
      });
    }

    // Initialize Square client (v43+ uses 'token' not 'accessToken')
    const environment = squareEnvironment === 'production' 
      ? SquareEnvironment.Production 
      : SquareEnvironment.Sandbox;
    
    console.log('🟩 SQUARE-PAYMENT: Using environment:', environment);
    
    const client = new SquareClient({
      token: accessToken,
      environment: environment
    });

    // Convert amount from dollars to cents (Square requires cents)
    const amountInCents = Math.round(amount * 100);

    // Generate unique idempotency key to prevent duplicate payments
    const idempotencyKey = uuidv4();

    console.log('🟩 SQUARE-PAYMENT: Processing payment:', {
      amountInDollars: amount,
      amountInCents: amountInCents,
      customerEmail: customerEmail,
      idempotencyKey: idempotencyKey,
      sourceIdPrefix: sourceId.substring(0, 20) + '...'
    });

    // Build billing address for Square
    const billingAddress = {
      firstName: billingInfo.firstName,
      lastName: billingInfo.lastName,
      addressLine1: billingInfo.address,
      addressLine2: billingInfo.address2 || undefined,
      locality: billingInfo.city,
      administrativeDistrictLevel1: billingInfo.state,
      postalCode: billingInfo.zip,
      country: (billingInfo.country || 'US') as Country
    };

    // Create the payment using Square SDK v43+ syntax
    // Note: Square SDK v43 expects amount as BigInt
    console.log('🟩 SQUARE-PAYMENT: Calling client.payments.create...');
    
    const response = await client.payments.create({
      sourceId: sourceId,
      idempotencyKey: idempotencyKey,
      amountMoney: {
        amount: BigInt(amountInCents),
        currency: 'USD'
      },
      locationId: locationId,
      buyerEmailAddress: customerEmail,
      billingAddress: billingAddress,
      note: `Focused Founders - ${orderItems?.length || 1} package(s)`,
      statementDescriptionIdentifier: 'FOCUSED FOUNDERS'
    });

    console.log('🟩 SQUARE-PAYMENT: Response received');
    console.log('🟩 SQUARE-PAYMENT: Response type:', typeof response);
    console.log('🟩 SQUARE-PAYMENT: Response keys:', response ? Object.keys(response) : 'null');
    
    // The response might be the payment directly, or wrapped in a 'payment' property
    const paymentResult = (response as any)?.payment || response;
    
    console.log('🟩 SQUARE-PAYMENT: Payment result type:', typeof paymentResult);
    console.log('🟩 SQUARE-PAYMENT: Payment result keys:', paymentResult ? Object.keys(paymentResult) : 'null');
    
    // Log the full response for debugging (convert BigInt to string)
    try {
      const responseForLog = JSON.parse(JSON.stringify(response, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
      console.log('🟩 SQUARE-PAYMENT: Full response:', JSON.stringify(responseForLog).substring(0, 500));
    } catch (e) {
      console.log('🟩 SQUARE-PAYMENT: Could not stringify response:', e);
    }

    console.log('🟩 SQUARE-PAYMENT: Square API response:', {
      paymentId: paymentResult?.id,
      status: paymentResult?.status,
      receiptUrl: paymentResult?.receiptUrl
    });

    // Check if payment was successful
    if (paymentResult && paymentResult.status === 'COMPLETED') {
      console.log('🟩 SQUARE-PAYMENT: ✅ Payment completed successfully');
      
      // Convert BigInt values to strings/numbers for JSON serialization
      const totalAmount = paymentResult.totalMoney?.amount 
        ? Number(paymentResult.totalMoney.amount) 
        : null;
      
      return res.status(200).json({
        success: true,
        payment: {
          transactionId: paymentResult.id,
          status: paymentResult.status,
          receiptUrl: paymentResult.receiptUrl,
          totalMoney: {
            amount: totalAmount,
            currency: paymentResult.totalMoney?.currency
          },
          createdAt: paymentResult.createdAt
        }
      });
    } else {
      // Payment was not completed (could be pending or failed)
      console.error('🟩 SQUARE-PAYMENT: Payment not completed');
      console.error('🟩 SQUARE-PAYMENT: Status:', paymentResult?.status);
      console.error('🟩 SQUARE-PAYMENT: Full result:', paymentResult);
      
      // Try to get more details
      let resultDetails = 'Unknown';
      try {
        resultDetails = JSON.stringify(paymentResult, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        );
      } catch (e) {}
      
      return res.status(400).json({
        success: false,
        message: `Payment ${paymentResult?.status || 'failed'}. Check debug for details.`,
        paymentId: paymentResult?.id,
        paymentStatus: paymentResult?.status,
        debug: resultDetails
      });
    }

  } catch (error: any) {
    console.error('🟩 SQUARE-PAYMENT: Error processing payment:', error);
    console.error('🟩 SQUARE-PAYMENT: Error name:', error?.name);
    console.error('🟩 SQUARE-PAYMENT: Error message:', error?.message);
    
    // Try to extract full error details
    let errorDetails = null;
    try {
      errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
      console.error('🟩 SQUARE-PAYMENT: Full error:', errorDetails);
    } catch (e) {
      console.error('🟩 SQUARE-PAYMENT: Could not stringify error');
    }

    // Handle Square API errors specifically
    // Check if error has Square-specific properties
    if (error && typeof error === 'object' && 'errors' in error) {
      console.error('🟩 SQUARE-PAYMENT: Square API Error:', {
        statusCode: (error as any).statusCode,
        errors: (error as any).errors
      });

      // Get user-friendly decline reason
      const errorCode = (error as any).errors?.[0]?.code;
      const errorDetail = (error as any).errors?.[0]?.detail;
      const friendlyMessage = getDeclineReason(errorCode, errorDetail);

      return res.status((error as any).statusCode || 400).json({
        success: false,
        message: friendlyMessage,
        errorCode: errorCode,
        errors: (error as any).errors,
        debug: errorDetails
      });
    }
    
    // Check for body property (some SDK errors have this)
    if (error?.body?.errors) {
      const bodyErrors = error.body.errors;
      console.error('🟩 SQUARE-PAYMENT: Body errors:', bodyErrors);
      
      // Get user-friendly decline reason
      const errorCode = bodyErrors[0]?.code;
      const errorDetail = bodyErrors[0]?.detail;
      const friendlyMessage = getDeclineReason(errorCode, errorDetail);
      
      return res.status(400).json({
        success: false,
        message: friendlyMessage,
        errorCode: errorCode,
        errors: bodyErrors,
        debug: errorDetails
      });
    }

    // Generic error handling
    return res.status(500).json({
      success: false,
      message: 'There was an error processing your payment. Please try again or contact support.',
      errorType: error?.name,
      debug: errorDetails
    });
  }
}

