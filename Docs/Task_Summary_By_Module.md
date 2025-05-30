# Task Summary by Module  
*(File: Docs/Task_Summary_By_Module.md · v1.0 · 30 May 2025)*  

Effort key • **S** = 1-2 days • **M** = 3-5 days • **L** = 1-2 weeks  

---

## 0. Foundation & Setup
| ID | Task | Effort | Brief Description |
|----|------|--------|-------------------|
| F-0.1 | Provision Supabase project | S | Create cloud project, capture keys |
| F-0.2 | Initialize GitHub repo & CI | S | Repo, lint/test workflow, branch rules |
| F-0.3 | Local dev tooling | S | `.nvmrc`, pnpm, prettier/husky hooks |
| F-0.4 | Next.js + Tailwind skeleton | S | Base app router, Typescript, landing stub |
| F-0.5 | Supabase CLI & local DB | S | Configure local containers for dev |
| F-0.6 | Initial DB schema migration | M | Create core tables & enable RLS |
| F-0.7 | Seed CSV import script | S | Load 50 products / 41 lenders |
| F-0.8 | Configure Vercel project | S | Connect repo, set env vars, preview deploys |

---

## 1. Borrower Module
| ID | Task | Effort | Brief Description |
|----|------|--------|-------------------|
| B-1.1 | Borrower draft context | S | Global state + localStorage autosave |
| B-1.2 | `FormStepLayout` component | S | Shared wizard shell & progress bar |
| B-1.3 | Zod schemas per step | S | Central validation rules |
| B-1.4 | Screens 1-5: property details | M | Journey, type, value, city, pincode |
| B-1.5 | Screens 6-8: loan, DOB, employment | M | Numeric/date inputs & employment enum |
| B-1.6 | Salaried path screens | S | Salary range & other income |
| B-1.7 | Self-employed path screens | S | Net profit & ITR years |
| B-1.8 | EMI & co-applicant screens | S | Monthly EMIs + yes/no toggle |
| B-1.9 | Mobile & OTP verification | M | 2Factor SMS via Supabase Auth |
| B-1.10 | `finalize_draft` RPC & trigger | S | Move draft → borrowers on OTP success |
| B-1.11 | Offer loading redirect | S | Spinner then navigate to dashboard |
| B-1.12 | Offer dashboard UI | M | Cards list, sort & apply CTA |

---

## 2. Comparison Engine Module
| ID | Task | Effort | Brief Description |
|----|------|--------|-------------------|
| CE-2.1 | `eval_rule` PL/pgSQL | S | Helper to check individual rule keys |
| CE-2.2 | `match_products` SQL fn | S | Main eligibility & sorting query |
| CE-2.3 | `match_offers` edge function | S | HTTP wrapper calling SQL function |
| CE-2.4 | Borrower insert trigger | S | Fire engine after OTP success |
| CE-2.5 | Rule management API hooks | S | CRUD endpoints for `product_rules` |

---

## 3. Admin Module
| ID | Task | Effort | Brief Description |
|----|------|--------|-------------------|
| A-3.1 | Admin auth guard & RBAC | S | Route protection via Supabase roles |
| A-3.2 | Lender CRUD pages | S | List, add, edit lender records |
| A-3.3 | Product CRUD + CSV upload | M | Full product editing & bulk import |
| A-3.4 | Rule table & form modal | S | UI to add/update eligibility rules |
| A-3.5 | Borrower list & doc viewer | M | View applications and download files |
| A-3.6 | Basic analytics dashboard | S | Charts for offers & conversion metrics |

---

## 4. Integration & Testing
| ID | Task | Effort | Brief Description |
|----|------|--------|-------------------|
| T-4.1 | Unit tests – frontend | S | Vitest for components & utils |
| T-4.2 | Unit tests – database | S | pgTAP for rule evaluation |
| T-4.3 | End-to-end tests | M | Playwright mobile flow |
| T-4.4 | Load test comparison engine | S | k6 script @ 200 RPS |

---

## 5. Deployment & Go-Live
| ID | Task | Effort | Brief Description |
|----|------|--------|-------------------|
| D-5.1 | Production env variables | S | Populate Supabase, Vercel, 2Factor keys |
| D-5.2 | DLT SMS template approval | M | Register sender IDs & templates |
| D-5.3 | Security review & RLS audit | S | Verify policies, basic pen-test |
| D-5.4 | UAT with pilot borrowers | S | 10-user test run, collect feedback |
| D-5.5 | Launch day cut-over | S | Switch domain & prod DB, public release |
| D-5.6 | Post-launch monitoring | L | Logflare alerts & hot-fix SLA setup |

---

### Quick Critical Path
F-0.6 → CE-2.2 → CE-2.3 → B-1.10 → B-1.12 → D-5.5  

Delay in any step above postpones live launch.
