-- Create user_artist_profiles table
-- This table stores the user's selected Spotify artist profile for dashboard display

CREATE TABLE user_artist_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    spotify_artist_id TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    artist_image_url TEXT,
    spotify_artist_url TEXT NOT NULL,
    followers_count INTEGER DEFAULT 0,
    genres TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to ensure one artist profile per user
CREATE UNIQUE INDEX idx_user_artist_profiles_user_id ON user_artist_profiles(user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_artist_profiles_spotify_artist_id ON user_artist_profiles(spotify_artist_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE user_artist_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own artist profile
CREATE POLICY "Users can view own artist profile" ON user_artist_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own artist profile
CREATE POLICY "Users can insert own artist profile" ON user_artist_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own artist profile
CREATE POLICY "Users can update own artist profile" ON user_artist_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own artist profile
CREATE POLICY "Users can delete own artist profile" ON user_artist_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE user_artist_profiles IS 'Stores user-selected Spotify artist profiles for dashboard display';
COMMENT ON COLUMN user_artist_profiles.user_id IS 'Reference to the user who owns this artist profile';
COMMENT ON COLUMN user_artist_profiles.spotify_artist_id IS 'Spotify artist ID from the Spotify Web API';
COMMENT ON COLUMN user_artist_profiles.artist_name IS 'Display name of the artist';
COMMENT ON COLUMN user_artist_profiles.artist_image_url IS 'URL to the artist profile image from Spotify';
COMMENT ON COLUMN user_artist_profiles.spotify_artist_url IS 'Full Spotify URL to the artist profile';
COMMENT ON COLUMN user_artist_profiles.followers_count IS 'Number of followers the artist has on Spotify';
COMMENT ON COLUMN user_artist_profiles.genres IS 'Array of genres associated with the artist'; 