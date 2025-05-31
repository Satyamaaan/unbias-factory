-- Fix schema compatibility issues
-- Migration: 004_fix_schema_compatibility.sql

-- Add missing full_name column to borrower_drafts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='borrower_drafts' AND column_name='full_name') THEN
    ALTER TABLE public.borrower_drafts ADD COLUMN full_name text;
  END IF;
END $$;

-- Add missing monthly_net_income column to borrowers if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='borrowers' AND column_name='monthly_net_income') THEN
    ALTER TABLE public.borrowers ADD COLUMN monthly_net_income numeric;
  END IF;
END $$;

-- Update the monthly_net_income column based on employment type for existing records
UPDATE public.borrowers 
SET monthly_net_income = CASE 
  WHEN LOWER(employment_type) = 'salaried' THEN COALESCE(gross_salary, 0)
  WHEN LOWER(employment_type) LIKE 'self_employed%' OR LOWER(employment_type) LIKE 'self-employed%' THEN COALESCE(annual_net_profit, 0) / 12
  ELSE COALESCE(gross_salary, COALESCE(annual_net_profit, 0) / 12, 0)
END
WHERE monthly_net_income IS NULL;

-- Fix the finalize_draft function to handle the updated schema
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
    loan_amount_required,
    mobile,
    gross_salary,
    annual_net_profit,
    verified,
    created_at
  ) VALUES (
    auth_user_id,
    COALESCE(draft_data->>'full_name', 'Not provided'),
    (draft_data->>'dob')::date,
    draft_data->>'employment_type',
    CASE 
      WHEN draft_data->>'employment_type' = 'salaried' 
      THEN (draft_data->>'gross_salary')::numeric
      ELSE (draft_data->>'annual_net_profit')::numeric / 12
    END,
    COALESCE((draft_data->>'existing_emi')::numeric, 0),
    draft_data->>'property_type',
    (draft_data->>'property_value_est')::numeric,
    draft_data->>'city',
    (draft_data->>'loan_amount_required')::numeric,
    draft_data->>'mobile',
    (draft_data->>'gross_salary')::numeric,
    (draft_data->>'annual_net_profit')::numeric,
    true,
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
    loan_amount_required = EXCLUDED.loan_amount_required,
    mobile = EXCLUDED.mobile,
    gross_salary = EXCLUDED.gross_salary,
    annual_net_profit = EXCLUDED.annual_net_profit,
    verified = EXCLUDED.verified,
    updated_at = now()
  RETURNING id INTO new_borrower_id;
  
  -- Return the borrower ID
  RETURN new_borrower_id;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error and re-raise
  RAISE LOG 'Error in finalize_draft: %', SQLERRM;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
