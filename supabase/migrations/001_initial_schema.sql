-- Complete Unbias Lending Database Schema
-- Migration: 001_initial_schema.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create borrower_drafts table (before OTP verification)
CREATE TABLE IF NOT EXISTS borrower_drafts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id text UNIQUE, -- for anonymous sessions
  full_name text,
  journey_stage text,
  property_type text,
  property_value_est numeric,
  city text,
  pincode text,
  loan_amount_required numeric,
  dob date,
  employment_type text,
  gross_salary numeric,
  other_income numeric DEFAULT 0,
  annual_net_profit numeric,
  itr_years int,
  existing_emi numeric DEFAULT 0,
  has_coapplicant boolean,
  mobile text,
  consent_ts timestamptz DEFAULT now(),
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create borrowers table (after OTP verification)
CREATE TABLE IF NOT EXISTS borrowers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name text,
  dob date,
  employment_type text,
  monthly_net_income numeric, -- This will be calculated from gross_salary or annual_net_profit
  existing_emi numeric DEFAULT 0,
  property_type text,
  property_value_est numeric,
  city text,
  pincode text,
  loan_amount_required numeric,
  mobile text,
  gross_salary numeric,
  other_income numeric DEFAULT 0,
  annual_net_profit numeric,
  itr_years int,
  has_coapplicant boolean,
  journey_stage text,
  consent_ts timestamptz,
  verified boolean DEFAULT true,
  status text DEFAULT 'offers_generated',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_rules table (for flexible eligibility rules)
CREATE TABLE IF NOT EXISTS product_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  rule_key text NOT NULL, -- 'min_age', 'max_foir', 'employment_types', etc.
  rule_value jsonb NOT NULL, -- flexible JSON value
  created_at timestamptz DEFAULT now()
);

-- Create offers table (to store generated offers)
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  borrower_id uuid REFERENCES borrowers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  rank_order int,
  match_score numeric(4,2) DEFAULT 100, -- for future weighted scoring
  generated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_borrower_drafts_session ON borrower_drafts(session_id);
CREATE INDEX IF NOT EXISTS idx_borrower_drafts_mobile ON borrower_drafts(mobile);
CREATE INDEX IF NOT EXISTS idx_borrowers_mobile ON borrowers(mobile);
CREATE INDEX IF NOT EXISTS idx_product_rules_product_id ON product_rules(product_id);
CREATE INDEX IF NOT EXISTS idx_product_rules_key ON product_rules(rule_key);
CREATE INDEX IF NOT EXISTS idx_offers_borrower_id ON offers(borrower_id);
CREATE INDEX IF NOT EXISTS idx_offers_rank ON offers(borrower_id, rank_order);

-- Enable Row Level Security (RLS)
ALTER TABLE borrower_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE lenders ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Borrower drafts: anyone can insert, only owner can read/update
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'borrower_drafts' AND policyname = 'Anyone can create drafts') THEN
    CREATE POLICY "Anyone can create drafts" ON borrower_drafts FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'borrower_drafts' AND policyname = 'Users can read own drafts') THEN
    CREATE POLICY "Users can read own drafts" ON borrower_drafts FOR SELECT USING (session_id = current_setting('app.session_id', true));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'borrower_drafts' AND policyname = 'Users can update own drafts') THEN
    CREATE POLICY "Users can update own drafts" ON borrower_drafts FOR UPDATE USING (session_id = current_setting('app.session_id', true));
  END IF;
END $$;

-- Borrowers: only authenticated users can see their own data
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'borrowers' AND policyname = 'Users can read own data') THEN
    CREATE POLICY "Users can read own data" ON borrowers FOR SELECT USING (id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'borrowers' AND policyname = 'Users can insert own data') THEN
    CREATE POLICY "Users can insert own data" ON borrowers FOR INSERT WITH CHECK (id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'borrowers' AND policyname = 'Users can update own data') THEN
    CREATE POLICY "Users can update own data" ON borrowers FOR UPDATE USING (id = auth.uid());
  END IF;
END $$;

-- Products & lenders: public read access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Public read access') THEN
    CREATE POLICY "Public read access" ON products FOR SELECT USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lenders' AND policyname = 'Public read access') THEN
    CREATE POLICY "Public read access" ON lenders FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- Product rules: public read for active products
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_rules' AND policyname = 'Public read rules') THEN
    CREATE POLICY "Public read rules" ON product_rules FOR SELECT USING (
      EXISTS (SELECT 1 FROM products WHERE products.id = product_rules.product_id AND products.is_active = true)
    );
  END IF;
END $$;

-- Offers: users can only see their own offers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offers' AND policyname = 'Users can read own offers') THEN
    CREATE POLICY "Users can read own offers" ON offers FOR SELECT USING (
      EXISTS (SELECT 1 FROM borrowers WHERE borrowers.id = offers.borrower_id AND borrowers.id = auth.uid())
    );
  END IF;
END $$;

-- Admin policies (for users with admin role)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Admins can manage products') THEN
    CREATE POLICY "Admins can manage products" ON products FOR ALL USING (
      EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lenders' AND policyname = 'Admins can manage lenders') THEN
    CREATE POLICY "Admins can manage lenders" ON lenders FOR ALL USING (
      EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_rules' AND policyname = 'Admins can manage rules') THEN
    CREATE POLICY "Admins can manage rules" ON product_rules FOR ALL USING (
      EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'borrowers' AND policyname = 'Admins can read all borrowers') THEN
    CREATE POLICY "Admins can read all borrowers" ON borrowers FOR SELECT USING (
      EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin')
    );
  END IF;
END $$;

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at (with IF NOT EXISTS checks)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_borrower_drafts_updated_at') THEN
    CREATE TRIGGER update_borrower_drafts_updated_at BEFORE UPDATE ON borrower_drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_borrowers_updated_at') THEN
    CREATE TRIGGER update_borrowers_updated_at BEFORE UPDATE ON borrowers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;