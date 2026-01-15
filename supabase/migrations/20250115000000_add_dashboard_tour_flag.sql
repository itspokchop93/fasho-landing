-- Add has_seen_dashboard_tour flag to user_profiles table
-- This flag tracks whether a user has completed the dashboard onboarding tour
-- Run this in Supabase SQL Editor to add the column

-- Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = 'has_seen_dashboard_tour'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN has_seen_dashboard_tour BOOLEAN DEFAULT FALSE;
        
        -- Add comment for documentation
        COMMENT ON COLUMN user_profiles.has_seen_dashboard_tour IS 'Whether user has completed the dashboard onboarding tour';
        
        RAISE NOTICE 'Added has_seen_dashboard_tour column to user_profiles table';
    ELSE
        RAISE NOTICE 'has_seen_dashboard_tour column already exists in user_profiles table';
    END IF;
END $$;
