-- Create user_profiles table to track intake form completion
-- This approach works with Supabase's permissions (can't modify auth.users directly)

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    intake_form_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see and manage their own profile
CREATE POLICY "Users can manage their own profile"
ON user_profiles
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can manage all profiles
CREATE POLICY "Service role can manage all profiles"
ON user_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to get or create user profile
CREATE OR REPLACE FUNCTION get_or_create_user_profile(user_id UUID)
RETURNS user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile user_profiles;
BEGIN
    -- Try to get existing profile
    SELECT * INTO profile FROM user_profiles WHERE user_profiles.user_id = get_or_create_user_profile.user_id;
    
    -- If no profile exists, create one
    IF profile IS NULL THEN
        INSERT INTO user_profiles (user_id) VALUES (get_or_create_user_profile.user_id)
        RETURNING * INTO profile;
    END IF;
    
    RETURN profile;
END;
$$;

-- Create a function to check if user has completed intake form
CREATE OR REPLACE FUNCTION check_intake_form_status(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile user_profiles;
BEGIN
    -- Get or create profile
    SELECT * INTO profile FROM get_or_create_user_profile(user_id);
    
    RETURN COALESCE(profile.intake_form_completed, FALSE);
END;
$$;

-- Create a function to mark intake form as completed
CREATE OR REPLACE FUNCTION mark_intake_form_completed(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile user_profiles;
BEGIN
    -- Get or create profile
    SELECT * INTO profile FROM get_or_create_user_profile(user_id);
    
    -- Update the profile
    UPDATE user_profiles 
    SET intake_form_completed = TRUE, updated_at = NOW()
    WHERE user_profiles.user_id = mark_intake_form_completed.user_id;
    
    RETURN TRUE;
END;
$$;

-- Create intake_form_responses table to store questionnaire responses
CREATE TABLE IF NOT EXISTS intake_form_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    responses JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on intake_form_responses
ALTER TABLE intake_form_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see and manage their own responses
CREATE POLICY "Users can manage their own intake responses"
ON intake_form_responses
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can manage all responses
CREATE POLICY "Service role can manage all intake responses"
ON intake_form_responses
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_intake_form_responses_user_id ON intake_form_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_intake_form_responses_created_at ON intake_form_responses(created_at);

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'User profile data including intake form completion status';
COMMENT ON COLUMN user_profiles.intake_form_completed IS 'Boolean flag indicating if user has completed the post-purchase questionnaire';
COMMENT ON TABLE intake_form_responses IS 'Stores user responses to the post-purchase questionnaire/intake form';
COMMENT ON COLUMN intake_form_responses.responses IS 'JSONB object containing all questionnaire responses'; 