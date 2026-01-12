-- Playlist Service Settings for SMM Panel
-- Stores service IDs for playlist followers and playlist streams services

-- Table for storing playlist service configurations
CREATE TABLE IF NOT EXISTS smm_playlist_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type VARCHAR(50) NOT NULL UNIQUE, -- 'playlist_followers' or 'playlist_streams'
  service_id VARCHAR(20) NOT NULL,
  service_name VARCHAR(255) DEFAULT NULL,  -- Fetched from API
  price_per_1k DECIMAL(10, 4) DEFAULT NULL,  -- Price per 1000 from Followiz API
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for service type lookups
CREATE INDEX IF NOT EXISTS idx_smm_playlist_services_type ON smm_playlist_services(service_type);
CREATE INDEX IF NOT EXISTS idx_smm_playlist_services_active ON smm_playlist_services(is_active);

-- Table for logging playlist SMM purchases
CREATE TABLE IF NOT EXISTS smm_playlist_purchase_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL, -- References the playlist from playlist network
  playlist_name VARCHAR(255) NOT NULL,
  playlist_link TEXT NOT NULL,
  service_type VARCHAR(50) NOT NULL, -- 'playlist_followers' or 'playlist_streams'
  service_id VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  drip_runs INTEGER DEFAULT NULL,
  interval_minutes INTEGER DEFAULT NULL,
  followiz_order_id VARCHAR(50), -- The order ID returned from Followiz API
  status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed
  error_message TEXT,
  api_response JSONB,
  submitted_by UUID, -- admin who submitted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for playlist purchase logs
CREATE INDEX IF NOT EXISTS idx_smm_playlist_purchase_logs_playlist ON smm_playlist_purchase_logs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_smm_playlist_purchase_logs_status ON smm_playlist_purchase_logs(status);
CREATE INDEX IF NOT EXISTS idx_smm_playlist_purchase_logs_service_type ON smm_playlist_purchase_logs(service_type);
CREATE INDEX IF NOT EXISTS idx_smm_playlist_purchase_logs_created_at ON smm_playlist_purchase_logs(created_at DESC);

-- Trigger for updated_at on smm_playlist_services
CREATE OR REPLACE FUNCTION update_smm_playlist_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_smm_playlist_services_updated_at ON smm_playlist_services;
CREATE TRIGGER update_smm_playlist_services_updated_at
    BEFORE UPDATE ON smm_playlist_services
    FOR EACH ROW
    EXECUTE FUNCTION update_smm_playlist_services_updated_at();

-- Trigger for updated_at on smm_playlist_purchase_logs
CREATE OR REPLACE FUNCTION update_smm_playlist_purchase_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_smm_playlist_purchase_logs_updated_at ON smm_playlist_purchase_logs;
CREATE TRIGGER update_smm_playlist_purchase_logs_updated_at
    BEFORE UPDATE ON smm_playlist_purchase_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_smm_playlist_purchase_logs_updated_at();

-- Add RLS policies
ALTER TABLE smm_playlist_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE smm_playlist_purchase_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage smm_playlist_services" ON smm_playlist_services
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage smm_playlist_purchase_logs" ON smm_playlist_purchase_logs
  FOR ALL USING (true) WITH CHECK (true);
