-- Migration: 002_add_missing_tables_and_functions.sql
-- Adds lenders, products tables, core SQL functions for comparison engine, and test data.

-- 1. Create lenders table
CREATE TABLE IF NOT EXISTS lenders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  lender_type text, -- e.g., 'Public Sector Bank', 'Private Sector Bank', 'NBFC-HFC'
  website text,
  logo_url text, -- URL to lender's logo
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Apply RLS policies
ALTER TABLE lenders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lenders' AND policyname = 'Public read access for lenders') THEN
    CREATE POLICY "Public read access for lenders" ON lenders FOR SELECT USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lenders' AND policyname = 'Admins can manage lenders') THEN
    CREATE POLICY "Admins can manage lenders" ON lenders FOR ALL USING (
      EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin')
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin')
    );
  END IF;
END $$;


-- 2. Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lender_id uuid REFERENCES lenders(id) ON DELETE CASCADE,
  product_code text, -- Internal product code or ID from lender
  name text NOT NULL,
  description text,
  
  loan_purpose_eligibility text[], 
  target_borrower_segment text[], 
  
  interest_rate_type text, 
  interest_rate_min numeric(5,2) NOT NULL, 
  interest_rate_max numeric(5,2), 
  benchmark_rate_name text, 
  spread_margin numeric(4,2),
  
  min_loan_amount numeric DEFAULT 0,
  max_loan_amount numeric,
  
  min_loan_tenure_years int DEFAULT 1,
  max_loan_tenure_years int DEFAULT 30,
  
  processing_fee_type text, 
  processing_fee_value numeric, 
  processing_fee_min_amount numeric,
  processing_fee_max_amount numeric,
  
  prepayment_charges_text text, 
  
  min_age_years int DEFAULT 18, 
  max_age_at_origination_years int DEFAULT 65, 
  max_age_at_maturity_years int DEFAULT 75, 
  
  min_net_monthly_income numeric,
  min_work_experience_years_salaried int,
  min_business_vintage_years_self_emp int,
  
  min_credit_score int DEFAULT 0,
  
  max_foir numeric(4,2) CHECK (max_foir IS NULL OR (max_foir >= 0 AND max_foir <= 1)), 
  
  acceptable_co_applicants text[],
  
  max_ltv_ratio_tier1 numeric(5,2) CHECK (max_ltv_ratio_tier1 IS NULL OR (max_ltv_ratio_tier1 >= 0 AND max_ltv_ratio_tier1 <= 100)), 
  
  acceptable_property_types text[], 
  max_property_age_years int,
  approved_locations text[], 
  
  is_active boolean DEFAULT true,
  last_updated_date date DEFAULT current_date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for products table
CREATE INDEX IF NOT EXISTS idx_products_lender_id ON products(lender_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_interest_rate_min ON products(interest_rate_min);
CREATE INDEX IF NOT EXISTS idx_products_min_loan_amount ON products(min_loan_amount);
CREATE INDEX IF NOT EXISTS idx_products_min_age_years ON products(min_age_years);
CREATE INDEX IF NOT EXISTS idx_products_min_credit_score ON products(min_credit_score);
CREATE INDEX IF NOT EXISTS idx_products_target_borrower_segment_gin ON products USING GIN (target_borrower_segment);
CREATE INDEX IF NOT EXISTS idx_products_approved_locations_gin ON products USING GIN (approved_locations);

-- Apply RLS policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Public read access for products') THEN
    CREATE POLICY "Public read access for products" ON products FOR SELECT USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Admins can manage products') THEN
    CREATE POLICY "Admins can manage products" ON products FOR ALL USING (
      EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin')
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin')
    );
  END IF;
END $$;

-- Add cibil_score to borrowers table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='borrowers' AND column_name='cibil_score') THEN
    ALTER TABLE public.borrowers ADD COLUMN cibil_score INT;
  END IF;
END $$;

-- 3. Create eval_rule helper function
CREATE OR REPLACE FUNCTION eval_rule(rule product_rules, b_json jsonb)
RETURNS boolean AS $$
DECLARE
  rule_val_text text;
  rule_val_int int;
  rule_val_numeric numeric;
  rule_val_array text[];
  borrower_val_text text;
  borrower_val_int int;
  borrower_val_numeric numeric;

BEGIN
  -- Extract borrower values from JSONB
  borrower_val_int := (b_json->>'age')::int; -- Assuming age is always present
  borrower_val_numeric := (b_json->>'monthly_income')::numeric; -- Assuming monthly_income is always present
  borrower_val_text := lower(b_json->>'employment_type');

  BEGIN
    CASE rule.rule_key
      WHEN 'min_age' THEN
        rule_val_int := (rule.rule_value#>>'{}')::int;
        RETURN borrower_val_int >= rule_val_int;
      WHEN 'max_age_at_origination' THEN
        rule_val_int := (rule.rule_value#>>'{}')::int;
        RETURN borrower_val_int <= rule_val_int;
      WHEN 'min_net_monthly_income' THEN
        rule_val_numeric := (rule.rule_value#>>'{}')::numeric;
        RETURN borrower_val_numeric >= rule_val_numeric;
      WHEN 'max_foir' THEN
        rule_val_numeric := (rule.rule_value#>>'{}')::numeric;
        RETURN (b_json->>'foir')::numeric <= rule_val_numeric;
      WHEN 'employment_types' THEN
        SELECT array_agg(lower(elem->>0)) INTO rule_val_array FROM jsonb_array_elements_text(COALESCE(rule.rule_value, '[]'::jsonb)) elem;
        RETURN borrower_val_text = ANY (rule_val_array);
      WHEN 'property_types' THEN
        SELECT array_agg(lower(elem->>0)) INTO rule_val_array FROM jsonb_array_elements_text(COALESCE(rule.rule_value, '[]'::jsonb)) elem;
        RETURN lower(b_json->>'property_type') = ANY (rule_val_array);
      WHEN 'approved_locations' THEN
        SELECT array_agg(lower(elem->>0)) INTO rule_val_array FROM jsonb_array_elements_text(COALESCE(rule.rule_value, '[]'::jsonb)) elem;
        RETURN lower(b_json->>'city') = ANY (rule_val_array);
      WHEN 'min_credit_score' THEN
        rule_val_int := (rule.rule_value#>>'{}')::int;
        RETURN COALESCE((b_json->>'cibil_score')::int, 0) >= rule_val_int;
      WHEN 'max_ltv_ratio' THEN
        rule_val_numeric := (rule.rule_value#>>'{}')::numeric;
        RETURN (b_json->>'loan_amount_required')::numeric <= (rule_val_numeric / 100.0) * (b_json->>'property_value_est')::numeric;
      ELSE
        RETURN true; 
    END CASE;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'Error evaluating rule_key % (product_id: %) for borrower_json % due to: %', rule.rule_key, rule.product_id, b_json, SQLERRM;
    RETURN false; 
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 4. Create match_products function
CREATE OR REPLACE FUNCTION match_products(input_borrower_id uuid)
RETURNS TABLE(
  product_id uuid,
  lender_name text,
  product_name text,
  interest_rate_min numeric(5,2),
  processing_fee_value numeric,
  processing_fee_type text,
  max_ltv_ratio_tier1 numeric(5,2),
  min_loan_amount numeric,
  max_loan_amount numeric,
  target_borrower_segment text[]
) AS $$
DECLARE
  b_record borrowers;
  b_json jsonb;
  borrower_age int;
  borrower_monthly_income numeric;
  borrower_foir numeric;
BEGIN
  SELECT * INTO b_record FROM public.borrowers WHERE id = input_borrower_id;
  IF NOT FOUND THEN
    RAISE WARNING 'Borrower with id % not found.', input_borrower_id;
    RETURN;
  END IF;

  borrower_age := date_part('year', age(b_record.dob))::int;

  IF lower(COALESCE(b_record.employment_type, '')) = 'salaried' THEN
    borrower_monthly_income := COALESCE(b_record.gross_salary, 0);
  ELSIF lower(COALESCE(b_record.employment_type, '')) LIKE 'self_employed%' OR lower(COALESCE(b_record.employment_type, '')) LIKE 'self-employed%' THEN
    borrower_monthly_income := COALESCE(b_record.annual_net_profit, 0) / 12.0;
  ELSE
    borrower_monthly_income := COALESCE(b_record.gross_salary, COALESCE(b_record.annual_net_profit,0)/12.0, 0); -- Fallback or default
  END IF;

  IF borrower_monthly_income > 0 THEN
    borrower_foir := COALESCE(b_record.existing_emi, 0) / borrower_monthly_income;
  ELSE
    borrower_foir := 1.0; 
  END IF;

  b_json := jsonb_build_object(
    'age', borrower_age,
    'monthly_income', borrower_monthly_income,
    'foir', borrower_foir,
    'employment_type', lower(COALESCE(b_record.employment_type, '')),
    'property_type', lower(COALESCE(b_record.property_type, '')),
    'city', lower(COALESCE(b_record.city, '')),
    'cibil_score', COALESCE(b_record.cibil_score, 0),
    'loan_amount_required', COALESCE(b_record.loan_amount_required, 0),
    'property_value_est', COALESCE(b_record.property_value_est, 0)
  );

  RAISE LOG 'Matching for borrower_id: %, JSON: %', input_borrower_id, b_json;

  RETURN QUERY
  SELECT
    p.id,
    l.name,
    p.name,
    p.interest_rate_min,
    p.processing_fee_value,
    p.processing_fee_type,
    p.max_ltv_ratio_tier1,
    p.min_loan_amount,
    p.max_loan_amount,
    p.target_borrower_segment
  FROM products p
  JOIN lenders l ON l.id = p.lender_id
  WHERE
    p.is_active = true AND l.is_active = true
    AND COALESCE(b_record.loan_amount_required, 0) >= COALESCE(p.min_loan_amount, 0)
    AND COALESCE(b_record.loan_amount_required, 0) <= COALESCE(p.max_loan_amount, COALESCE(b_record.loan_amount_required, 0) * 1000) -- Effective no upper limit if p.max_loan_amount is null
    AND borrower_age >= COALESCE(p.min_age_years, 0)
    AND borrower_age <= COALESCE(p.max_age_at_origination_years, 100)
    AND (borrower_age + COALESCE(p.min_loan_tenure_years, 0)) <= COALESCE(p.max_age_at_maturity_years, 100)
    AND borrower_monthly_income >= COALESCE(p.min_net_monthly_income, 0)
    AND COALESCE(b_record.cibil_score, 0) >= COALESCE(p.min_credit_score, 0)
    AND borrower_foir <= COALESCE(p.max_foir, 1.0)
    AND (COALESCE(b_record.property_value_est, 0) = 0 OR (COALESCE(b_record.loan_amount_required,0) / b_record.property_value_est * 100.0) <= COALESCE(p.max_ltv_ratio_tier1, 100.0))
    AND (p.target_borrower_segment IS NULL OR array_length(p.target_borrower_segment,1) IS NULL OR lower(COALESCE(b_record.employment_type,'')) = ANY (SELECT lower(ts) FROM unnest(p.target_borrower_segment) AS ts))
    AND (p.acceptable_property_types IS NULL OR array_length(p.acceptable_property_types,1) IS NULL OR lower(COALESCE(b_record.property_type,'')) = ANY (SELECT lower(apt) FROM unnest(p.acceptable_property_types) AS apt))
    AND (p.approved_locations IS NULL OR array_length(p.approved_locations,1) IS NULL OR lower(COALESCE(b_record.city,'')) = ANY (SELECT lower(al) FROM unnest(p.approved_locations) AS al))
    AND NOT EXISTS (
      SELECT 1
      FROM product_rules pr
      WHERE pr.product_id = p.id
      AND eval_rule(pr, b_json) = false
    )
  ORDER BY
    p.interest_rate_min ASC,
    CASE 
      WHEN p.processing_fee_type = 'Percentage' THEN (COALESCE(p.processing_fee_value,0)/100.0) * COALESCE(b_record.loan_amount_required,0)
      WHEN p.processing_fee_type = 'FixedAmount' THEN COALESCE(p.processing_fee_value,0)
      ELSE 0 
    END ASC
  LIMIT 20;

END;
$$ LANGUAGE plpgsql;


-- 5. Sample test data for borrowers
INSERT INTO public.borrowers (id, full_name, journey_stage, property_type, property_value_est, city, pincode, loan_amount_required, dob, employment_type, gross_salary, annual_net_profit, other_income, existing_emi, has_coapplicant, mobile, consent_ts, verified, status, cibil_score, monthly_net_income, created_at, updated_at)
VALUES
(
  '11111111-1111-1111-1111-111111111111', 
  'Test User One',
  'exploring_options', 
  'apartment', 
  7500000, 
  'bangalore', 
  '560001', 
  5000000, 
  '1990-01-01', 
  'salaried', 
  100000, 
  NULL, -- annual_net_profit
  10000,  
  20000,  
  false, 
  '9876500001', 
  now(), 
  true, 
  'draft',
  750,
  100000, -- monthly_net_income (same as gross_salary for salaried)
  now(),
  now()
),
(
  '22222222-2222-2222-2222-222222222222', 
  'Test User Two',
  'ready_to_apply', 
  'independent_house', 
  10000000, 
  'mumbai', 
  '400001', 
  7000000, 
  '1985-05-15', 
  'self_employed_professional', 
  NULL,   
  1500000, -- annual_net_profit
  25000,  
  30000,  
  true, 
  '9876500002', 
  now(), 
  true, 
  'draft',
  780,
  125000, -- monthly_net_income (annual_net_profit / 12)
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Update itr_years for self-employed test borrower if needed
UPDATE public.borrowers SET itr_years = 5 WHERE id = '22222222-2222-2222-2222-222222222222' AND employment_type = 'self_employed_professional';


-- 6. Sample lender and product data for testing
DO $$
DECLARE
  lender_a_id uuid;
  lender_b_id uuid;
  product_alpha_id uuid;
  product_beta_id uuid;
BEGIN
  INSERT INTO lenders (name, lender_type, website, is_active) VALUES
  ('Test Bank A', 'Private Sector Bank', 'http://testbanka.com', true)
  ON CONFLICT (name) DO NOTHING;
  SELECT id INTO lender_a_id FROM lenders WHERE name = 'Test Bank A';

  INSERT INTO lenders (name, lender_type, website, is_active) VALUES
  ('Test Bank B', 'NBFC-HFC', 'http://testbankb.com', true)
  ON CONFLICT (name) DO NOTHING;
  SELECT id INTO lender_b_id FROM lenders WHERE name = 'Test Bank B';

  IF lender_a_id IS NOT NULL THEN
    INSERT INTO products (
      lender_id, name, interest_rate_min, interest_rate_type,
      min_loan_amount, max_loan_amount, min_loan_tenure_years, max_loan_tenure_years,
      processing_fee_type, processing_fee_value,
      min_age_years, max_age_at_origination_years, max_age_at_maturity_years,
      min_net_monthly_income, min_credit_score, max_foir, max_ltv_ratio_tier1,
      target_borrower_segment, acceptable_property_types, approved_locations, is_active
    ) VALUES (
      lender_a_id, 'Product Alpha Salaried Special', 8.50, 'Floating',
      1000000, 100000000, 5, 30,
      'Percentage', 0.5, 
      23, 60, 70,
      75000, 720, 0.50, 80.00,
      '{"salaried"}', '{"apartment", "independent_house"}', '{"bangalore", "chennai", "pune"}', true
    ) ON CONFLICT (name) WHERE lender_id = lender_a_id DO NOTHING; -- Assuming product name unique per lender
    SELECT id INTO product_alpha_id FROM products WHERE name = 'Product Alpha Salaried Special' AND lender_id = lender_a_id;
  END IF;

  IF lender_b_id IS NOT NULL THEN
    INSERT INTO products (
      lender_id, name, interest_rate_min, interest_rate_type,
      min_loan_amount, max_loan_amount, min_loan_tenure_years, max_loan_tenure_years,
      processing_fee_type, processing_fee_value,
      min_age_years, max_age_at_origination_years, max_age_at_maturity_years,
      min_net_monthly_income, min_credit_score, max_foir, max_ltv_ratio_tier1,
      target_borrower_segment, acceptable_property_types, approved_locations, is_active
    ) VALUES (
      lender_b_id, 'Product Beta SelfEmployed Pro', 9.25, 'Fixed',
      2000000, 75000000, 5, 25,
      'FixedAmount', 10000, 
      25, 62, 75,
      100000, 750, 0.55, 85.00,
      '{"self_employed_professional", "self_employed_non_professional"}', '{"independent_house", "villa"}', '{"mumbai", "delhi", "hyderabad"}', true
    ) ON CONFLICT (name) WHERE lender_id = lender_b_id DO NOTHING;
    SELECT id INTO product_beta_id FROM products WHERE name = 'Product Beta SelfEmployed Pro' AND lender_id = lender_b_id;
  END IF;

  IF product_alpha_id IS NOT NULL THEN
    INSERT INTO product_rules (product_id, rule_key, rule_value) VALUES
    (product_alpha_id, 'min_credit_score', '730'::jsonb),
    (product_alpha_id, 'approved_locations', '["bangalore"]'::jsonb)
    ON CONFLICT (product_id, rule_key) DO UPDATE SET rule_value = EXCLUDED.rule_value;
  END IF;

  IF product_beta_id IS NOT NULL THEN
    INSERT INTO product_rules (product_id, rule_key, rule_value) VALUES
    (product_beta_id, 'max_foir', '0.50'::jsonb), 
    (product_beta_id, 'min_business_vintage_years_self_emp', '3'::jsonb) -- Note: eval_rule needs to handle this key
    ON CONFLICT (product_id, rule_key) DO UPDATE SET rule_value = EXCLUDED.rule_value;
  END IF;

END $$;

-- Set updated_at triggers for new tables
CREATE TRIGGER update_lenders_updated_at BEFORE UPDATE ON lenders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
