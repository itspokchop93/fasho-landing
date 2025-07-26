-- Create extended user_profiles table for comprehensive user information
-- This extends the basic user_profiles table with billing and personal information

-- Drop existing user_profiles table if it exists (from earlier migrations)
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Create comprehensive user_profiles table
CREATE TABLE user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Personal Information
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    full_name VARCHAR(255),
    
    -- Billing Address Information
    billing_address_line1 VARCHAR(255),
    billing_address_line2 VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state VARCHAR(100),
    billing_zip VARCHAR(20),
    billing_country VARCHAR(100),
    billing_phone VARCHAR(50),
    
    -- Account Settings
    intake_form_completed BOOLEAN DEFAULT FALSE,
    email_notifications BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_email_notifications ON user_profiles(email_notifications);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all profiles" ON user_profiles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- Function to get or create user profile
CREATE OR REPLACE FUNCTION get_or_create_user_profile(p_user_id UUID)
RETURNS user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile user_profiles;
BEGIN
    -- Try to get existing profile
    SELECT * INTO profile FROM user_profiles WHERE user_id = p_user_id;
    
    -- If no profile exists, create one
    IF profile IS NULL THEN
        INSERT INTO user_profiles (user_id) VALUES (p_user_id)
        RETURNING * INTO profile;
    END IF;
    
    RETURN profile;
END;
$$;

-- Function to update profile from billing data
CREATE OR REPLACE FUNCTION update_profile_from_billing(
    p_user_id UUID,
    p_billing_data JSONB
)
RETURNS user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile user_profiles;
BEGIN
    -- Get or create profile
    SELECT * INTO profile FROM get_or_create_user_profile(p_user_id);
    
    -- Update profile with billing information
    UPDATE user_profiles SET
        first_name = COALESCE(NULLIF(p_billing_data->>'firstName', ''), first_name),
        last_name = COALESCE(NULLIF(p_billing_data->>'lastName', ''), last_name),
        full_name = COALESCE(
            NULLIF(TRIM(CONCAT(p_billing_data->>'firstName', ' ', p_billing_data->>'lastName')), ''),
            full_name
        ),
        billing_address_line1 = COALESCE(NULLIF(p_billing_data->>'address', ''), billing_address_line1),
        billing_address_line2 = COALESCE(NULLIF(p_billing_data->>'address2', ''), billing_address_line2),
        billing_city = COALESCE(NULLIF(p_billing_data->>'city', ''), billing_city),
        billing_state = COALESCE(NULLIF(p_billing_data->>'state', ''), billing_state),
        billing_zip = COALESCE(NULLIF(p_billing_data->>'zip', ''), billing_zip),
        billing_country = COALESCE(NULLIF(p_billing_data->>'country', ''), billing_country),
        billing_phone = COALESCE(
            NULLIF(CONCAT(p_billing_data->>'countryCode', p_billing_data->>'phoneNumber'), ''),
            billing_phone
        ),
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO profile;
    
    RETURN profile;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE user_profiles IS 'Extended user profiles with personal and billing information';
COMMENT ON COLUMN user_profiles.user_id IS 'Reference to the authenticated user';
COMMENT ON COLUMN user_profiles.intake_form_completed IS 'Whether user has completed the intake form';
COMMENT ON FUNCTION get_or_create_user_profile(UUID) IS 'Gets existing profile or creates new one for user';
COMMENT ON FUNCTION update_profile_from_billing(UUID, JSONB) IS 'Updates user profile with billing information from checkout'; 