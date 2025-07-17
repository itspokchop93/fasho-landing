-- Create coupon_codes table for discount management
CREATE TABLE IF NOT EXISTS coupon_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_discount_amount DECIMAL(10,2), -- Optional cap for percentage discounts
  usage_limit INTEGER, -- NULL for unlimited usage
  current_usage INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(255), -- Admin who created it
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create coupon_usage table to track individual usage
CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES coupon_codes(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_email VARCHAR(255) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add coupon fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupon_codes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10,2) DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_coupon_codes_code ON coupon_codes(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_coupon_codes_active ON coupon_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_expires_at ON coupon_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order_id ON coupon_usage(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_coupon_id ON orders(coupon_id);

-- Create updated_at trigger function for coupon_codes
CREATE OR REPLACE FUNCTION update_coupon_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_coupon_codes_updated_at
    BEFORE UPDATE ON coupon_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_coupon_codes_updated_at();

-- Function to increment coupon usage
CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE coupon_codes 
    SET current_usage = current_usage + 1 
    WHERE id = coupon_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to validate coupon code (case-insensitive)
CREATE OR REPLACE FUNCTION validate_coupon_code(
    input_code VARCHAR(50),
    order_amount DECIMAL(10,2)
)
RETURNS TABLE (
    is_valid BOOLEAN,
    coupon_id UUID,
    discount_type VARCHAR(20),
    discount_value DECIMAL(10,2),
    calculated_discount DECIMAL(10,2),
    error_message TEXT
) AS $$
DECLARE
    coupon_record RECORD;
    calc_discount DECIMAL(10,2);
BEGIN
    -- Find coupon (case-insensitive)
    SELECT * INTO coupon_record
    FROM coupon_codes
    WHERE UPPER(code) = UPPER(input_code)
    AND is_active = true;
    
    -- Check if coupon exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(20), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2), 'Invalid coupon code'::TEXT;
        RETURN;
    END IF;
    
    -- Check if coupon has expired
    IF coupon_record.expires_at IS NOT NULL AND coupon_record.expires_at < NOW() THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(20), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2), 'Coupon has expired'::TEXT;
        RETURN;
    END IF;
    
    -- Check if coupon hasn't started yet
    IF coupon_record.starts_at > NOW() THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(20), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2), 'Coupon is not yet active'::TEXT;
        RETURN;
    END IF;
    
    -- Check usage limit
    IF coupon_record.usage_limit IS NOT NULL AND coupon_record.current_usage >= coupon_record.usage_limit THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(20), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2), 'Coupon usage limit exceeded'::TEXT;
        RETURN;
    END IF;
    
    -- Check minimum order amount
    IF order_amount < coupon_record.min_order_amount THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(20), NULL::DECIMAL(10,2), NULL::DECIMAL(10,2), 
            ('Minimum order amount of $' || coupon_record.min_order_amount || ' required')::TEXT;
        RETURN;
    END IF;
    
    -- Calculate discount
    IF coupon_record.discount_type = 'percentage' THEN
        calc_discount = (order_amount * coupon_record.discount_value / 100);
        -- Apply max discount cap if set
        IF coupon_record.max_discount_amount IS NOT NULL AND calc_discount > coupon_record.max_discount_amount THEN
            calc_discount = coupon_record.max_discount_amount;
        END IF;
    ELSE -- flat discount
        calc_discount = coupon_record.discount_value;
        -- Don't allow discount to exceed order amount
        IF calc_discount > order_amount THEN
            calc_discount = order_amount;
        END IF;
    END IF;
    
    -- Return valid coupon with calculated discount
    RETURN QUERY SELECT true, coupon_record.id, coupon_record.discount_type, 
                       coupon_record.discount_value, calc_discount, NULL::TEXT;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coupon_codes table (only admins can manage)
CREATE POLICY "Service role can manage coupon codes" ON coupon_codes
  FOR ALL TO service_role USING (true);

-- RLS Policies for coupon_usage table
CREATE POLICY "Service role can manage coupon usage" ON coupon_usage
  FOR ALL TO service_role USING (true);

-- Users can view coupon usage for their own orders
CREATE POLICY "Users can view own coupon usage" ON coupon_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = coupon_usage.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT ALL ON coupon_codes TO service_role;
GRANT ALL ON coupon_usage TO service_role;
GRANT EXECUTE ON FUNCTION increment_coupon_usage(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION validate_coupon_code(VARCHAR(50), DECIMAL(10,2)) TO service_role;

-- Insert sample coupon codes for testing
INSERT INTO coupon_codes (code, name, description, discount_type, discount_value, is_active, created_by) VALUES
('WELCOME10', 'Welcome Discount', '10% off for new customers', 'percentage', 10.00, true, 'system'),
('SAVE25', 'Save $25', '$25 flat discount', 'flat', 25.00, true, 'system'),
('FASHOLY', 'Fasho Loyalty', '15% off for loyal customers', 'percentage', 15.00, true, 'system')
ON CONFLICT (code) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE coupon_codes IS 'Stores discount coupon codes with validation rules';
COMMENT ON TABLE coupon_usage IS 'Tracks individual coupon usage per order';
COMMENT ON COLUMN coupon_codes.code IS 'Case-insensitive coupon code entered by customers';
COMMENT ON COLUMN coupon_codes.discount_type IS 'Either percentage or flat discount';
COMMENT ON COLUMN coupon_codes.discount_value IS 'Percentage (1-100) or flat dollar amount';
COMMENT ON COLUMN coupon_codes.max_discount_amount IS 'Maximum discount cap for percentage coupons';
COMMENT ON COLUMN orders.coupon_discount IS 'Actual discount amount applied from coupon'; 