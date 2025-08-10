-- Fix marketing campaigns duplicates and prevent future duplicates

-- 1. Remove duplicate marketing campaigns (keep only the oldest one for each order_id)
WITH duplicates AS (
  SELECT 
    id,
    order_id,
    ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY created_at ASC) as rn
  FROM marketing_campaigns
)
DELETE FROM marketing_campaigns 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 2. Add unique constraint to prevent future duplicates
-- First drop the existing index if it exists
DROP INDEX IF EXISTS idx_marketing_campaigns_order_id;

-- Create a unique constraint on order_id (one campaign per order)
ALTER TABLE marketing_campaigns 
ADD CONSTRAINT unique_marketing_campaign_per_order UNIQUE (order_id);

-- Recreate the index for performance (now as unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_campaigns_order_id_unique ON marketing_campaigns(order_id);

-- 3. Update the trigger function to use the correct conflict resolution
CREATE OR REPLACE FUNCTION create_marketing_campaign_from_order()
RETURNS TRIGGER AS $$
DECLARE
    order_item RECORD;
    package_config RECORD;
BEGIN
    -- Only create marketing campaigns for non-cancelled orders
    IF NEW.status != 'cancelled' THEN
        -- Check if campaign already exists for this order
        IF NOT EXISTS (SELECT 1 FROM marketing_campaigns WHERE order_id = NEW.id) THEN
            -- Loop through all order items for this order (should typically be just one)
            FOR order_item IN 
                SELECT * FROM order_items WHERE order_id = NEW.id LIMIT 1
            LOOP
                -- Get package configuration
                SELECT * INTO package_config FROM get_package_configuration(order_item.package_name);
                
                -- Insert marketing campaign record
                INSERT INTO marketing_campaigns (
                    order_id,
                    order_number,
                    customer_name,
                    song_name,
                    song_link,
                    package_name,
                    package_id,
                    direct_streams,
                    playlist_streams,
                    time_on_playlists,
                    created_at,
                    updated_at
                ) VALUES (
                    NEW.id,
                    NEW.order_number,
                    NEW.customer_name,
                    order_item.track_title,
                    COALESCE(order_item.track_url, ''),
                    order_item.package_name,
                    order_item.package_id,
                    package_config.direct_streams,
                    package_config.playlist_streams,
                    package_config.time_on_playlists,
                    NOW(),
                    NOW()
                );
                
                -- Only process the first order item to prevent multiple campaigns per order
                EXIT;
            END LOOP;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Add a comment explaining the constraint
COMMENT ON CONSTRAINT unique_marketing_campaign_per_order ON marketing_campaigns 
IS 'Ensures only one marketing campaign exists per order to prevent duplicates';
