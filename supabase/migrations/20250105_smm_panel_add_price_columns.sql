-- Migration: Add price columns to smm_order_sets table
-- Run this if you already have the smm_order_sets table created

-- Add price_per_1k column (price per 1000 from Followiz API)
ALTER TABLE smm_order_sets 
ADD COLUMN IF NOT EXISTS price_per_1k DECIMAL(10, 4) DEFAULT NULL;

-- Add set_cost column (calculated total cost for this order set)
ALTER TABLE smm_order_sets 
ADD COLUMN IF NOT EXISTS set_cost DECIMAL(10, 4) DEFAULT NULL;

-- Make drip_runs nullable (for one-time purchases without drip feed)
ALTER TABLE smm_order_sets 
ALTER COLUMN drip_runs DROP NOT NULL,
ALTER COLUMN drip_runs DROP DEFAULT;

-- Make interval_minutes nullable (for one-time purchases without drip feed)
ALTER TABLE smm_order_sets 
ALTER COLUMN interval_minutes DROP NOT NULL,
ALTER COLUMN interval_minutes DROP DEFAULT;

-- Also make drip_runs and interval_minutes nullable in purchase logs
ALTER TABLE smm_purchase_logs 
ALTER COLUMN drip_runs DROP NOT NULL,
ALTER COLUMN drip_runs DROP DEFAULT;

ALTER TABLE smm_purchase_logs 
ALTER COLUMN interval_minutes DROP NOT NULL,
ALTER COLUMN interval_minutes DROP DEFAULT;

