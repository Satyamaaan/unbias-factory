-- Function to move draft data to borrowers table after OTP verification
CREATE OR REPLACE FUNCTION finalize_draft(
  draft_data jsonb,
  auth_user_id uuid
) RETURNS uuid AS $$
DECLARE
  new_borrower_id uuid;
  existing_borrower RECORD;
BEGIN
  -- Check if borrower already exists
  SELECT id INTO existing_borrower FROM borrowers WHERE id = auth_user_id;
  
  IF existing_borrower IS NOT NULL THEN
    -- Update existing borrower with new data
    UPDATE borrowers SET
      full_name = COALESCE(draft_data->>'full_name', full_name),
      dob = COALESCE((draft_data->>'dob')::date, dob),
      employment_type = COALESCE(draft_data->>'employment_type', employment_type),
      monthly_net_income = CASE 
        WHEN draft_data->>'employment_type' = 'salaried' 
        THEN COALESCE((draft_data->>'gross_salary')::numeric, monthly_net_income)
        ELSE COALESCE((draft_data->>'annual_net_profit')::numeric / 12, monthly_net_income)
      END,
      existing_emi = COALESCE((draft_data->>'existing_emi')::numeric, existing_emi),
      property_type = COALESCE(draft_data->>'property_type', property_type),
      property_value_est = COALESCE((draft_data->>'property_value_est')::numeric, property_value_est),
      city = COALESCE(draft_data->>'city', city),
      loan_amount_required = COALESCE((draft_data->>'loan_amount_required')::numeric, loan_amount_required),
      mobile = COALESCE(draft_data->>'mobile', mobile),
      gross_salary = COALESCE((draft_data->>'gross_salary')::numeric, gross_salary),
      annual_net_profit = COALESCE((draft_data->>'annual_net_profit')::numeric, annual_net_profit),
      verified = true,
      updated_at = now()
    WHERE id = auth_user_id
    RETURNING id INTO new_borrower_id;
    
    RETURN new_borrower_id;
  END IF;
  
  -- Insert new borrower if doesn't exist
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
  ) RETURNING id INTO new_borrower_id;
  
  -- Return the borrower ID
  RETURN new_borrower_id;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error and return the auth_user_id as fallback
  RAISE LOG 'Error in finalize_draft: %', SQLERRM;
  RETURN auth_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION finalize_draft TO authenticated;