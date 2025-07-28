-- Add first_saved_at field to track when order is saved by admin for the first time
-- This will be used to determine if the "NEW" flag should be removed from orders list

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS first_saved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS saved_by_admin VARCHAR(255);

-- Create index for performance on new field
CREATE INDEX IF NOT EXISTS idx_orders_first_saved_at ON orders(first_saved_at);

-- Add comment for documentation
COMMENT ON COLUMN orders.first_saved_at IS 'Timestamp when the order was first saved/edited by an admin';
COMMENT ON COLUMN orders.saved_by_admin IS 'Email of the admin who first saved the order'; 