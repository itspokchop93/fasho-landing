-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'processing',
  payment_status VARCHAR(50) DEFAULT 'paid',
  billing_info JSONB NOT NULL,
  payment_data JSONB NOT NULL,
  admin_notes TEXT,
  first_viewed_at TIMESTAMP WITH TIME ZONE,
  viewed_by_admin VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  track_id VARCHAR(255) NOT NULL,
  track_title VARCHAR(255) NOT NULL,
  track_artist VARCHAR(255) NOT NULL,
  track_image_url TEXT,
  track_url TEXT,
  artist_profile_url TEXT,
  package_id VARCHAR(50) NOT NULL,
  package_name VARCHAR(100) NOT NULL,
  package_price DECIMAL(10,2) NOT NULL,
  package_plays VARCHAR(50) NOT NULL,
  package_placements VARCHAR(50) NOT NULL,
  package_description TEXT,
  original_price DECIMAL(10,2) NOT NULL,
  discounted_price DECIMAL(10,2) NOT NULL,
  is_discounted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for orders table
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Create indexes for order_items table
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_artist_profile_url ON order_items(artist_profile_url) WHERE artist_profile_url IS NOT NULL;

-- Create updated_at trigger function for orders
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();

CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders table
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert orders" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update orders" ON orders
  FOR UPDATE USING (true);

CREATE POLICY "Service role can select all orders" ON orders
  FOR SELECT TO service_role USING (true);

-- RLS Policies for order_items table
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert order items" ON order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can select all order items" ON order_items
  FOR SELECT TO service_role USING (true);

-- Grant permissions to service role
GRANT ALL ON orders TO service_role;
GRANT ALL ON order_items TO service_role;

-- Comments for documentation
COMMENT ON TABLE orders IS 'Main orders table storing customer purchase information';
COMMENT ON TABLE order_items IS 'Individual items within each order (tracks and packages)';
COMMENT ON COLUMN orders.order_number IS 'Unique order identifier displayed to customers';
COMMENT ON COLUMN orders.user_id IS 'Reference to authenticated user, null for guest checkouts';
COMMENT ON COLUMN orders.status IS 'Order processing status: processing, marketing_campaign, completed, cancelled, order_issue';
COMMENT ON COLUMN orders.payment_status IS 'Payment status: paid, pending, failed, refunded';
COMMENT ON COLUMN order_items.artist_profile_url IS 'Spotify artist profile URL for the track artist'; 