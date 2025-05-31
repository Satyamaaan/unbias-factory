-- Function to move draft data to borrowers table after OTP verification
CREATE OR REPLACE FUNCTION finalize_draft(
  draft_data jsonb,
  auth_user_id uuid
) RETURNS uuid AS $$
DECLARE
  new_borrower_id uuid;
BEGIN
  -- Insert into borrowers table
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
  -- Log error and re-raise
  RAISE LOG 'Error in finalize_draft: %', SQLERRM;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION finalize_draft TO authenticated;