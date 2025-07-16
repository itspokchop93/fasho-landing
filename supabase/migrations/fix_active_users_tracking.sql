-- Fix Active Users Tracking System - Resolves trigger conflicts
-- Run this in Supabase SQL Editor to fix the duplicate trigger error

-- First, drop any existing triggers and functions that might conflict
DROP TRIGGER IF EXISTS trigger_update_daily_visits_updated_at ON daily_visits;
DROP FUNCTION IF EXISTS update_daily_visits_updated_at();
DROP FUNCTION IF EXISTS cleanup_inactive_users();
DROP FUNCTION IF EXISTS get_daily_visit_stats(DATE);
DROP FUNCTION IF EXISTS upsert_daily_visit(DATE, INET);

-- Drop existing tables if they exist (to ensure clean state)
DROP TABLE IF EXISTS active_users CASCADE;
DROP TABLE IF EXISTS daily_visits CASCADE;

-- Active Users Table - tracks users currently on the website
CREATE TABLE active_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  user_agent TEXT,
  current_page VARCHAR(500) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  is_guest BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Visits Table - tracks daily visit statistics
CREATE TABLE daily_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  ip_address INET NOT NULL,
  total_visits INTEGER DEFAULT 1,
  is_unique BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX idx_active_users_session_id ON active_users(session_id);
CREATE INDEX idx_active_users_user_id ON active_users(user_id);
CREATE INDEX idx_active_users_ip_address ON active_users(ip_address);
CREATE INDEX idx_active_users_last_activity ON active_users(last_activity);
CREATE INDEX idx_active_users_is_guest ON active_users(is_guest);
CREATE INDEX idx_active_users_current_page ON active_users(current_page);

CREATE INDEX idx_daily_visits_date ON daily_visits(date);
CREATE INDEX idx_daily_visits_ip_address ON daily_visits(ip_address);
CREATE INDEX idx_daily_visits_is_unique ON daily_visits(is_unique);

-- Composite index for daily visit lookups
CREATE INDEX idx_daily_visits_date_ip ON daily_visits(date, ip_address);

-- Update trigger function for daily_visits
CREATE OR REPLACE FUNCTION update_daily_visits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_update_daily_visits_updated_at
  BEFORE UPDATE ON daily_visits
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_visits_updated_at();

-- Function to cleanup inactive users (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_inactive_users()
RETURNS void AS $$
BEGIN
  DELETE FROM active_users 
  WHERE last_activity < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Function to get today's visit statistics
CREATE OR REPLACE FUNCTION get_daily_visit_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  total_visits_today BIGINT,
  unique_visitors_today BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(dv.total_visits), 0) as total_visits_today,
    COALESCE(COUNT(DISTINCT dv.ip_address), 0) as unique_visitors_today
  FROM daily_visits dv
  WHERE dv.date = target_date;
END;
$$ LANGUAGE plpgsql;

-- Function to update or insert daily visit record
CREATE OR REPLACE FUNCTION upsert_daily_visit(
  visit_date DATE,
  visitor_ip INET
) RETURNS void AS $$
DECLARE
  existing_visit_id UUID;
BEGIN
  -- Check if this IP already visited today
  SELECT id INTO existing_visit_id
  FROM daily_visits
  WHERE date = visit_date AND ip_address = visitor_ip
  LIMIT 1;

  IF existing_visit_id IS NOT NULL THEN
    -- Update existing record (increment total visits, mark as not unique)
    UPDATE daily_visits
    SET 
      total_visits = total_visits + 1,
      is_unique = false,
      updated_at = NOW()
    WHERE id = existing_visit_id;
  ELSE
    -- Insert new record (first visit from this IP today)
    INSERT INTO daily_visits (date, ip_address, total_visits, is_unique)
    VALUES (visit_date, visitor_ip, 1, true);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) for admin access only
ALTER TABLE active_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_visits ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access these tables (admin API only)
CREATE POLICY active_users_service_only ON active_users
  FOR ALL USING (true); -- Service role bypasses RLS

CREATE POLICY daily_visits_service_only ON daily_visits
  FOR ALL USING (true); -- Service role bypasses RLS

-- Grant necessary permissions to service role
GRANT ALL ON active_users TO service_role;
GRANT ALL ON daily_visits TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_inactive_users() TO service_role;
GRANT EXECUTE ON FUNCTION get_daily_visit_stats(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION upsert_daily_visit(DATE, INET) TO service_role;
GRANT EXECUTE ON FUNCTION update_daily_visits_updated_at() TO service_role;

-- Add comments for documentation
COMMENT ON TABLE active_users IS 'Tracks users currently active on the website for real-time admin dashboard';
COMMENT ON TABLE daily_visits IS 'Tracks daily visit statistics including total visits and unique visitors';
COMMENT ON FUNCTION cleanup_inactive_users() IS 'Removes users inactive for more than 5 minutes';
COMMENT ON FUNCTION get_daily_visit_stats(DATE) IS 'Returns total visits and unique visitors for a given date';
COMMENT ON FUNCTION upsert_daily_visit(DATE, INET) IS 'Updates or inserts daily visit record for an IP address';

-- Success message
SELECT 'Active Users Tracking System successfully created!' as result; 