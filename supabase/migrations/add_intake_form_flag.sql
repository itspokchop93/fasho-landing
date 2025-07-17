-- Add intake form completion flag to users
-- This flag tracks whether a user has completed the post-purchase questionnaire

DO $$ 
BEGIN
    -- Add intake_form_completed column to auth.users if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'auth' 
        AND table_name = 'users' 
        AND column_name = 'intake_form_completed'
    ) THEN
        ALTER TABLE auth.users ADD COLUMN intake_form_completed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create a function to check if user has completed intake form
CREATE OR REPLACE FUNCTION check_intake_form_status(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(intake_form_completed, FALSE)
        FROM auth.users
        WHERE id = user_id
    );
END;
$$;

-- Create a function to mark intake form as completed
CREATE OR REPLACE FUNCTION mark_intake_form_completed(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE auth.users 
    SET intake_form_completed = TRUE 
    WHERE id = user_id;
    
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
CREATE INDEX IF NOT EXISTS idx_intake_form_responses_user_id ON intake_form_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_intake_form_responses_created_at ON intake_form_responses(created_at);

-- Add comment for documentation
COMMENT ON TABLE intake_form_responses IS 'Stores user responses to the post-purchase questionnaire/intake form';
COMMENT ON COLUMN intake_form_responses.responses IS 'JSONB object containing all questionnaire responses'; 