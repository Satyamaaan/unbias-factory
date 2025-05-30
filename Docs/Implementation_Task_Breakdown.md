# Implementation Task Breakdown (Lean MVP Edition)
*(File : Docs/Implementation_Task_Breakdown.md · v2.0 · 30 May 2025)*  

This plan is optimised for a **solo developer / tiny team** using Factory.ai vibe-coding.  
Each module is fully usable before starting the next.  No CI/CD, no branch rules, no yak-shaving.

Effort key • XS = <½ day • S = 1-2 days • M = 3-5 days  

---

## Quick Setup  — *Goal: a running Next.js app talking to Supabase*

| ID | Effort | Task | Done-when                                                   |
|----|--------|------|-------------------------------------------------------------|
| Q-1 | XS | Create **private GitHub repo** with README & Node .gitignore | Repo exists, can push/pull |
| Q-2 | XS | `npx create-next-app@latest unbias` → TypeScript, Tailwind | `npm run dev` shows home page |
| Q-3 | XS | `supabase init` locally; add `.env.local` with `SUPABASE_URL` & `ANON_KEY` from cloud project | `supabase start` boots local DB (optional) |
| Q-4 | S  | **Import CSV** → Supabase: open SQL editor, run provided import script from docs | `lenders` & `products` tables contain ~50 rows |
| Q-5 | XS | Commit & push; no further tooling until later | Remote shows initial code |

*You can now fetch data from Supabase inside Next.js.*

---

## Module 1 – Database & Backend Setup
*Goal: clean schema + minimal backend helpers*

| ID | Effort | Task | Done-when |
|----|--------|------|-----------|
| DB-1 | S | Create SQL migration file defining `borrowers`, `product_rules`, basic RLS (owner read) | Migration runs without errors |
| DB-2 | XS | Insert a **dummy borrower row** manually for testing | Row visible in table |
| DB-3 | S | Write simple Supabase **edge function stub** `hello.ts` returning `"pong"` | Curl returns 200/pong |
| DB-4 | XS | Add `supabase/functions/.gitignore` & push | Repo synced |
| DB-5 | XS | **Checkpoint** – Tables & functions exist, can query from Next.js | Ready for Module 2 |

---

## Module 2 – Comparison Engine  (core logic first!)
*Goal: Given a borrower ID, return eligible products*

| ID | Effort | Task | Done-when |
|----|--------|------|-----------|
| CE-1 | S | Write PL/pgSQL `eval_rule()` supporting min/max age, income, FOIR, arrays | Unit queries return TRUE/FALSE correctly |
| CE-2 | S | Write SQL function `match_products(borrower_id)` performing filtering + ORDER BY rate/fee | Dummy borrower returns at least 1 offer |
| CE-3 | S | Replace `hello.ts` with real edge function `match_offers.ts` that POSTs `{ borrower_id }` and returns offers JSON | Fetch from localhost returns list |
| CE-4 | XS | Manual smoke test in browser → call function via Supabase JS; verify latency <500 ms | Pass |
| CE-5 | XS | **Checkpoint** – Engine produces correct offers for 2-3 sample borrowers | Ready for Module 3 |

---

## Module 3 – Borrower Flow
*Goal: user can onboard, verify OTP, see offers*

| ID | Effort | Task | Done-when |
|----|--------|------|-----------|
| BF-1 | S | Build **5-screen mini-wizard** (property, loan, DOB, employment, mobile) using React Context | Fields save in memory |
| BF-2 | XS | Integrate Supabase **phone OTP** (`signInWithOtp`) | OTP delivered & verified on test number |
| BF-3 | S | On OTP success, insert row into `borrowers` table (client insert for now) | Row created with captured data |
| BF-4 | XS | Call `/match_offers` and show results as simple cards on `/dashboard` | Cards list lender name + rate |
| BF-5 | XS | Basic error / empty-state UI | “No offers available” message |
| BF-6 | XS | **Checkpoint** – End-to-end happy path works on localhost mobile viewport | Ready for Module 4 |

---

## Module 4 – Admin Panel
*Goal: non-tech user can maintain data via UI*

| ID | Effort | Task | Done-when |
|----|--------|------|-----------|
| AD-1 | XS | Add `/admin/login` page using Supabase email magic-link | Able to login as admin user |
| AD-2 | S | `/admin/products` – table view with edit modal for `interest_rate_min`, `processing_fee`, `is_active` | Save updates row |
| AD-3 | S | `/admin/products/[id]/rules` – list + add rule (dropdown + JSON textarea) | New rule stored in `product_rules` |
| AD-4 | XS | Quick `/admin/borrowers` read-only list (id, city, loan amt) | Page renders data |
| AD-5 | XS | **Checkpoint** – Ops can tweak product rules and instantly affect offers | Ready for Module 5 |

---

## Module 5 – Polish & Launch
*Goal: MVP ready for real borrowers*

| ID | Effort | Task | Done-when |
|----|--------|------|-----------|
| P-1 | XS | Register **2Factor** DLT template for OTP & status SMS | Approved |
| P-2 | XS | Add simple **loading spinner** and light Tailwind styling pass | UI doesn’t look broken |
| P-3 | XS | Configure **Vercel** one-click deploy with env vars (URL & keys) | Prod URL live |
| P-4 | XS | Manually test on 3 real phones (salaried, self-emp, no-match) | All flows succeed |
| P-5 | XS | Add basic **Google Analytics / Plausible** script | Events send |
| P-6 | XS | Announce soft-launch to 10 pilot users | Collect feedback |

---

### Timeline Snapshot (single dev, 4-day weeks)
| Week | Focus |
|------|-------|
| 1 | Quick Setup + Module 1 |
| 2 | Module 2 |
| 3 | Module 3 |
| 4 | Module 4 |
| 5 | Polish & soft-launch |

*5 weeks to live users — adjust as needed.*

---

## Guiding Principles
1. **Progress over Perfection** – ship usable slices, iterate.
2. **Manual ≫ Automated** at MVP stage (e.g., run SQL in dashboard instead of migrations if faster).
3. **YAGNI** – if you don’t need it THIS week, don’t build it.
4. **One module at a time** – no half-done features lying around.
5. **Keep secrets safe** – only store keys in `.env.local` / Vercel env panel.

Happy vibe-coding! 🎉
