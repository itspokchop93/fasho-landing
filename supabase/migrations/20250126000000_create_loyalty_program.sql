-- =====================================================
-- FASHOKENS LOYALTY PROGRAM - DATABASE SCHEMA
-- =====================================================
-- A ledger-based loyalty program where customers earn FASHOKENS when they pay,
-- and can redeem them for discounts on future orders.
-- Core rule: 100 FASHOKENS = $1.00 (both earning and redemption, configurable by admin)
--
-- THIS MIGRATION IS 100% ADDITIVE AND NON-DESTRUCTIVE
-- It only creates new tables, columns, functions, and policies
-- It does NOT drop, delete, or modify any existing data

-- =====================================================
-- TABLE: loyalty_settings (Single-row table for global config)
-- =====================================================
CREATE TABLE IF NOT EXISTS loyalty_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Ensures single row
  tokens_per_dollar INTEGER NOT NULL DEFAULT 100,
  redemption_tokens_per_dollar INTEGER NOT NULL DEFAULT 100,
  is_program_active BOOLEAN NOT NULL DEFAULT true,
  minimum_order_total DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default settings (only if not already exists)
INSERT INTO loyalty_settings (id, tokens_per_dollar, redemption_tokens_per_dollar, is_program_active, minimum_order_total)
VALUES (1, 100, 100, true, 1.00)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- TABLE: loyalty_accounts (User balance cache)
-- =====================================================
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups (IF NOT EXISTS prevents errors if already exists)
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_balance ON loyalty_accounts(balance) WHERE balance > 0;

-- =====================================================
-- TABLE: loyalty_ledger (Source of truth for all token movements)
-- =====================================================
CREATE TABLE IF NOT EXISTS loyalty_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit', 'adjustment_add', 'adjustment_subtract')),
  amount INTEGER NOT NULL CHECK (amount > 0), -- Always positive, type determines direction
  reason TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_total DECIMAL(10,2),
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id), -- Admin user_id for manual adjustments
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying (IF NOT EXISTS prevents errors)
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_user_id ON loyalty_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_order_id ON loyalty_ledger(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_created_at ON loyalty_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_type ON loyalty_ledger(type);

-- =====================================================
-- ALTER orders table - Add FASHOKENS columns (IF NOT EXISTS is safe)
-- =====================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fashokens_spent INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fashokens_earned INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fashokens_discount_amount DECIMAL(10,2) DEFAULT 0;

-- =====================================================
-- FUNCTION: get_or_create_loyalty_account
-- Returns account, creates with zero balance if doesn't exist
-- CREATE OR REPLACE is safe - it only updates the function definition
-- =====================================================
CREATE OR REPLACE FUNCTION get_or_create_loyalty_account(p_user_id UUID)
RETURNS loyalty_accounts AS $$
DECLARE
  account loyalty_accounts;
BEGIN
  -- Try to get existing account
  SELECT * INTO account FROM loyalty_accounts WHERE user_id = p_user_id;
  
  -- If not found, create new account with zero balance
  IF NOT FOUND THEN
    INSERT INTO loyalty_accounts (user_id, balance, lifetime_earned, lifetime_spent)
    VALUES (p_user_id, 0, 0, 0)
    RETURNING * INTO account;
  END IF;
  
  RETURN account;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: credit_fashokens
-- Adds tokens to balance, increments lifetime_earned, inserts ledger entry
-- =====================================================
CREATE OR REPLACE FUNCTION credit_fashokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_order_id UUID DEFAULT NULL,
  p_order_total DECIMAL(10,2) DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, ledger_entry_id UUID, error_message TEXT) AS $$
DECLARE
  v_account loyalty_accounts;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_ledger_id UUID;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT false, 0, NULL::UUID, 'Amount must be positive'::TEXT;
    RETURN;
  END IF;

  -- Get or create account
  SELECT * INTO v_account FROM get_or_create_loyalty_account(p_user_id);
  v_balance_before := v_account.balance;
  v_balance_after := v_balance_before + p_amount;
  
  -- Update account balance
  UPDATE loyalty_accounts
  SET 
    balance = v_balance_after,
    lifetime_earned = lifetime_earned + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Insert ledger entry
  INSERT INTO loyalty_ledger (user_id, type, amount, reason, order_id, order_total, balance_before, balance_after)
  VALUES (p_user_id, 'credit', p_amount, p_reason, p_order_id, p_order_total, v_balance_before, v_balance_after)
  RETURNING id INTO v_ledger_id;
  
  RETURN QUERY SELECT true, v_balance_after, v_ledger_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: debit_fashokens
-- Subtracts tokens, increments lifetime_spent, inserts ledger entry
-- Must fail with error if insufficient balance
-- =====================================================
CREATE OR REPLACE FUNCTION debit_fashokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_order_id UUID DEFAULT NULL,
  p_order_total DECIMAL(10,2) DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, ledger_entry_id UUID, error_message TEXT) AS $$
DECLARE
  v_account loyalty_accounts;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_ledger_id UUID;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT false, 0, NULL::UUID, 'Amount must be positive'::TEXT;
    RETURN;
  END IF;

  -- Get account (must exist for debit)
  SELECT * INTO v_account FROM loyalty_accounts WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, NULL::UUID, 'No loyalty account found for user'::TEXT;
    RETURN;
  END IF;
  
  v_balance_before := v_account.balance;
  
  -- Check sufficient balance
  IF v_balance_before < p_amount THEN
    RETURN QUERY SELECT false, v_balance_before, NULL::UUID, 'Insufficient balance'::TEXT;
    RETURN;
  END IF;
  
  v_balance_after := v_balance_before - p_amount;
  
  -- Update account balance
  UPDATE loyalty_accounts
  SET 
    balance = v_balance_after,
    lifetime_spent = lifetime_spent + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Insert ledger entry
  INSERT INTO loyalty_ledger (user_id, type, amount, reason, order_id, order_total, balance_before, balance_after)
  VALUES (p_user_id, 'debit', p_amount, p_reason, p_order_id, p_order_total, v_balance_before, v_balance_after)
  RETURNING id INTO v_ledger_id;
  
  RETURN QUERY SELECT true, v_balance_after, v_ledger_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: admin_adjust_fashokens
-- For manual adjustments. Records the admin's user_id in created_by field.
-- Must fail if subtraction would go negative.
-- =====================================================
CREATE OR REPLACE FUNCTION admin_adjust_fashokens(
  p_admin_id UUID,
  p_user_id UUID,
  p_amount INTEGER,
  p_is_addition BOOLEAN,
  p_reason TEXT
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, ledger_entry_id UUID, error_message TEXT) AS $$
DECLARE
  v_account loyalty_accounts;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_ledger_id UUID;
  v_type VARCHAR(20);
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT false, 0, NULL::UUID, 'Amount must be positive'::TEXT;
    RETURN;
  END IF;

  -- Get or create account
  SELECT * INTO v_account FROM get_or_create_loyalty_account(p_user_id);
  v_balance_before := v_account.balance;
  
  IF p_is_addition THEN
    v_balance_after := v_balance_before + p_amount;
    v_type := 'adjustment_add';
  ELSE
    -- Check if subtraction would go negative
    IF v_balance_before < p_amount THEN
      RETURN QUERY SELECT false, v_balance_before, NULL::UUID, 'Cannot remove more tokens than the user has'::TEXT;
      RETURN;
    END IF;
    v_balance_after := v_balance_before - p_amount;
    v_type := 'adjustment_subtract';
  END IF;
  
  -- Update account balance
  UPDATE loyalty_accounts
  SET 
    balance = v_balance_after,
    lifetime_earned = CASE WHEN p_is_addition THEN lifetime_earned + p_amount ELSE lifetime_earned END,
    lifetime_spent = CASE WHEN NOT p_is_addition THEN lifetime_spent + p_amount ELSE lifetime_spent END,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Insert ledger entry with admin's user_id
  INSERT INTO loyalty_ledger (user_id, type, amount, reason, balance_before, balance_after, created_by)
  VALUES (p_user_id, v_type, p_amount, p_reason, v_balance_before, v_balance_after, p_admin_id)
  RETURNING id INTO v_ledger_id;
  
  RETURN QUERY SELECT true, v_balance_after, v_ledger_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: calculate_max_redeemable_tokens
-- Returns the lesser of: user's balance OR tokens that would bring cart to minimum ($1.00)
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_max_redeemable_tokens(
  p_user_id UUID,
  p_cart_total DECIMAL(10,2),
  p_redemption_rate INTEGER DEFAULT 100
)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
  v_minimum_order DECIMAL(10,2);
  v_max_discount DECIMAL(10,2);
  v_max_tokens_for_discount INTEGER;
BEGIN
  -- Get user's current balance
  SELECT balance INTO v_balance FROM loyalty_accounts WHERE user_id = p_user_id;
  
  IF v_balance IS NULL OR v_balance = 0 THEN
    RETURN 0;
  END IF;
  
  -- Get minimum order total from settings
  SELECT minimum_order_total INTO v_minimum_order FROM loyalty_settings WHERE id = 1;
  IF v_minimum_order IS NULL THEN
    v_minimum_order := 1.00;
  END IF;
  
  -- Calculate maximum discount allowed (cart total - minimum order)
  v_max_discount := p_cart_total - v_minimum_order;
  
  IF v_max_discount <= 0 THEN
    RETURN 0;
  END IF;
  
  -- Calculate tokens needed for max discount
  v_max_tokens_for_discount := FLOOR(v_max_discount * p_redemption_rate);
  
  -- Return the lesser of user's balance or max tokens for discount
  RETURN LEAST(v_balance, v_max_tokens_for_discount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Trigger function for updated_at on loyalty_accounts
-- CREATE OR REPLACE is safe for functions
-- =====================================================
CREATE OR REPLACE FUNCTION update_loyalty_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Trigger function for updated_at on loyalty_settings
-- =====================================================
CREATE OR REPLACE FUNCTION update_loyalty_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Create triggers ONLY if they don't already exist
-- Using DO block to check existence first (no DROP required)
-- =====================================================
DO $$
BEGIN
  -- Create trigger for loyalty_accounts if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_loyalty_accounts_updated_at'
  ) THEN
    CREATE TRIGGER trigger_loyalty_accounts_updated_at
      BEFORE UPDATE ON loyalty_accounts
      FOR EACH ROW
      EXECUTE FUNCTION update_loyalty_accounts_updated_at();
  END IF;
  
  -- Create trigger for loyalty_settings if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_loyalty_settings_updated_at'
  ) THEN
    CREATE TRIGGER trigger_loyalty_settings_updated_at
      BEFORE UPDATE ON loyalty_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_loyalty_settings_updated_at();
  END IF;
END;
$$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS (safe to run multiple times)
-- =====================================================
ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies - Create only if they don't exist
-- Using DO blocks to safely check before creating
-- =====================================================
DO $$
BEGIN
  -- Policy: Users can view own loyalty account
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'loyalty_accounts' 
    AND policyname = 'Users can view own loyalty account'
  ) THEN
    CREATE POLICY "Users can view own loyalty account" ON loyalty_accounts
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- Policy: Service role can manage all loyalty accounts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'loyalty_accounts' 
    AND policyname = 'Service role can manage all loyalty accounts'
  ) THEN
    CREATE POLICY "Service role can manage all loyalty accounts" ON loyalty_accounts
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- Policy: Users can view own loyalty ledger entries
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'loyalty_ledger' 
    AND policyname = 'Users can view own loyalty ledger entries'
  ) THEN
    CREATE POLICY "Users can view own loyalty ledger entries" ON loyalty_ledger
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- Policy: Service role can manage all loyalty ledger entries
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'loyalty_ledger' 
    AND policyname = 'Service role can manage all loyalty ledger entries'
  ) THEN
    CREATE POLICY "Service role can manage all loyalty ledger entries" ON loyalty_ledger
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- Policy: Anyone can view loyalty settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'loyalty_settings' 
    AND policyname = 'Anyone can view loyalty settings'
  ) THEN
    CREATE POLICY "Anyone can view loyalty settings" ON loyalty_settings
      FOR SELECT USING (true);
  END IF;

  -- Policy: Service role can manage loyalty settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'loyalty_settings' 
    AND policyname = 'Service role can manage loyalty settings'
  ) THEN
    CREATE POLICY "Service role can manage loyalty settings" ON loyalty_settings
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS (safe to run multiple times)
-- =====================================================
GRANT ALL ON loyalty_accounts TO service_role;
GRANT ALL ON loyalty_ledger TO service_role;
GRANT ALL ON loyalty_settings TO service_role;

GRANT SELECT ON loyalty_accounts TO authenticated;
GRANT SELECT ON loyalty_ledger TO authenticated;
GRANT SELECT ON loyalty_settings TO authenticated;

-- Grant execute on functions to service_role (safe to run multiple times)
GRANT EXECUTE ON FUNCTION get_or_create_loyalty_account(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION credit_fashokens(UUID, INTEGER, TEXT, UUID, DECIMAL) TO service_role;
GRANT EXECUTE ON FUNCTION debit_fashokens(UUID, INTEGER, TEXT, UUID, DECIMAL) TO service_role;
GRANT EXECUTE ON FUNCTION admin_adjust_fashokens(UUID, UUID, INTEGER, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION calculate_max_redeemable_tokens(UUID, DECIMAL, INTEGER) TO service_role;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION (safe to run multiple times)
-- =====================================================
COMMENT ON TABLE loyalty_accounts IS 'Stores each user''s current FASHOKEN balance (cached value - ledger is source of truth)';
COMMENT ON TABLE loyalty_ledger IS 'Complete audit trail of all FASHOKEN movements - source of truth for balances';
COMMENT ON TABLE loyalty_settings IS 'Global configuration for the FASHOKENS loyalty program';
COMMENT ON COLUMN orders.fashokens_spent IS 'Number of FASHOKENS spent on this order';
COMMENT ON COLUMN orders.fashokens_earned IS 'Number of FASHOKENS earned from this order';
COMMENT ON COLUMN orders.fashokens_discount_amount IS 'Dollar amount discount from FASHOKENS redemption';
