-- Fix the trigger function to use the correct package function name
-- The issue is that the trigger calls get_package_configuration() but only get_package_streams() exists

-- 1. Update the trigger function to use the correct function name
CREATE OR REPLACE FUNCTION create_marketing_campaign_from_order()
RETURNS TRIGGER AS $$
DECLARE
    order_item RECORD;
    stream_data RECORD;
BEGIN
    -- Only create marketing campaigns for non-cancelled orders
    IF NEW.status != 'cancelled' THEN
        -- Check if campaign already exists for this order
        IF NOT EXISTS (SELECT 1 FROM marketing_campaigns WHERE order_id = NEW.id) THEN
            -- Loop through all order items for this order (should typically be just one)
            FOR order_item IN 
                SELECT * FROM order_items WHERE order_id = NEW.id LIMIT 1
            LOOP
                -- Get stream data for this package using the correct function name
                SELECT * INTO stream_data FROM get_package_streams(order_item.package_name);
                
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
                    stream_data.direct_streams,
                    stream_data.playlist_streams,
                    6, -- Default time_on_playlists (6 weeks)
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

-- 2. Also add time_on_playlists to the get_package_streams function
CREATE OR REPLACE FUNCTION get_package_streams(package_name TEXT)
RETURNS TABLE(direct_streams INTEGER, playlist_streams INTEGER, time_on_playlists INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN UPPER(package_name) = 'LEGENDARY' THEN 100000  -- 100k direct streams
            WHEN UPPER(package_name) = 'UNSTOPPABLE' THEN 35000  -- 35k direct streams
            WHEN UPPER(package_name) = 'DOMINATE' THEN 15000   -- 15k direct streams
            WHEN UPPER(package_name) = 'MOMENTUM' THEN 6000    -- 6k direct streams
            WHEN UPPER(package_name) = 'BREAKTHROUGH' THEN 2500 -- 2.5k direct streams
            WHEN UPPER(package_name) = 'TEST CAMPAIGN' THEN 100  -- 100 test streams
            ELSE 1000 -- Default
        END as direct_streams,
        CASE 
            WHEN UPPER(package_name) = 'LEGENDARY' THEN 50000   -- 50k playlist streams
            WHEN UPPER(package_name) = 'UNSTOPPABLE' THEN 15000 -- 15k playlist streams
            WHEN UPPER(package_name) = 'DOMINATE' THEN 5000    -- 5k playlist streams
            WHEN UPPER(package_name) = 'MOMENTUM' THEN 2000    -- 2k playlist streams
            WHEN UPPER(package_name) = 'BREAKTHROUGH' THEN 750  -- 750 playlist streams
            WHEN UPPER(package_name) = 'TEST CAMPAIGN' THEN 50   -- 50 test streams
            ELSE 3000 -- Default
        END as playlist_streams,
        CASE 
            WHEN UPPER(package_name) = 'LEGENDARY' THEN 6      -- 6 weeks
            WHEN UPPER(package_name) = 'UNSTOPPABLE' THEN 6    -- 6 weeks
            WHEN UPPER(package_name) = 'DOMINATE' THEN 6       -- 6 weeks
            WHEN UPPER(package_name) = 'MOMENTUM' THEN 6       -- 6 weeks
            WHEN UPPER(package_name) = 'BREAKTHROUGH' THEN 6   -- 6 weeks
            WHEN UPPER(package_name) = 'TEST CAMPAIGN' THEN 1   -- 1 week for testing
            ELSE 6 -- Default 6 weeks
        END as time_on_playlists;
END;
$$ LANGUAGE plpgsql;

-- 3. Add comment explaining the fix
COMMENT ON FUNCTION create_marketing_campaign_from_order IS 'Fixed to use get_package_streams() instead of non-existent get_package_configuration()';
COMMENT ON FUNCTION get_package_streams IS 'Updated to return time_on_playlists in addition to stream counts';



