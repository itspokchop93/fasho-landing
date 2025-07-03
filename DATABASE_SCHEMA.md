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

### 3. Row Level Security (RLS) Policies

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