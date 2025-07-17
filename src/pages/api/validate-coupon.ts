import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

interface CouponValidationResult {
  is_valid: boolean;
  coupon_id?: string;
  discount_type?: 'percentage' | 'flat';
  discount_value?: number;
  calculated_discount?: number;
  error_message?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Use service role client for coupon validation to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    console.log('🎫 VALIDATE-COUPON: Starting validation process...')
    
    const { coupon_code, order_amount } = req.body

    console.log('🎫 VALIDATE-COUPON: Request data:', {
      coupon_code: coupon_code?.substring(0, 5) + '...',
      order_amount
    })

    // Validate input
    if (!coupon_code || typeof coupon_code !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: 'coupon_code is required and must be a string'
      })
    }

    if (!order_amount || typeof order_amount !== 'number' || order_amount <= 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: 'order_amount is required and must be a positive number'
      })
    }

    console.log('🎫 VALIDATE-COUPON: Calling validation function...')

    // Call the database function to validate coupon
    const { data: validationResult, error } = await supabase
      .rpc('validate_coupon_code', {
        input_code: coupon_code.trim(),
        order_amount: order_amount
      })

    if (error) {
      console.error('🎫 VALIDATE-COUPON: Database function error:', error)
      return res.status(500).json({ 
        error: 'Failed to validate coupon',
        details: error.message
      })
    }

    console.log('🎫 VALIDATE-COUPON: Validation result:', validationResult)

    // The function returns an array with one result
    const result = validationResult[0] as CouponValidationResult

    if (!result) {
      return res.status(500).json({ 
        error: 'Invalid validation response',
        details: 'No validation result returned from database'
      })
    }

    if (result.is_valid) {
      console.log('🎫 VALIDATE-COUPON: Coupon is valid, discount:', result.calculated_discount)
      
      return res.status(200).json({
        success: true,
        valid: true,
        coupon: {
          id: result.coupon_id,
          discount_type: result.discount_type,
          discount_value: result.discount_value,
          calculated_discount: result.calculated_discount
        },
        message: `Coupon applied! You saved $${result.calculated_discount?.toFixed(2)}`
      })
    } else {
      console.log('🎫 VALIDATE-COUPON: Coupon is invalid:', result.error_message)
      
      return res.status(400).json({
        success: false,
        valid: false,
        error: result.error_message || 'Invalid coupon code'
      })
    }

  } catch (error: any) {
    console.error('🎫 VALIDATE-COUPON: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    })
  }
} 