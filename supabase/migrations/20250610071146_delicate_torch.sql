/*
  # Fix borrowers table schema

  1. Schema Updates
    - Ensure `full_name` column exists in `borrowers` table
    - Ensure `monthly_net_income` column exists in `borrowers` table
    - Ensure `pincode` column exists in `borrowers` table
    - Add any other missing columns from the original schema

  2. Function Updates
    - Update `finalize_draft` function to handle all required fields properly
    - Ensure proper error handling and data validation

  3. Data Migration
    - Update existing records to populate `monthly_net_income` based on employment type
*/

-- Add missing columns to borrowers table if they don't exist
DO $$
BEGIN
  -- Add full_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'borrowers' 
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.borrowers ADD COLUMN full_name text;
  END IF;

  -- Add monthly_net_income column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'borrowers' 
    AND column_name = 'monthly_net_income'
  ) THEN
    ALTER TABLE public.borrowers ADD COLUMN monthly_net_income numeric;
  END IF;

  -- Add pincode column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'borrowers' 
    AND column_name = 'pincode'
  ) THEN
    ALTER TABLE public.borrowers ADD COLUMN pincode text;
  END IF;

  -- Add other_income column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'borrowers' 
    AND column_name = 'other_income'
  ) THEN
    ALTER TABLE public.borrowers ADD COLUMN other_income numeric DEFAULT 0;
  END IF;

  -- Add itr_years column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'borrowers' 
    AND column_name = 'itr_years'
  ) THEN
    ALTER TABLE public.borrowers ADD COLUMN itr_years int;
  END IF;

  -- Add has_coapplicant column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'borrowers' 
    AND column_name = 'has_coapplicant'
  ) THEN
    ALTER TABLE public.borrowers ADD COLUMN has_coapplicant boolean;
  END IF;

  -- Add journey_stage column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'borrowers' 
    AND column_name = 'journey_stage'
  ) THEN
    ALTER TABLE public.borrowers ADD COLUMN journey_stage text;
  END IF;

  -- Add consent_ts column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'borrowers' 
    AND column_name = 'consent_ts'
  ) THEN
    ALTER TABLE public.borrowers ADD COLUMN consent_ts timestamptz;
  END IF;
END $$;

-- Update monthly_net_income for existing records where it's null
UPDATE public.borrowers 
SET monthly_net_income = CASE 
  WHEN LOWER(employment_type) = 'salaried' THEN COALESCE(gross_salary, 0)
  WHEN LOWER(employment_type) LIKE 'self_employed%' OR LOWER(employment_type) LIKE 'self-employed%' THEN COALESCE(annual_net_profit, 0) / 12
  ELSE COALESCE(gross_salary, COALESCE(annual_net_profit, 0) / 12, 0)
END
WHERE monthly_net_income IS NULL;

-- Update the finalize_draft function with proper error handling and all fields
CREATE OR REPLACE FUNCTION finalize_draft(
  draft_data jsonb,
  auth_user_id uuid
) RETURNS uuid AS $$
DECLARE
  new_borrower_id uuid;
BEGIN
  -- Insert into borrowers table with the user's auth ID as the primary key
  INSERT INTO borrowers (
    id,
    full_name,
    dob,
    employment_type,
    monthly_net_income,
    existing_emi,
    property_type,
    property_value_est,
    city,
    pincode,
    loan_amount_required,
    mobile,
    gross_salary,
    other_income,
    annual_net_profit,
    itr_years,
    has_coapplicant,
    journey_stage,
    consent_ts,
    verified,
    status,
    created_at
  ) VALUES (
    auth_user_id,
    COALESCE(draft_data->>'full_name', 'Not provided'),
    CASE 
      WHEN draft_data->>'dob' IS NOT NULL AND draft_data->>'dob' != '' 
      THEN (draft_data->>'dob')::date 
      ELSE NULL 
    END,
    draft_data->>'employment_type',
    CASE 
      WHEN draft_data->>'employment_type' = 'salaried' 
      THEN COALESCE((draft_data->>'gross_salary')::numeric, 0)
      ELSE COALESCE((draft_data->>'annual_net_profit')::numeric, 0) / 12
    END,
    COALESCE((draft_data->>'existing_emi')::numeric, 0),
    draft_data->>'property_type',
    COALESCE((draft_data->>'property_value_est')::numeric, 0),
    draft_data->>'city',
    draft_data->>'pincode',
    COALESCE((draft_data->>'loan_amount_required')::numeric, 0),
    draft_data->>'mobile',
    COALESCE((draft_data->>'gross_salary')::numeric, 0),
    COALESCE((draft_data->>'other_income')::numeric, 0),
    COALESCE((draft_data->>'annual_net_profit')::numeric, 0),
    COALESCE((draft_data->>'itr_years')::int, 0),
    COALESCE((draft_data->>'has_coapplicant')::boolean, false),
    COALESCE(draft_data->>'journey_stage', 'offers_generated'),
    COALESCE((draft_data->>'consent_ts')::timestamptz, now()),
    true,
    'offers_generated',
    now()
  ) 
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    dob = EXCLUDED.dob,
    employment_type = EXCLUDED.employment_type,
    monthly_net_income = EXCLUDED.monthly_net_income,
    existing_emi = EXCLUDED.existing_emi,
    property_type = EXCLUDED.property_type,
    property_value_est = EXCLUDED.property_value_est,
    city = EXCLUDED.city,
    pincode = EXCLUDED.pincode,
    loan_amount_required = EXCLUDED.loan_amount_required,
    mobile = EXCLUDED.mobile,
    gross_salary = EXCLUDED.gross_salary,
    other_income = EXCLUDED.other_income,
    annual_net_profit = EXCLUDED.annual_net_profit,
    itr_years = EXCLUDED.itr_years,
    has_coapplicant = EXCLUDED.has_coapplicant,
    journey_stage = EXCLUDED.journey_stage,
    consent_ts = EXCLUDED.consent_ts,
    verified = EXCLUDED.verified,
    status = EXCLUDED.status,
    updated_at = now()
  RETURNING id INTO new_borrower_id;
  
  -- Return the borrower ID
  RETURN new_borrower_id;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error with more details
  RAISE LOG 'Error in finalize_draft for user %: % - %', auth_user_id, SQLSTATE, SQLERRM;
  RAISE EXCEPTION 'Failed to finalize draft: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the function has proper permissions
GRANT EXECUTE ON FUNCTION finalize_draft TO authenticated;