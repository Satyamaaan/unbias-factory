# Unbias Lending – Comparison Engine v2  
*(File: unbias-lending-comparison-engine-v2.md · 29 May 2025)*  

---

## 1. Scope  
Design a production-ready comparison engine that ingests **indian_home_loan_products(1).csv** into Supabase, evaluates a borrower’s onboarding answers, and returns a list of **eligible** home-loan products, sorted by interest rate and processing fee. No match-percentage scoring for MVP.

---

## 2. CSV Structure – Key Fields  

| Group | Column(s) | Notes for Matching |
|-------|-----------|--------------------|
| Identity | `LenderID`, `LenderName`, `ProductID`, `ProductName` | unique IDs |
| Rates | `InterestRateType`, `MinInterestRate`, `MaxInterestRate` | select min for ordering |
| Amount / Tenure | `MinLoanAmount`, `MaxLoanAmount`, `MinLoanTenureYears`, `MaxLoanTenureYears` | check loan_amount_required |
| Borrower Age | `MinAgeYears`, `MaxAgeAtOriginationYears` | compare with borrower age |
| Income / FOIR | `MinNetMonthlyIncome`, `MaxFOIR`, `MaxDTI` | check salary / net profit & FOIR |
| Employment | `TargetBorrowerSegment` | comma-separated list (Salaried, Self-Employed…) |
| Credit | `MinCreditScore` | later when CIBIL integrated (skip for now) |
| Property | `AcceptablePropertyTypes`, `MaxPropertyAgeYears`, `ApprovedLocations` | match property_type, city |
| LTV | `MaxLTVRatioTier1` (primary city limit) | compute against property value |
| Co-Applicant | `AcceptableCoApplicants` | only informational for now |
| Fees | `ProcessingFeeType`, `ProcessingFeeValue` | convert to numeric fee for sorting |

---

## 3. Supabase Schema  

### 3.1 Tables  

```
lenders (id uuid PK, name text, type text, website text)

products (
  id uuid PK,
  lender_id uuid FK,
  name text,
  interest_rate_min numeric(4,2),
  interest_rate_max numeric(4,2),
  interest_rate_type text,
  min_loan_amount numeric,
  max_loan_amount numeric,
  min_tenure int,
  max_tenure int,
  max_ltv numeric(4,2),
  min_age int,
  max_age int,
  min_income numeric,
  max_foir numeric,
  borrower_segments text[],      -- parsed from CSV
  property_types text[],         -- array
  approved_cities text[],        -- lower-case names
  processing_fee numeric,        -- absolute ₹
  is_active bool default true
)
```

### 3.2 Supabase Import Script  

```bash
supabase db remote set <url>
supabase db dump --schema-only  # ensure schema

# CSV -> temp table
CREATE TEMP TABLE import_raw (... all 60 columns text);

\copy import_raw FROM 'indian_home_loan_products(1).csv' WITH CSV HEADER;

INSERT INTO lenders (id,name,type,website)
SELECT DISTINCT uuid_generate_v4(), "LenderName", "LenderType", "LenderWebsite"
FROM import_raw
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (id,lender_id,name,interest_rate_min,interest_rate_max,
  interest_rate_type,min_loan_amount,max_loan_amount,min_tenure,max_tenure,
  max_ltv,min_age,max_age,min_income,max_foir,borrower_segments,property_types,
  approved_cities,processing_fee)
SELECT
  uuid_generate_v4(),
  (SELECT id FROM lenders WHERE name = r."LenderName"),
  r."ProductName",
  r."MinInterestRate"::numeric,
  r."MaxInterestRate"::numeric,
  r."InterestRateType",
  r."MinLoanAmount"::numeric,
  r."MaxLoanAmount"::numeric,
  r."MinLoanTenureYears"::int,
  r."MaxLoanTenureYears"::int,
  r."MaxLTVRatioTier1"::numeric,
  r."MinAgeYears"::int,
  r."MaxAgeAtOriginationYears"::int,
  r."MinNetMonthlyIncome"::numeric,
  r."MaxFOIR"::numeric,
  string_to_array(lower(r."TargetBorrowerSegment"), ','),
  string_to_array(lower(r."AcceptablePropertyTypes"), ','),
  string_to_array(lower(r."ApprovedLocations"), ','),
  CASE
    WHEN r."ProcessingFeeType" = 'Percentage' THEN
        (r."ProcessingFeeValue"::numeric / 100) * r."MinLoanAmount"::numeric
    ELSE r."ProcessingFeeValue"::numeric
  END
FROM import_raw r;
```

*(assumes pgcrypto/uuid-ossp installed for uuid_generate_v4)*
---

## 4. Mapping Form Inputs → Product Fields  

| Form Field (flow spec) | Supabase Column(s) | Match Logic |
|------------------------|--------------------|-------------|
| Property Type | `property_types` | `ANY(property_types) = selected` |
| Property Value | property_value_est (runtime) | Check LTV + min/max amount |
| City | `approved_cities` | if list empty → assume nationwide |
| Loan Amount Required | `min_loan_amount` / `max_loan_amount` | between range & ≤ LTV |
| DOB → Age | `min_age`, `max_age` | age between |
| Employment Type | `borrower_segments` | array overlap |
| Salary / Net Profit | `min_income` | monthly income ≥ min |
| Existing EMIs | FOIR calculation | (EMI existing + est_new_emi) / income ≤ `max_foir` |
| Co-Applicant | ignored MVP (info only) |

Est. new EMI uses flat assumption: rate = product.interest_rate_min, tenure = 20 yrs → standard EMI formula.

---

## 5. Eligibility Filtering Algorithm  

### 5.1 SQL Function `match_products(borrower_json)`  

```sql
CREATE OR REPLACE FUNCTION match_products(borrower jsonb)
RETURNS TABLE(product_id uuid, lender_name text, product_name text,
              interest_rate numeric, processing_fee numeric) AS $$
DECLARE
  loan_amt numeric := (borrower->>'loan_amount_required')::numeric;
  prop_value numeric := (borrower->>'property_value_est')::numeric;
  age int := (borrower->>'age')::int;
  income numeric := (borrower->>'monthly_income')::numeric;
  foir numeric := (borrower->>'foir')::numeric;
  city text := lower(borrower->>'city');
  ptype text := lower(borrower->>'property_type');
  empl text := lower(borrower->>'employment_type');
BEGIN
RETURN QUERY
SELECT p.id,
       l.name,
       p.name,
       p.interest_rate_min,
       p.processing_fee
FROM products p
JOIN lenders l ON l.id = p.lender_id
WHERE p.is_active
  -- Loan & LTV
  AND loan_amt BETWEEN p.min_loan_amount AND p.max_loan_amount
  AND loan_amt <= (p.max_ltv/100) * prop_value
  -- Age
  AND age BETWEEN p.min_age AND COALESCE(p.max_age, 100)
  -- Income & FOIR
  AND income >= p.min_income
  AND (foir <= COALESCE(p.max_foir,1))
  -- Employment
  AND (empl = ANY (p.borrower_segments) OR p.borrower_segments IS NULL)
  -- Property type
  AND (ptype = ANY (p.property_types) OR p.property_types IS NULL)
  -- City
  AND (city = ANY (p.approved_cities) OR p.approved_cities IS NULL)
ORDER BY p.interest_rate_min ASC, p.processing_fee ASC
LIMIT 20;
END $$ LANGUAGE plpgsql;
```

### 5.2 Edge Function Wrapper (TypeScript)  
Same pattern as v1 spec but calls `match_products`.

---

## 6. API Interface  

`POST /functions/v1/get-offers`

Request body:  
```json
{
  "borrower_id": "uuid",
  "draft": {
    "property_type": "apartment",
    "property_value_est": 7500000,
    "city": "bangalore",
    "loan_amount_required": 6000000,
    "age": 32,
    "employment_type": "salaried",
    "monthly_income": 120000,
    "foir": 0.35
  }
}
```

Response 200:  
```json
{
  "offers": [
    {
      "product_id": "9fe0c6c5...",
      "lender_name": "State Bank of India",
      "product_name": "Classic Griha Loan",
      "interest_rate": 8.63,
      "processing_fee": 15000
    },
    {
      "product_id": "2bde56c8...",
      "lender_name": "Bank of Baroda",
      "product_name": "Privilege Dream Home Loan",
      "interest_rate": 8.75,
      "processing_fee": 22000
    }
  ]
}
```

HTTP 204 if no products match.

---

## 7. Example Walk-Through  

**Borrower Input**  
- Age: 30 (DOB 1995)  
- Salary: ₹1 L/month, no other income  
- Existing EMIs: ₹10 k → FOIR with new EMI (assume ₹45 k) = 0.55  
- Property: Apartment, Bengaluru, value ₹80 L; wants ₹60 L loan  

**Engine Filters**  
1. `loan_amt (60L)` within SBI Classic (3 L–5 Cr) ✅  
2. LTV: 60 L ≤ 85 % of 80 L (68 L) ✅  
3. Age 30 between 18–60 ✅  
4. Income 1 L ≥ min 15 k ✅  
5. FOIR 0.55 ≤ 0.60 (SBI MaxFOIR) ✅  
6. employment_type = Salaried ∈ target segment ✅  
7. property_type apartment accepted ✅  
8. city Bengaluru in list ✅  

→ Product appears. Another product (e.g., Canara Classic Privilege) fails FOIR 0.55 > 0.55 limit ❌, so excluded.

---

## 8. Admin Maintenance  

- Products editable in **/admin/products**.  
- Arrays (`property_types`, `borrower_segments`, `approved_cities`) edited via multi-select UI.  
- Trigger `updated_at` timestamp; frontend invalidates `/get-offers` cache when product table changes via Supabase realtime.

---

## 9. Edge Cases & Fallbacks  

| Situation | Behaviour |
|-----------|-----------|
| Missing city in CSV list | assume nationwide product (`approved_cities` NULL) |
| Unknown property type | fallback exclude strict products; include generic |
| Income / EMI not provided | calculate FOIR with 0 existing EMI; still check min_income |
| No matches | return 204 + CTA: “Talk to our advisor” |

---

## 10. Performance & Security  

- Single SQL query; <100 ms for 1 k products.  
- RLS: service-role key used in edge function, no client exposure.  
- Results cached per borrower_id for 15 min in Supabase KV (roadmap).  

---

**This v2 spec aligns exactly with the data columns present in _indian_home_loan_products(1).csv_ and the borrower fields gathered in the onboarding flow, delivering an implementable eligibility-based comparison engine.**