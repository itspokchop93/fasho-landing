-- Add music_genre field to user_profiles table safely
-- This migration follows the CRITICAL rule for live production sites with customer data

-- Check if music_genre column exists before adding it
DO $$ 
BEGIN
    -- Add music_genre column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'music_genre'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN music_genre VARCHAR(100);
        
        -- Add index for performance on genre filtering
        CREATE INDEX IF NOT EXISTS idx_user_profiles_music_genre 
        ON user_profiles(music_genre);
        
        -- Add comment for documentation
        COMMENT ON COLUMN user_profiles.music_genre IS 'User preferred music genre selected during checkout';
        
        RAISE NOTICE 'Added music_genre column to user_profiles table';
    ELSE
        RAISE NOTICE 'music_genre column already exists in user_profiles table';
    END IF;
END $$;