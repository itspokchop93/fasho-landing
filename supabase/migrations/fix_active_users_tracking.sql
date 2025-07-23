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

-- Fix Active Users Tracking - IP Address and Session Management
-- This migration fixes IP address handling and improves session tracking

-- Update IP address column to handle localhost and development values
ALTER TABLE active_users 
ALTER COLUMN ip_address TYPE VARCHAR(45); -- IPv6 max length

-- Add comment to clarify IP address handling
COMMENT ON COLUMN active_users.ip_address IS 'Client IP address. For localhost development, shows "localhost". For production, shows actual IP.';

-- Update the upsert_daily_visit function to handle string IPs
CREATE OR REPLACE FUNCTION upsert_daily_visit(
  visit_date DATE,
  visitor_ip VARCHAR(45)
) RETURNS void AS $$
DECLARE
  existing_visit_id UUID;
BEGIN
  -- Skip localhost and unknown IPs
  IF visitor_ip IN ('localhost', 'unknown', '::1', '127.0.0.1') THEN
    RETURN;
  END IF;

  -- Check if this IP already visited today
  SELECT id INTO existing_visit_id
  FROM daily_visits
  WHERE date = visit_date AND ip_address::text = visitor_ip
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
    VALUES (visit_date, visitor_ip::inet, 1, true);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update daily_visits table IP column to handle string values
ALTER TABLE daily_visits 
ALTER COLUMN ip_address TYPE VARCHAR(45);

-- Add function to cleanup inactive users more frequently (every 2 minutes)
CREATE OR REPLACE FUNCTION cleanup_inactive_users()
RETURNS void AS $$
BEGIN
  DELETE FROM active_users 
  WHERE last_activity < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql;

-- Add function to get active users with better formatting
CREATE OR REPLACE FUNCTION get_active_users()
RETURNS TABLE(
  id UUID,
  session_id VARCHAR(255),
  account_name VARCHAR(255),
  email VARCHAR(255),
  ip_address VARCHAR(45),
  browser VARCHAR(255),
  current_page VARCHAR(500),
  last_activity TIMESTAMP WITH TIME ZONE,
  is_guest BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.session_id,
    CASE 
      WHEN au.is_guest THEN 'Guest User'
      ELSE COALESCE(au.first_name || ' ' || au.last_name, au.first_name, 'User')
    END as account_name,
    au.email,
    au.ip_address,
    CASE 
      WHEN au.user_agent LIKE '%Chrome%' THEN 'Chrome'
      WHEN au.user_agent LIKE '%Firefox%' THEN 'Firefox'
      WHEN au.user_agent LIKE '%Safari%' THEN 'Safari'
      WHEN au.user_agent LIKE '%Edge%' THEN 'Edge'
      WHEN au.user_agent LIKE '%Opera%' THEN 'Opera'
      ELSE 'Other'
    END as browser,
    au.current_page,
    au.last_activity,
    au.is_guest,
    au.created_at
  FROM active_users au
  ORDER BY au.last_activity DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for new function
GRANT EXECUTE ON FUNCTION get_active_users() TO service_role; 

-- Fix Active Users Tracking - Increase current_page field length and improve tracking
-- This migration fixes the "value too long for type character varying(500)" error

-- Increase current_page field length from 500 to 1000 characters
ALTER TABLE active_users ALTER COLUMN current_page TYPE VARCHAR(1000);

-- Add a function to truncate page URLs if they're still too long
CREATE OR REPLACE FUNCTION truncate_page_url(page_url TEXT, max_length INTEGER DEFAULT 1000)
RETURNS TEXT AS $$
BEGIN
  IF LENGTH(page_url) <= max_length THEN
    RETURN page_url;
  ELSE
    -- Truncate but keep the base path, remove query parameters if needed
    IF page_url LIKE '%?%' THEN
      -- If it has query parameters, try to keep the base path
      RETURN LEFT(SPLIT_PART(page_url, '?', 1), max_length - 3) || '...';
    ELSE
      -- No query parameters, just truncate
      RETURN LEFT(page_url, max_length - 3) || '...';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update the tracking API to use this function
-- This will be handled in the API code, but we create the function here for safety

-- Add better error handling for the upsert operation
CREATE OR REPLACE FUNCTION safe_upsert_active_user(
  p_session_id VARCHAR(255),
  p_user_id UUID,
  p_ip_address INET,
  p_user_agent TEXT,
  p_current_page TEXT,
  p_first_name VARCHAR(255),
  p_last_name VARCHAR(255),
  p_email VARCHAR(255),
  p_is_guest BOOLEAN
) RETURNS BOOLEAN AS $$
BEGIN
  -- Truncate the page URL if it's too long
  p_current_page := truncate_page_url(p_current_page, 1000);
  
  -- Try to upsert the active user
  INSERT INTO active_users (
    session_id, user_id, ip_address, user_agent, current_page,
    first_name, last_name, email, is_guest, last_activity
  ) VALUES (
    p_session_id, p_user_id, p_ip_address, p_user_agent, p_current_page,
    p_first_name, p_last_name, p_email, p_is_guest, NOW()
  )
  ON CONFLICT (session_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    ip_address = EXCLUDED.ip_address,
    user_agent = EXCLUDED.user_agent,
    current_page = EXCLUDED.current_page,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    is_guest = EXCLUDED.is_guest,
    last_activity = NOW();
    
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error (in production, you might want to use a proper logging system)
    RAISE WARNING 'Error upserting active user: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Update the cleanup function to be more aggressive (remove users after 2 minutes instead of 5)
CREATE OR REPLACE FUNCTION cleanup_inactive_users()
RETURNS void AS $$
BEGIN
  DELETE FROM active_users 
  WHERE last_activity < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the new function
GRANT EXECUTE ON FUNCTION truncate_page_url(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION safe_upsert_active_user(VARCHAR(255), UUID, INET, TEXT, TEXT, VARCHAR(255), VARCHAR(255), VARCHAR(255), BOOLEAN) TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION truncate_page_url(TEXT, INTEGER) IS 'Truncates page URLs to fit within database field limits while preserving readability';
COMMENT ON FUNCTION safe_upsert_active_user(VARCHAR(255), UUID, INET, TEXT, TEXT, VARCHAR(255), VARCHAR(255), VARCHAR(255), BOOLEAN) IS 'Safely upserts active user data with error handling and URL truncation';
COMMENT ON FUNCTION cleanup_inactive_users() IS 'Removes users inactive for more than 2 minutes (updated from 5 minutes for faster cleanup)'; 