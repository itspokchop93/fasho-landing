-- =====================================================
-- UPDATE REDEMPTION RATE
-- =====================================================
-- Change the redemption rate so 100 tokens = $0.10 discount
-- This means 1000 tokens = $1.00 discount
-- (Previously was 100 tokens = $1.00 discount)

-- Update existing settings
UPDATE loyalty_settings 
SET redemption_tokens_per_dollar = 1000
WHERE id = 1 AND redemption_tokens_per_dollar = 100;

-- Also update the default for new installations (if table is recreated)
-- This is just a comment reminder - the actual default is in the CREATE TABLE statement
-- in the original migration file
