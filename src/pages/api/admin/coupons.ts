import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../utils/supabase/server'
import { requireAdminRole, AdminUser } from '../../../utils/admin/auth'

interface CouponCode {
  id: string;
  code: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  usage_limit?: number;
  current_usage: number;
  is_active: boolean;
  starts_at: string;
  expires_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  const supabase = createAdminClient()

  try {
    console.log('🎫 COUPONS-API: Starting request processing...')
    console.log('🎫 COUPONS-API: Admin user:', adminUser.email)
    console.log('🎫 COUPONS-API: Processing', req.method, 'request')

    switch (req.method) {
      case 'GET':
        return await getCoupons(supabase, req, res)
      case 'POST':
        return await createCoupon(supabase, req, res, adminUser)
      case 'PUT':
        return await updateCoupon(supabase, req, res, adminUser)
      case 'DELETE':
        return await deleteCoupon(supabase, req, res)
      default:
        console.log('🎫 COUPONS-API: Method not allowed:', req.method)
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${req.method} not allowed` })
    }
  } catch (error: any) {
    console.error('🎫 COUPONS-API: Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function getCoupons(supabase: any, req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🎫 COUPONS-GET: Fetching all coupon codes')
    
    const { data: coupons, error } = await supabase
      .from('coupon_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('🎫 COUPONS-GET: Database query failed:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      
      if (error.code === '42P01') {
        return res.status(500).json({ 
          error: 'Coupon codes table does not exist',
          details: 'Please run the coupon system migration SQL in your Supabase database',
          code: 'TABLE_NOT_EXISTS'
        })
      }
      
      return res.status(500).json({ 
        error: 'Failed to fetch coupon codes',
        details: error.message,
        code: error.code
      })
    }

    console.log('🎫 COUPONS-GET: Successfully fetched coupons:', {
      count: coupons?.length || 0
    })

    res.status(200).json({ coupons: coupons || [] })
  } catch (error: any) {
    console.error('🎫 COUPONS-GET: Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function createCoupon(supabase: any, req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  try {
    console.log('🎫 COUPONS-CREATE: Starting create process...')
    const {
      code,
      name,
      description,
      discount_type,
      discount_value,
      min_order_amount = 0,
      max_discount_amount,
      usage_limit,
      is_active = true,
      starts_at,
      expires_at
    } = req.body

    console.log('🎫 COUPONS-CREATE: Request data:', {
      code,
      name,
      discount_type,
      discount_value,
      min_order_amount,
      is_active
    })

    // Validate required fields
    if (!code || !name || !discount_type || !discount_value) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'code, name, discount_type, and discount_value are required'
      })
    }

    // Validate discount_type
    if (!['percentage', 'flat'].includes(discount_type)) {
      return res.status(400).json({ 
        error: 'Invalid discount type',
        details: 'discount_type must be either "percentage" or "flat"'
      })
    }

    // Validate discount_value
    if (typeof discount_value !== 'number' || discount_value <= 0) {
      return res.status(400).json({ 
        error: 'Invalid discount value',
        details: 'discount_value must be a positive number'
      })
    }

    // Validate percentage discount value
    if (discount_type === 'percentage' && discount_value > 100) {
      return res.status(400).json({ 
        error: 'Invalid percentage value',
        details: 'Percentage discount cannot exceed 100%'
      })
    }

    // Check if coupon code already exists (case-insensitive)
    const { data: existingCoupon, error: checkError } = await supabase
      .from('coupon_codes')
      .select('id, code')
      .ilike('code', code)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('🎫 COUPONS-CREATE: Error checking existing coupon:', checkError)
      return res.status(500).json({ error: 'Failed to check existing coupon' })
    }

    if (existingCoupon) {
      return res.status(400).json({ 
        error: 'Coupon code already exists',
        details: `A coupon with code "${existingCoupon.code}" already exists`
      })
    }

    // Create coupon
    const couponData = {
      code: code.toUpperCase(), // Store in uppercase for consistency
      name,
      description: description || '',
      discount_type,
      discount_value,
      min_order_amount,
      max_discount_amount,
      usage_limit,
      is_active,
      starts_at: starts_at || new Date().toISOString(),
      expires_at,
      created_by: adminUser.email
    }

    const { data: newCoupon, error } = await supabase
      .from('coupon_codes')
      .insert(couponData)
      .select()
      .single()

    if (error) {
      console.error('🎫 COUPONS-CREATE: Insert failed:', error)
      return res.status(500).json({ 
        error: 'Failed to create coupon',
        details: error.message,
        code: error.code
      })
    }

    console.log('🎫 COUPONS-CREATE: Successfully created coupon:', newCoupon.id)
    res.status(201).json({ coupon: newCoupon })
  } catch (error: any) {
    console.error('🎫 COUPONS-CREATE: Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function updateCoupon(supabase: any, req: NextApiRequest, res: NextApiResponse, adminUser: AdminUser) {
  try {
    console.log('🎫 COUPONS-UPDATE: Starting update process...')
    const { id, ...updateData } = req.body

    console.log('🎫 COUPONS-UPDATE: Request data:', {
      id,
      updateFields: Object.keys(updateData)
    })

    if (!id) {
      return res.status(400).json({ error: 'Coupon ID is required' })
    }

    // If updating code, check for duplicates
    if (updateData.code) {
      const { data: existingCoupon, error: checkError } = await supabase
        .from('coupon_codes')
        .select('id, code')
        .ilike('code', updateData.code)
        .neq('id', id)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('🎫 COUPONS-UPDATE: Error checking existing coupon:', checkError)
        return res.status(500).json({ error: 'Failed to check existing coupon' })
      }

      if (existingCoupon) {
        return res.status(400).json({ 
          error: 'Coupon code already exists',
          details: `A coupon with code "${existingCoupon.code}" already exists`
        })
      }

      updateData.code = updateData.code.toUpperCase()
    }

    // Validate discount_type if being updated
    if (updateData.discount_type && !['percentage', 'flat'].includes(updateData.discount_type)) {
      return res.status(400).json({ 
        error: 'Invalid discount type',
        details: 'discount_type must be either "percentage" or "flat"'
      })
    }

    // Validate discount_value if being updated
    if (updateData.discount_value !== undefined) {
      if (typeof updateData.discount_value !== 'number' || updateData.discount_value <= 0) {
        return res.status(400).json({ 
          error: 'Invalid discount value',
          details: 'discount_value must be a positive number'
        })
      }

      // For percentage validation, we need to check the discount_type
      if (updateData.discount_type === 'percentage' && updateData.discount_value > 100) {
        return res.status(400).json({ 
          error: 'Invalid percentage value',
          details: 'Percentage discount cannot exceed 100%'
        })
      }
    }

    // Update coupon
    const { data: updatedCoupon, error } = await supabase
      .from('coupon_codes')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('🎫 COUPONS-UPDATE: Update failed:', error)
      return res.status(500).json({ 
        error: 'Failed to update coupon',
        details: error.message,
        code: error.code
      })
    }

    console.log('🎫 COUPONS-UPDATE: Successfully updated coupon:', updatedCoupon.id)
    res.status(200).json({ coupon: updatedCoupon })
  } catch (error: any) {
    console.error('🎫 COUPONS-UPDATE: Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function deleteCoupon(supabase: any, req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🎫 COUPONS-DELETE: Starting delete process...')
    const { id } = req.body

    console.log('🎫 COUPONS-DELETE: Request data:', { id })

    if (!id) {
      return res.status(400).json({ error: 'Coupon ID is required' })
    }

    // Check if coupon has been used
    const { data: usageCount, error: usageError } = await supabase
      .from('coupon_usage')
      .select('id', { count: 'exact' })
      .eq('coupon_id', id)

    if (usageError) {
      console.error('🎫 COUPONS-DELETE: Error checking coupon usage:', usageError)
      return res.status(500).json({ error: 'Failed to check coupon usage' })
    }

    if (usageCount && usageCount.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete used coupon',
        details: 'This coupon has been used and cannot be deleted. Consider deactivating it instead.'
      })
    }

    // Delete coupon
    const { error } = await supabase
      .from('coupon_codes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('🎫 COUPONS-DELETE: Delete failed:', error)
      return res.status(500).json({ 
        error: 'Failed to delete coupon',
        details: error.message,
        code: error.code
      })
    }

    console.log('🎫 COUPONS-DELETE: Successfully deleted coupon:', id)
    res.status(200).json({ message: 'Coupon deleted successfully' })
  } catch (error: any) {
    console.error('🎫 COUPONS-DELETE: Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export default requireAdminRole('admin')(handler) 