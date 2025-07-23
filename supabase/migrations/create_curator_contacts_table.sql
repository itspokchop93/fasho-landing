-- Create curator_contacts table for tracking user-curator interactions
CREATE TABLE IF NOT EXISTS curator_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  curator_id INTEGER NOT NULL,
  contacted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  contact_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, curator_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_curator_contacts_user_id ON curator_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_curator_contacts_curator_id ON curator_contacts(curator_id);

-- Enable RLS
ALTER TABLE curator_contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own curator contacts" ON curator_contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own curator contacts" ON curator_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own curator contacts" ON curator_contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own curator contacts" ON curator_contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_curator_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_curator_contacts_updated_at
  BEFORE UPDATE ON curator_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_curator_contacts_updated_at(); 