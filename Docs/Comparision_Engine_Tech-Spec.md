# Unbias Lending – Comparison Engine Technical Specification  
*(File: unbias-lending-comparison-engine-spec.md · v1.0 · 29 May 2025)*  

---

## 1. Overview & Objectives  

The Comparison Engine is the service that ingests a borrower’s profile and returns a **rank-ordered list of home-loan products** that the borrower is **eligible** for.  

MVP goal:  
* **Binary match** only — no percentage scores; simply return qualifying products sorted by interest-rate (ascending) and processing-fee (ascending tie-break).  
* Execute entirely inside **Supabase Edge Function** (TypeScript + SQL), callable by the Next.js frontend.  
* Admins maintain product data & eligibility rules via a simple CRUD UI.  

---

## 2. Data Models & Schema  

### 2.1 Borrower Profile (`borrowers`)  

| column | type | notes |
|--------|------|-------|
| id (PK) | uuid | Supabase auth UID |
| full_name | text |
| dob | date |
| employment_type | enum(`SALARIED`,`SELF_EMPLOYED`) |
| monthly_net_income | numeric(12,2) |
| existing_emi | numeric(12,2) |
| cibil_score | int |
| property_value | numeric(14,2) |
| loan_amount_required | numeric(14,2) |
| state | text |
| created_at | timestamptz | default `now()` |

### 2.2 Lender & Product Tables  

```
lenders
  id (PK) uuid
  name text
  logo_url text
  is_active bool default true

products
  id (PK) uuid
  lender_id (FK) uuid
  name text
  interest_rate numeric(4,2)
  processing_fee numeric(8,2)
  max_ltv numeric(4,2)       -- % of property value
  min_loan_amount numeric(14,2)
  max_loan_amount numeric(14,2)
  is_active bool default true
  created_at timestamptz
```

### 2.3 Eligibility Rule Table (`product_rules`)  

| column | type | example value | meaning |
|--------|------|---------------|---------|
| id (PK) | uuid | |
| product_id (FK) | uuid | |
| rule_key | text | `'min_age'`, `'max_age'`, `'min_salary'`, `'min_cibil'`, `'employment_types'`, `'states_allowed'`, `'max_foir'` |
| rule_value | jsonb | `30`, `800000`, `["SALARIED"]`, `["KA","TN"]` |
| created_at | timestamptz |

*FOIR = Fixed-Obligation-to-Income Ratio = (existing EMI + proposed EMI) / net income.*

---

## 3. Eligibility Rules Engine  

Rules are **AND-ed** within a product.  
Supported MVP rule keys:  

| key | Data type | Check |
|-----|-----------|-------|
| min_age / max_age | int | borrower age in years |
| min_salary | numeric | monthly_net_income ≥ value |
| max_foir | numeric(4,2) | computed foir ≤ value |
| min_cibil | int | cibil_score ≥ value |
| employment_types | array<text> | borrower.employment_type ∈ list |
| states_allowed | array<text> | borrower.state ∈ list |
| min_property_value | numeric | property_value ≥ value |

Engine algorithm applies rules in SQL for performance.

---

## 4. Matching Algorithm Logic  

1. **Fetch borrower** by `borrower_id`.  
2. **Compute derived fields**  
   ```
   age = date_part('year', age(current_date, dob));
   foir = (existing_emi + tentative_emi) / monthly_net_income;
   ```  
   *tentative_emi* uses a conservative formula: assume rate = 10 %, tenure = 20 yrs.  
3. **Filter products**  
   ```sql
   SELECT p.*
   FROM products p
   JOIN lenders l ON l.id = p.lender_id AND l.is_active
   WHERE p.is_active
     AND loan_amount_required BETWEEN p.min_loan_amount AND p.max_loan_amount
     AND loan_amount_required <= p.max_ltv * property_value / 100
     AND NOT EXISTS (
       SELECT 1 FROM product_rules r
       WHERE r.product_id = p.id
         AND NOT eval_rule(r, borrower_json)  -- custom SQL func described below
     )
   ORDER BY p.interest_rate ASC, p.processing_fee ASC;
   ```
4. **Return list** with lender & product fields.  

`eval_rule(rule_row, borrower)` is a PostgreSQL SQL/PLPGSQL helper that inspects `rule_key` and applies comparison to borrower record (supplied as JSONB for simplicity).

---

## 5. API Design & Implementation  

### 5.1 Edge Function Signature  

```
POST /functions/v1/match_offers
Body: { borrower_id: string }
Response 200:
{
  borrower_id: "...",
  offers: [
    {
      product_id,
      lender_name,
      product_name,
      interest_rate,
      processing_fee,
      max_ltv
    }, ...
  ]
}
```

### 5.2 Function Skeleton (TypeScript)  

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const { borrower_id } = await req.json()
  const supabase = createClient(
     Deno.env.get('SUPABASE_URL'),
     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  )

  const { data: offers, error } = await supabase
    .rpc('match_offers_sql', { borrower_id })

  if (error) return new Response(error.message, { status: 400 })
  return new Response(JSON.stringify({ borrower_id, offers }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

`match_offers_sql` is a Postgres function containing the SQL from section 4.

---

## 6. Admin Interface for Rule Management  

*Route:* `/admin/products/:id/rules`  

Components generated via Factory.ai:  
1. **RuleTable** – lists existing rules.  
2. **RuleFormModal** – add / edit rule:  
   - dropdown `rule_key`  
   - JSON field `rule_value` (validated client-side via Zod)  
3. **API calls** use Supabase client `insert`, `update`, `delete` on `product_rules`.

RBAC: only users with `role = 'ADMIN'` can access.

---

## 7. Factory.ai Implementation Guide  

| Deliverable | Prompt Snippet Example |
|-------------|-----------------------|
| DB schema migration | “Create SQL migration to add products, lenders, product_rules tables as per spec.” |
| Eval function | “Write a plpgsql function eval_rule(rule_row product_rules, borrower jsonb) returning boolean implementing rule keys table.” |
| Edge Function | “Generate match_offers Edge Function calling match_offers_sql postgres function.” |
| Rule CRUD UI | “Create Next.js Admin page at /admin/products/[id]/rules with RuleTable & RuleFormModal components using Supabase.” |
| Tests | “Write Vitest unit tests for eval_rule covering min_age and employment_types rules.” |

**Tip:** supply table DDL + example borrower JSON as context.

---

## 8. Performance & Optimization  

* Expected query ≤ 100 ms for 500 active products on Supabase Pro (8 GB).  
* Indexes:  
  - `idx_products_active` on `(is_active, min_loan_amount, max_loan_amount)`  
  - GIN index on `product_rules(rule_key, rule_value)` if rule volume >10k.  
* Move heavy calculations (FOIR, tentative EMI) into SQL to avoid multiple round-trips.  
* Cache results per borrower for 15 minutes using Supabase realtime cache or Redis (future).  

---

## 9. Testing Strategy  

| Layer | Tool | Examples |
|-------|------|----------|
| Unit (DB) | pgTAP or plpgsql assertions | eval_rule passes for each rule key |
| Unit (TS) | Vitest | Edge function returns offers list length >0 |
| Integration | Supabase seed + Playwright | End-to-end borrower onboarding → offers displayed |
| Load | k6 script hitting `/match_offers` | 200 rps, <250 ms p95 |

CI step runs Vitest + pgTAP on GitHub Actions.

---

## 10. Future Enhancements  

1. **Scoring & Ranking** – re-introduce match percentage weighing interest, FOIR, partner incentives.  
2. **ML-based pricing** – logistic model predicting approval likelihood.  
3. **Dynamic Rules UI** – allow nested AND/OR logic via JSON logic builder.  
4. **Caching layer** – Redis Edge cache for popular borrower segments.  
5. **Co-applicant profiles** – adjust eligibility for joint incomes.  

This spec provides enough detail for Factory.ai to autogenerate database migrations, backend logic, and admin UI needed to launch the MVP Comparison Engine.  