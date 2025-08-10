-- Marketing Manager System Tables Migration
-- This migration creates the necessary tables for the Marketing Manager feature
-- All changes are non-destructive and safe for production use

-- 1. Create playlist_network table for managing playlists
CREATE TABLE IF NOT EXISTS playlist_network (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_name VARCHAR(255) NOT NULL,
  genre VARCHAR(100) NOT NULL,
  account_email VARCHAR(255) NOT NULL,
  playlist_link TEXT NOT NULL,
  spotify_playlist_id VARCHAR(100) NOT NULL UNIQUE,
  max_songs INTEGER DEFAULT 50 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for playlist_network
CREATE INDEX IF NOT EXISTS idx_playlist_network_spotify_id ON playlist_network(spotify_playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_network_genre ON playlist_network(genre);
CREATE INDEX IF NOT EXISTS idx_playlist_network_active ON playlist_network(is_active);

-- 2. Create marketing_campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  song_name VARCHAR(255) NOT NULL,
  song_link TEXT NOT NULL,
  package_name VARCHAR(100) NOT NULL,
  package_id VARCHAR(50) NOT NULL,
  direct_streams INTEGER NOT NULL DEFAULT 0,
  playlist_streams INTEGER NOT NULL DEFAULT 0,
  direct_streams_progress INTEGER DEFAULT 0,
  playlist_streams_progress INTEGER DEFAULT 0,
  playlist_assignments JSONB DEFAULT '[]'::jsonb,
  direct_streams_confirmed BOOLEAN DEFAULT FALSE,
  playlists_added_confirmed BOOLEAN DEFAULT FALSE,
  removed_from_playlists BOOLEAN DEFAULT FALSE,
  removal_date DATE,
  campaign_status VARCHAR(50) DEFAULT 'Action Needed' CHECK (campaign_status IN ('Action Needed', 'Running', 'Removal Needed', 'Completed')),
  hidden_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for marketing_campaigns
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_order_id ON marketing_campaigns(order_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_order_number ON marketing_campaigns(order_number);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(campaign_status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_at ON marketing_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_removal_date ON marketing_campaigns(removal_date);

-- 3. Create playlist_assignments table for tracking song placements
CREATE TABLE IF NOT EXISTS playlist_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlist_network(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  removed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for playlist_assignments
CREATE INDEX IF NOT EXISTS idx_playlist_assignments_campaign_id ON playlist_assignments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_playlist_assignments_playlist_id ON playlist_assignments(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_assignments_active ON playlist_assignments(is_active);

-- 4. Create updated_at triggers for all new tables
CREATE OR REPLACE FUNCTION update_marketing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all marketing manager tables
CREATE TRIGGER update_playlist_network_updated_at
    BEFORE UPDATE ON playlist_network
    FOR EACH ROW
    EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER update_marketing_campaigns_updated_at
    BEFORE UPDATE ON marketing_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER update_playlist_assignments_updated_at
    BEFORE UPDATE ON playlist_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_marketing_updated_at();

-- 5. Enable Row Level Security (RLS) for all tables
ALTER TABLE playlist_network ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_assignments ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies (allowing all operations for authenticated users)
-- These policies can be refined later based on specific admin role requirements

-- Playlist Network policies
CREATE POLICY "Allow all operations on playlist_network for authenticated users" 
ON playlist_network FOR ALL 
TO authenticated 
USING (true);

-- Marketing Campaigns policies
CREATE POLICY "Allow all operations on marketing_campaigns for authenticated users" 
ON marketing_campaigns FOR ALL 
TO authenticated 
USING (true);

-- Playlist Assignments policies
CREATE POLICY "Allow all operations on playlist_assignments for authenticated users" 
ON playlist_assignments FOR ALL 
TO authenticated 
USING (true);

-- 7. Create function to calculate package streams based on package name
CREATE OR REPLACE FUNCTION get_package_streams(package_name TEXT)
RETURNS TABLE(direct_streams INTEGER, playlist_streams INTEGER) AS $$
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
            ELSE 0
        END as direct_streams,
        CASE 
            WHEN UPPER(package_name) = 'LEGENDARY' THEN 50000   -- 50k playlist streams
            WHEN UPPER(package_name) = 'UNSTOPPABLE' THEN 15000 -- 15k playlist streams
            WHEN UPPER(package_name) = 'DOMINATE' THEN 5000    -- 5k playlist streams
            WHEN UPPER(package_name) = 'MOMENTUM' THEN 2000    -- 2k playlist streams
            WHEN UPPER(package_name) = 'BREAKTHROUGH' THEN 750  -- 750 playlist streams
            WHEN UPPER(package_name) = 'TEST CAMPAIGN' THEN 50   -- 50 test streams
            ELSE 0
        END as playlist_streams;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to auto-populate marketing campaigns from new orders
CREATE OR REPLACE FUNCTION create_marketing_campaign_from_order()
RETURNS TRIGGER AS $$
DECLARE
    order_item RECORD;
    stream_data RECORD;
BEGIN
    -- Only create marketing campaigns for non-cancelled orders
    IF NEW.status != 'cancelled' THEN
        -- Loop through all order items for this order
        FOR order_item IN 
            SELECT * FROM order_items WHERE order_id = NEW.id
        LOOP
            -- Get stream data for this package
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
                NOW(),
                NOW()
            )
            ON CONFLICT (order_id, order_number) DO NOTHING; -- Prevent duplicates
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to auto-create marketing campaigns for new orders
CREATE TRIGGER create_marketing_campaign_on_order_insert
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_marketing_campaign_from_order();

-- 10. Create function to handle order status updates
CREATE OR REPLACE FUNCTION sync_order_status_with_campaign()
RETURNS TRIGGER AS $$
BEGIN
    -- If order is cancelled, mark campaign as completed
    IF NEW.status = 'cancelled' THEN
        UPDATE marketing_campaigns 
        SET campaign_status = 'Completed', updated_at = NOW()
        WHERE order_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger to sync order status changes
CREATE TRIGGER sync_campaign_status_on_order_update
    AFTER UPDATE OF status ON orders
    FOR EACH ROW
    EXECUTE FUNCTION sync_order_status_with_campaign();

-- 12. Add comments for documentation
COMMENT ON TABLE playlist_network IS 'Stores information about playlists in the marketing network';
COMMENT ON TABLE marketing_campaigns IS 'Tracks marketing campaigns and their progress for each order';
COMMENT ON TABLE playlist_assignments IS 'Junction table tracking which songs are assigned to which playlists';
COMMENT ON FUNCTION get_package_streams IS 'Returns direct and playlist stream counts based on package name';
COMMENT ON FUNCTION create_marketing_campaign_from_order IS 'Auto-creates marketing campaigns when new orders are inserted';
COMMENT ON FUNCTION sync_order_status_with_campaign IS 'Keeps campaign status in sync with order status changes';
