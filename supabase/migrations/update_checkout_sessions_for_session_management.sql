-- Update checkout sessions table to support better session management
-- Add new status values and updated_at field

ALTER TABLE checkout_sessions 
DROP CONSTRAINT IF EXISTS checkout_sessions_status_check;

ALTER TABLE checkout_sessions 
ADD CONSTRAINT checkout_sessions_status_check 
CHECK (status IN ('active', 'completed', 'expired', 'invalidated'));

-- Add updated_at field with default value
ALTER TABLE checkout_sessions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for updated_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_updated_at ON checkout_sessions(updated_at);

-- Create a function to automatically update the updated_at field
CREATE OR REPLACE FUNCTION update_checkout_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS checkout_sessions_updated_at_trigger ON checkout_sessions;
CREATE TRIGGER checkout_sessions_updated_at_trigger
    BEFORE UPDATE ON checkout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_checkout_sessions_updated_at();

-- Add policy for service role to manage sessions without RLS restrictions
CREATE POLICY IF NOT EXISTS "Service role can manage all checkout sessions"
ON checkout_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);