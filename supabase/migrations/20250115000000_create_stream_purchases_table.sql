-- Stream Purchases Table Migration
-- This migration creates the stream_purchases table for tracking SMM panel stream purchases
-- All changes are non-destructive and safe for production use

-- Create stream_purchases table
CREATE TABLE IF NOT EXISTS stream_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL,
  stream_qty INTEGER NOT NULL,
  drips INTEGER NOT NULL,
  interval_minutes INTEGER NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_purchase_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint to playlist_network table
  CONSTRAINT fk_stream_purchases_playlist 
    FOREIGN KEY (playlist_id) 
    REFERENCES playlist_network(id) 
    ON DELETE CASCADE
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_stream_purchases_playlist_id ON stream_purchases(playlist_id);
CREATE INDEX IF NOT EXISTS idx_stream_purchases_purchase_date ON stream_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_stream_purchases_next_purchase_date ON stream_purchases(next_purchase_date);

-- Create composite index for getting latest purchase per playlist
CREATE INDEX IF NOT EXISTS idx_stream_purchases_playlist_latest ON stream_purchases(playlist_id, purchase_date DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_stream_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stream_purchases_updated_at
    BEFORE UPDATE ON stream_purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_stream_purchases_updated_at();

-- Add helpful comment
COMMENT ON TABLE stream_purchases IS 'Tracks SMM panel stream purchases for playlists including quantity, drip configuration, and calculated next purchase dates';
