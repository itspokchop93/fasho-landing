-- Migration: Add first_saved_at field to track when order is saved by admin for the first time
-- This will be used to determine if the "NEW" flag should be removed from orders list

-- Step 1: Add the new columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS first_saved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS saved_by_admin VARCHAR(255);

-- Step 2: Create index for performance on new field
CREATE INDEX IF NOT EXISTS idx_orders_first_saved_at ON orders(first_saved_at);

-- Step 3: Add comments for documentation
COMMENT ON COLUMN orders.first_saved_at IS 'Timestamp when the order was first saved/edited by an admin';
COMMENT ON COLUMN orders.saved_by_admin IS 'Email of the admin who first saved the order';

-- Step 4: Handle existing data - Mark orders that have been viewed as also saved
-- This ensures existing viewed orders won't suddenly show as "NEW" again
UPDATE orders 
SET 
  first_saved_at = first_viewed_at,
  saved_by_admin = viewed_by_admin
WHERE 
  first_viewed_at IS NOT NULL 
  AND first_saved_at IS NULL;

-- Step 5: Verify the migration worked
SELECT 
  COUNT(*) as total_orders,
  COUNT(first_viewed_at) as viewed_orders,
  COUNT(first_saved_at) as saved_orders,
  COUNT(CASE WHEN first_saved_at IS NULL THEN 1 END) as new_orders
FROM orders; 