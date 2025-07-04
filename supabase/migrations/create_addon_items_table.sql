-- Create add_on_items table for proper relational storage
CREATE TABLE add_on_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    addon_id VARCHAR(50) NOT NULL,
    addon_name VARCHAR(255) NOT NULL,
    addon_description TEXT,
    original_price INTEGER NOT NULL, -- in cents
    discounted_price INTEGER NOT NULL, -- in cents
    is_discounted BOOLEAN DEFAULT false,
    emoji VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_add_on_items_order_id ON add_on_items(order_id);
CREATE INDEX idx_add_on_items_addon_id ON add_on_items(addon_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_add_on_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_add_on_items_updated_at
    BEFORE UPDATE ON add_on_items
    FOR EACH ROW
    EXECUTE FUNCTION update_add_on_items_updated_at();

-- Add RLS policies
ALTER TABLE add_on_items ENABLE ROW LEVEL SECURITY;

-- Users can only see add-on items for their own orders
CREATE POLICY "Users can view their own add-on items" ON add_on_items
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM orders WHERE user_id = auth.uid()
        )
    );

-- Allow inserts for authenticated users (will be validated by application logic)
CREATE POLICY "Authenticated users can insert add-on items" ON add_on_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated'); 