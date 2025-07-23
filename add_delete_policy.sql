-- Add DELETE policy for curator_contacts table
CREATE POLICY "Users can delete their own curator contacts" ON curator_contacts
  FOR DELETE USING (auth.uid() = user_id); 