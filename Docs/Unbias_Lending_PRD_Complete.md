# Unbias Lending – Product Requirements Document (PRD)
*(File: Docs/Unbias_Lending_PRD_Complete.md · v1.0 · 30 May 2025)*  

---

## 1. Executive Summary & Vision  

Unbias Lending is a digital marketplace that helps Indian home-loan seekers discover, compare, and apply for the **best-fit loan** in minutes—without hidden bias, branch visits, or paperwork.  
Our vision is to **become the “MakeMyTrip” for mortgages in India**, trusted equally by borrowers and lenders, while removing information asymmetry and discriminatory practices from retail lending.

Strategic north-star: *“Approved loans 3× faster, 100 % transparent.”*

---

## 2. Product Overview & Market Context  

### 2.1 Market Size & Pain Points  
* INR 24 lakh crore home-loan book growing ~12 % CAGR  
* Borrowers face: opaque pricing, manual paperwork, city-centric lender coverage, bias against non-salaried applicants.

### 2.2 Differentiation  
1. **Unbiased comparison engine** driven by rules, not commissions.  
2. **Fully online onboarding** (OTP auth + 17-step wizard) compresses week-long branch visits into <15 mins.  
3. **Lightweight architecture (Supabase + Next.js)** keeps cost per acquired customer low → sustainable unit economics.  

### 2.3 Business Model  
*Free for borrowers.* Lenders pay:  
* Lead fee (₹ X per qualified file)  
* Success fee (basis-point share of disbursed amount)  
Long-term: premium analytics to lenders & embedded cross-sell (insurance).

---

## 3. User Personas & Journey  

| Persona | Goals | Pain Points Today | Journey Touchpoints |
|---------|-------|-------------------|---------------------|
| **Rohit (Salaried IT engineer, 29)** | Fast approval, lowest EMI | Branch hopping, confusing rates | Landing page → 17-step wizard → offer dashboard → chooses lender → uploads docs |
| **Meena (Self-employed boutique owner, 35)** | Fair chance despite irregular income | Bias vs. self-employed, paperwork | Same flow with self-emp branch → receives curated offers |  
| **Anita (Lender RM)** | Qualified leads, lower CAC | High drop-off on internal forms | Admin → sees borrower list → pulls docs |
| **Satyajit (Internal Ops/Admin)** | Maintain clean catalogue, tweak rules quickly | Dev dependency, Excel chaos | Admin CRUD for lenders/products/rules |

Borrower macro-journey (AIDA):  
1. **Awareness** – SEM/social → Landing page (USP: “Find unbiased rates in 2 mins”).  
2. **Interest** – Wizard collects data while educating.  
3. **Decision** – Comparison dashboard with ranked offers.  
4. **Action** – In-app document upload & lender connect.

---

## 4. Detailed Feature Specifications  

### 4.1 Borrower Module  
| Epic | Description | Business Rationale | Priority |
|------|-------------|--------------------|----------|
| Onboarding Wizard | 17 adaptive screens with autosave, OTP auth | Capture structured data; reduce drop-offs | P0 |
| Offer Dashboard | Ranked cards (interest rate, EMI, fees), filters, CTA | Transparency & conversion | P0 |
| Document Upload | Upload KYC, income proofs to secure bucket | Enable online underwriting | P1 |
| Status Notifications | SMS updates on progress | Reduce support queries | P1 |
| Borrower Portal v2 | Track application, chat with RM | Retention & upsell | P2 |

### 4.2 Comparison Engine  
| Epic | Description | Business Rationale | Priority |
|------|-------------|--------------------|----------|
| Eligibility Matching (v1) | Binary filter via SQL rules; sort by rate & fee | Quick time-to-value | P0 |
| Rule Management UI | Admin can add/edit rule JSON | Ops agility, no releases needed | P0 |
| Scoring & Ranking (v2) | Weighted score incl. FOIR, incentives | Improve lender ROI & borrower fit | P2 |
| ML Approval Likelihood (v3) | Predict approval % using historical data | Monetisable IP | P3 |

### 4.3 Admin Module  
| Epic | Description | Business Rationale | Priority |
|------|-------------|--------------------|----------|
| RBAC & Secure Login | Supabase Auth roles (`ADMIN`, `OPS`) | Data security | P0 |
| Lender CRUD | Add/edit lender logo, details | Catalogue hygiene | P0 |
| Product CRUD | Manage >100 attributes; CSV import | Scale SKU count | P0 |
| Rule CRUD | Table+modal UI for `product_rules` | Instant experimentation | P0 |
| Borrower List & Docs | Search, status update, file download | Ops efficiency | P1 |
| Analytics Dashboard (basic) | Offers viewed vs. applied, funnel | Data-driven iteration | P2 |

---

## 5. Technical Architecture Summary (non-technical view)  

* **Front-end:** Single Next.js web app—mobile-first, works offline in PWA shell.  
* **Backend:** Supabase cloud hosts database, authentication, file storage, and “edge functions”.  
* **Comparison Engine:** Lives next to the database for speed; thinks in *rules* rather than code so ops can tweak without engineers.  
* **Security:** Bank-grade encryption, RBI-compliant SMS OTP, Role-Level-Security on every row.  
* **Scalability:** Same stack already handles >1 M req/min in other SaaS; upgrade path = bigger Supabase instance + global edge cache.  

Illustration (1-slide friendly):  
Browser ⇄ Next.js ⇄ Supabase (DB/Auth/Storage/Rules Engine) ⇄ 2Factor SMS.

---

## 6. Success Metrics & KPIs  

| Funnel Stage | KPI | MVP Target | Notes |
|--------------|-----|-----------|-------|
| Acquisition | Landing-page > Wizard start | ≥ 12 % | Benchmarked vs. industry 8 % |
| Activation | Wizard completion rate | ≥ 60 % | Mobile visitors |
| Match | Avg. eligible offers per borrower | ≥ 6 | Indicates data quality & rules breadth |
| Conversion | Borrowers clicking “Apply” | ≥ 25 % of completed | |
| Revenue | Avg. lead fee realised | ≥ ₹ 1 500 | Based on lender MoUs |
| Ops | SLA to send offers after OTP | ≤ 5 sec p95 | Comparison engine performance |
| CSAT | Borrower NPS after offer | ≥ 55 | Surpass incumbents |

---

## 7. Go-to-Market (GTM) Strategy  

1. **Geographic focus:** Tier-1 & Tier-2 cities with high property transactions (BLR, DEL, MUM, HYD, PNQ).  
2. **Channel mix**  
   * Paid search for “home loan interest rate”, “balance transfer”.  
   * Content SEO: unbiased rate tables, explainer videos.  
   * Partnerships: real-estate portals, builders.  
   * Referral program for RMs leaving banks.  
3. **Lender onboarding:** Start with 10 public-sector & 5 private banks (covering 70 % market share) → showcase success to pull remaining.  
4. **Launch timeline:**  
   * Month 0–2: Private beta with 50 borrowers via brokers  
   * Month 3: Public launch + PR with “India’s first unbiased home-loan marketplace” headline.  
   * Month 6: Android PWA wrapper & vernacular landing pages.

---

## 8. Risk Management  

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Data inaccuracies in product catalogue | Wrong offers → brand damage | Medium | Automated CSV validations, nightly lender confirmation |
| Regulatory change (RBI digital lending) | Compliance cost | Medium | Engage legal advisor, keep architecture modular |
| SMS OTP failures | Drop-offs | Low | Redundant provider fallback (e.g., MSG91) |
| Lender pushback on fee model | Revenue shortfall | Medium | Tiered pricing, performance dashboards to demonstrate value |
| Security breach | High reputational damage | Low | SOC-2 inherited controls, penetration tests, RLS enforced |

---

## 9. Roadmap & Future Enhancements  

| Quarter | Theme | Key Deliverables |
|---------|-------|------------------|
| Q3 2025 (MVP) | Launch & Feedback | Borrower wizard, comparison engine v1, admin CRUD, 15 lenders live |
| Q4 2025 | Engagement & Monetisation | Document upload, lender CRM integration, SMS status updates |
| Q1 2026 | Intelligence | Comparison engine v2 (weighted scoring), dashboard analytics, Redis caching |
| Q2 2026 | Scale | Mobile app shell, multilingual UI (Hindi, Tamil), 50 lenders |
| H2 2026 | Deep Tech | ML approval likelihood, real-time pre-approval APIs with select banks, co-applicant profiles |
| 2027+ | Ecosystem | Insurance cross-sell, personal-finance marketplace, credit-improvement coaching |

---

### Approval  

*Product Owner:* Satyajit Manjaria  
*Date:* 30 May 2025  

By approving this PRD, stakeholders agree on scope, KPIs, and timeline for Unbias Lending MVP and subsequent phases.
