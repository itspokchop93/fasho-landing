# Database Schema for Fasho Landing

## Required Tables

### 1. Orders Table
```sql
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'completed',
  payment_status VARCHAR(50) DEFAULT 'paid',
  billing_info JSONB NOT NULL,
  payment_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for order number lookups
CREATE INDEX idx_orders_order_number ON orders(order_number);
-- Create index for user orders
CREATE INDEX idx_orders_user_id ON orders(user_id);
-- Create index for email lookups
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
-- Create index for date sorting
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

### 2. Order Items Table
```sql
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  track_id VARCHAR(255) NOT NULL,
  track_title VARCHAR(255) NOT NULL,
  track_artist VARCHAR(255) NOT NULL,
  track_image_url TEXT,
  track_url TEXT,
  package_id VARCHAR(50) NOT NULL,
  package_name VARCHAR(100) NOT NULL,
  package_price DECIMAL(10,2) NOT NULL,
  package_plays VARCHAR(50) NOT NULL,
  package_placements VARCHAR(50) NOT NULL,
  package_description TEXT,
  original_price DECIMAL(10,2) NOT NULL,
  discounted_price DECIMAL(10,2) NOT NULL,
  is_discounted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for order lookups
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

### 3. Add-on Items Table
```sql
CREATE TABLE add_on_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  addon_id VARCHAR(50) NOT NULL,
  addon_name VARCHAR(255) NOT NULL,
  addon_description TEXT,
  original_price INTEGER NOT NULL, -- in cents
  discounted_price INTEGER NOT NULL, -- in cents
  is_discounted BOOLEAN DEFAULT false,
  emoji VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_add_on_items_order_id ON add_on_items(order_id);
CREATE INDEX idx_add_on_items_addon_id ON add_on_items(addon_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_add_on_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_add_on_items_updated_at
    BEFORE UPDATE ON add_on_items
    FOR EACH ROW
    EXECUTE FUNCTION update_add_on_items_updated_at();
```

### 4. Row Level Security (RLS) Policies

```sql
-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own orders
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Allow service role to insert orders (for API)
CREATE POLICY "Service role can insert orders" ON orders
  FOR INSERT WITH CHECK (true);

-- Allow service role to update orders (for API)
CREATE POLICY "Service role can update orders" ON orders
  FOR UPDATE USING (true);

-- Enable RLS on order_items table
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own order items
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Allow service role to insert order items (for API)
CREATE POLICY "Service role can insert order items" ON order_items
  FOR INSERT WITH CHECK (true);

-- Enable RLS on add_on_items table
ALTER TABLE add_on_items ENABLE ROW LEVEL SECURITY;

-- Users can only see add-on items for their own orders
CREATE POLICY "Users can view their own add-on items" ON add_on_items
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM orders WHERE user_id = auth.uid()
        )
    );

-- Allow authenticated users to insert add-on items (will be validated by application logic)
CREATE POLICY "Authenticated users can insert add-on items" ON add_on_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

## Setup Instructions

1. **Create the tables** by running the SQL commands above in your Supabase SQL editor
2. **Verify the tables** are created correctly
3. **Test the RLS policies** to ensure proper security

## Data Structure Examples

### Order Record Example
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "order_number": "FASHO-3001",
  "user_id": "user-uuid-here",
  "customer_email": "customer@example.com",
  "customer_name": "John Doe",
  "subtotal": 128.00,
  "discount": 25.00,
  "total": 103.00,
  "status": "completed",
  "payment_status": "paid",
  "billing_info": {
    "firstName": "John",
    "lastName": "Doe",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US"
  },
  "payment_data": {
    "transactionId": "auth-net-trans-id",
    "authorization": "auth-code",
    "accountNumber": "XXXX1234",
    "accountType": "Visa"
  },
  "created_at": "2025-01-03T10:30:00Z",
  "updated_at": "2025-01-03T10:30:00Z"
}
```

### Order Item Record Example
```json
{
  "id": "item-uuid-here",
  "order_id": "123e4567-e89b-12d3-a456-426614174000",
  "track_id": "track-123",
  "track_title": "My Song",
  "track_artist": "Artist Name",
  "track_image_url": "https://example.com/image.jpg",
  "track_url": "https://example.com/song.mp3",
  "package_id": "advanced",
  "package_name": "Advanced",
  "package_price": 89.00,
  "package_plays": "5k Plays",
  "package_placements": "75 Playlist Placements",
  "package_description": "Great for growing artists",
  "original_price": 89.00,
  "discounted_price": 67.00,
  "is_discounted": true,
  "created_at": "2025-01-03T10:30:00Z"
}
```

### Add-on Item Record Example
```json
{
  "id": "addon-uuid-here",
  "order_id": "123e4567-e89b-12d3-a456-426614174000",
  "addon_id": "ai-mastering",
  "addon_name": "AI Mastering",
  "addon_description": "AI Mastering - Premium add-on service",
  "original_price": 4999,
  "discounted_price": 3999,
  "is_discounted": true,
  "emoji": "🎵",
  "created_at": "2025-01-03T10:30:00Z",
  "updated_at": "2025-01-03T10:30:00Z"
}
``` 