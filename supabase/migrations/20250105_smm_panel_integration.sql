-- SMM Panel Integration Tables
-- For Followiz API integration with order sets

-- Table for storing order set configurations per package
CREATE TABLE IF NOT EXISTS smm_order_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_name VARCHAR(50) NOT NULL, -- BREAKTHROUGH, MOMENTUM, DOMINATE, UNSTOPPABLE, LEGENDARY
  service_id VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  drip_runs INTEGER DEFAULT NULL,  -- NULL = no drip feed (one-time purchase)
  interval_minutes INTEGER DEFAULT NULL,  -- NULL = no drip feed
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  price_per_1k DECIMAL(10, 4) DEFAULT NULL,  -- Price per 1000 from Followiz API
  set_cost DECIMAL(10, 4) DEFAULT NULL,  -- Calculated total cost for this order set
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for package lookups
CREATE INDEX IF NOT EXISTS idx_smm_order_sets_package ON smm_order_sets(package_name);
CREATE INDEX IF NOT EXISTS idx_smm_order_sets_active ON smm_order_sets(is_active);

-- Table for logging SMM panel purchase submissions
CREATE TABLE IF NOT EXISTS smm_purchase_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  order_number VARCHAR(50) NOT NULL,
  song_link TEXT NOT NULL,
  package_name VARCHAR(50) NOT NULL,
  order_set_id UUID REFERENCES smm_order_sets(id) ON DELETE SET NULL,
  service_id VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  drip_runs INTEGER NOT NULL,
  interval_minutes INTEGER NOT NULL,
  followiz_order_id VARCHAR(50), -- The order ID returned from Followiz API
  status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed
  error_message TEXT,
  api_response JSONB,
  submitted_by UUID, -- admin who submitted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for purchase logs
CREATE INDEX IF NOT EXISTS idx_smm_purchase_logs_campaign ON smm_purchase_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_smm_purchase_logs_order_number ON smm_purchase_logs(order_number);
CREATE INDEX IF NOT EXISTS idx_smm_purchase_logs_status ON smm_purchase_logs(status);
CREATE INDEX IF NOT EXISTS idx_smm_purchase_logs_created_at ON smm_purchase_logs(created_at DESC);

-- Trigger for updated_at on smm_order_sets
CREATE OR REPLACE FUNCTION update_smm_order_sets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_smm_order_sets_updated_at
    BEFORE UPDATE ON smm_order_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_smm_order_sets_updated_at();

-- Trigger for updated_at on smm_purchase_logs
CREATE OR REPLACE FUNCTION update_smm_purchase_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_smm_purchase_logs_updated_at
    BEFORE UPDATE ON smm_purchase_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_smm_purchase_logs_updated_at();

-- Add RLS policies
ALTER TABLE smm_order_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE smm_purchase_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage smm_order_sets" ON smm_order_sets
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage smm_purchase_logs" ON smm_purchase_logs
  FOR ALL USING (true) WITH CHECK (true);

