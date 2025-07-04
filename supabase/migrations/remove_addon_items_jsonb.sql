-- Remove the old addon_items JSONB column from orders table
-- since we now have a proper add_on_items table
ALTER TABLE orders DROP COLUMN IF EXISTS addon_items; 