-- Complete Unbias Lending Database Schema
-- Migration: 001_initial_schema.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create borrower_drafts table (before OTP verification)
CREATE TABLE borrower_drafts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id text UNIQUE, -- for anonymous sessions
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
CREATE TABLE borrowers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id uuid, -- Supabase auth user ID
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
  consent_ts timestamptz,
  verified boolean DEFAULT true,
  status text DEFAULT 'offers_generated',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_rules table (for flexible eligibility rules)
CREATE TABLE product_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  rule_key text NOT NULL, -- 'min_age', 'max_foir', 'employment_types', etc.
  rule_value jsonb NOT NULL, -- flexible JSON value
  created_at timestamptz DEFAULT now()
);

-- Create offers table (to store generated offers)
CREATE TABLE offers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  borrower_id uuid REFERENCES borrowers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  rank_order int,
  match_score numeric(4,2) DEFAULT 100, -- for future weighted scoring
  generated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_borrower_drafts_session ON borrower_drafts(session_id);
CREATE INDEX idx_borrower_drafts_mobile ON borrower_drafts(mobile);
CREATE INDEX idx_borrowers_auth_id ON borrowers(auth_id);
CREATE INDEX idx_borrowers_mobile ON borrowers(mobile);
CREATE INDEX idx_product_rules_product_id ON product_rules(product_id);
CREATE INDEX idx_product_rules_key ON product_rules(rule_key);
CREATE INDEX idx_offers_borrower_id ON offers(borrower_id);
CREATE INDEX idx_offers_rank ON offers(borrower_id, rank_order);

-- Enable Row Level Security (RLS)
ALTER TABLE borrower_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE lenders ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Borrower drafts: anyone can insert, only owner can read/update
CREATE POLICY "Anyone can create drafts" ON borrower_drafts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read own drafts" ON borrower_drafts FOR SELECT USING (session_id = current_setting('app.session_id', true));
CREATE POLICY "Users can update own drafts" ON borrower_drafts FOR UPDATE USING (session_id = current_setting('app.session_id', true));

-- Borrowers: only authenticated users can see their own data
CREATE POLICY "Users can read own data" ON borrowers FOR SELECT USING (auth_id = auth.uid());
CREATE POLICY "Users can insert own data" ON borrowers FOR INSERT WITH CHECK (auth_id = auth.uid());
CREATE POLICY "Users can update own data" ON borrowers FOR UPDATE USING (auth_id = auth.uid());

-- Products & lenders: public read access
CREATE POLICY "Public read access" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access" ON lenders FOR SELECT USING (is_active = true);

-- Product rules: public read for active products
CREATE POLICY "Public read rules" ON product_rules FOR SELECT USING (
  EXISTS (SELECT 1 FROM products WHERE products.id = product_rules.product_id AND products.is_active = true)
);

-- Offers: users can only see their own offers
CREATE POLICY "Users can read own offers" ON offers FOR SELECT USING (
  EXISTS (SELECT 1 FROM borrowers WHERE borrowers.id = offers.borrower_id AND borrowers.auth_id = auth.uid())
);

-- Admin policies (for users with admin role)
CREATE POLICY "Admins can manage products" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin')
);

CREATE POLICY "Admins can manage lenders" ON lenders FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin')
);

CREATE POLICY "Admins can manage rules" ON product_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin')
);

CREATE POLICY "Admins can read all borrowers" ON borrowers FOR SELECT USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin')
);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_borrower_drafts_updated_at BEFORE UPDATE ON borrower_drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_borrowers_updated_at BEFORE UPDATE ON borrowers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();