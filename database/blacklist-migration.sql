-- =============================================================
-- BLACKLIST SYSTEM MIGRATION
-- Run this in the Supabase SQL Editor
-- =============================================================

-- 1. blacklist_customers — Parent record, one row per blacklisted person
CREATE TABLE IF NOT EXISTS blacklist_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  reason TEXT NOT NULL,
  blacklisted_by TEXT NOT NULL,
  source_order_id UUID,
  associated_order_numbers TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blacklist_customers_email ON blacklist_customers(customer_email);
CREATE INDEX IF NOT EXISTS idx_blacklist_customers_active ON blacklist_customers(is_active);

-- 2. blacklist_identifiers — Child records, one per signal to match against
CREATE TABLE IF NOT EXISTS blacklist_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blacklist_id UUID NOT NULL REFERENCES blacklist_customers(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL,
  match_value TEXT NOT NULL,
  is_strong BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blacklist_identifiers_lookup ON blacklist_identifiers(match_type, match_value);
CREATE INDEX IF NOT EXISTS idx_blacklist_identifiers_value ON blacklist_identifiers(match_value);
CREATE INDEX IF NOT EXISTS idx_blacklist_identifiers_parent ON blacklist_identifiers(blacklist_id);

-- 3. blacklist_check_logs — Audit trail of every blocked checkout attempt
CREATE TABLE IF NOT EXISTS blacklist_check_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blacklist_id UUID REFERENCES blacklist_customers(id) ON DELETE SET NULL,
  matched_types TEXT[] NOT NULL DEFAULT '{}',
  matched_values TEXT[] NOT NULL DEFAULT '{}',
  attempted_email TEXT,
  attempted_name TEXT,
  attempted_phone TEXT,
  attempted_ip TEXT,
  attempted_fingerprint TEXT,
  attempted_billing_hash TEXT,
  attempted_spotify_artist TEXT,
  attempted_spotify_tracks TEXT[] DEFAULT '{}',
  user_agent TEXT,
  request_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blacklist_logs_by_entry ON blacklist_check_logs(blacklist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blacklist_logs_by_date ON blacklist_check_logs(created_at DESC);

-- 4. RLS Policies
ALTER TABLE blacklist_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist_check_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access blacklist_customers" ON blacklist_customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access blacklist_identifiers" ON blacklist_identifiers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access blacklist_check_logs" ON blacklist_check_logs FOR ALL USING (true) WITH CHECK (true);

-- 5. Default blacklist message in admin_settings
INSERT INTO admin_settings (setting_key, setting_value, updated_at)
VALUES (
  'blacklist_message',
  'Error: You are not allowed to make purchases on FASHO.co or any of our partner websites. This attempt has been logged.',
  NOW()
)
ON CONFLICT (setting_key) DO NOTHING;
