-- DIAGNOSTIC: Check Email System Database State
-- Run this in Supabase SQL Editor to diagnose email system issues

-- 1. Check if email_templates table exists and its structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'email_templates'
ORDER BY ordinal_position;

-- 2. Check if email_notification_settings table exists and its structure  
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'email_notification_settings'
ORDER BY ordinal_position;

-- 3. Check current data in email_templates
SELECT 
  id,
  name,
  trigger_type,
  is_active,
  created_at,
  updated_at,
  LENGTH(html_content) as html_length
FROM email_templates
ORDER BY created_at DESC;

-- 4. Check current data in email_notification_settings
SELECT 
  id,
  trigger_type,
  is_active,
  template_id,
  total_sent,
  created_at,
  updated_at
FROM email_notification_settings
ORDER BY trigger_type;

-- 5. Check for any foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name = 'email_templates' OR tc.table_name = 'email_notification_settings');

-- 6. Check indexes on email tables
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('email_templates', 'email_notification_settings')
ORDER BY tablename, indexname;

-- 7. Count total records in each table
SELECT 
  'email_templates' as table_name,
  COUNT(*) as record_count
FROM email_templates
UNION ALL
SELECT 
  'email_notification_settings' as table_name,
  COUNT(*) as record_count
FROM email_notification_settings; 