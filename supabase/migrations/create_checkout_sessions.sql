-- Create checkout sessions table
CREATE TABLE checkout_sessions (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR,
  session_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  is_used BOOLEAN DEFAULT false,
  INDEX (user_id),
  INDEX (status),
  INDEX (created_at)
);

-- Add RLS (Row Level Security)
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own sessions
CREATE POLICY "Users can view their own checkout sessions" 
ON checkout_sessions FOR SELECT 
USING (auth.uid()::text = user_id);

-- Allow creating new sessions
CREATE POLICY "Users can create checkout sessions" 
ON checkout_sessions FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

-- Allow updating own sessions
CREATE POLICY "Users can update their own checkout sessions" 
ON checkout_sessions FOR UPDATE 
USING (auth.uid()::text = user_id); 