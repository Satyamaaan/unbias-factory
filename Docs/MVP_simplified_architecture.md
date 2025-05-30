# Unbias Lending – Simplified MVP Technical Architecture  
*(File: unbias-lending-mvp-simplified-architecture.md · v1.0 · 29 May 2025)*  

---

## 1. Executive Summary  
The MVP objective is to launch Unbias Lending in **≤ 10 weeks** with **1-2 developers**, the **lowest possible complexity**, and **controlled costs**, while meeting Indian lending compliance and baseline security.  
We achieve this by using an **all-in-one BaaS (Supabase)** and a **single Next.js code-base** that serves both Borrower and Admin modules. The Comparison Engine will be an SQL/TypeScript function living next to the database. This keeps moving parts minimal and leaves a clear path to refactor later as traffic grows.

---

## 2. Super-Simple Architecture Overview  

```
[ Next.js (SSR) + Tailwind ]
   ├─ Borrower pages
   ├─ Admin pages (behind /admin route + RBAC)
   └─ API routes (optional)  

[ Supabase Cloud (Delhi region) ]
   ├─ Postgres + Row Level Security
   ├─ Auth (mobile-OTP & email)
   ├─ Storage (documents)
   └─ Edge Functions
        • comparison_engine()
        • send_notification()

[ 2Factor SMS Gateway ]
```
*All traffic is HTTPS; Supabase handles scaling, backups, and logging.*

---

## 3. Minimal Tech-Stack  

| Layer | Choice | Why it’s MVP-friendly |
|-------|--------|-----------------------|
| Frontend & SSR | **Next.js 15 + React 19 + TypeScript** | One framework for marketing, borrower, and admin; built-in API routes if needed. |
| Styling | **Tailwind CSS** | Fast UI iteration, small bundle. |
| Backend | **Supabase** (Postgres, Auth, Storage, Edge Functions) | One managed service covers DB, auth, file storage, realtime, APIs. |
| Authentication | Supabase magic-link + **SMS OTP via 2Factor** | Easy to wire, DLT-compliant. |
| Comparison Engine | **Supabase Edge Function** (TypeScript + SQL) | Runs next to data, no extra infra. |
| Deployment | **Vercel Free/Pro** for Next.js; Supabase Free/Pro | Git-push → preview → prod. |
| Monitoring | Supabase dashboard + Vercel analytics; free Sentry tier for errors. |
| Analytics (optional) | Plausible script | Lightweight, privacy-first. |

*Everything lives in one GitHub repo; local dev with Supabase CLI.*

---

## 4. MVP Features & Scope  

### Borrower Module  
- Landing page & multi-step onboarding form  
- Mobile number + OTP login (2Factor)  
- Offer dashboard (cards sorted by match-score)  
- Basic offer details modal  
- Document upload (PDF/JPG)  

### Admin Module  
- Secured `/admin` route (role check)  
- CRUD: lenders & products (simple tables)  
- View borrower list & update status  
- Download uploaded docs  

### Comparison Engine  
- Function `match_offers(borrower_id)`  
- SQL filters by eligibility JSON rules  
- Simple match-score formula (weights)  

*Out-of-scope for MVP*: bank integrations, payment flows, fancy analytics, mobile apps.

---

## 5. Simplified Development Phases  

| Phase | Week | Deliverables |
|-------|------|--------------|
| 0. Setup | 1 | Repo, CI/CD, Supabase project, DLT SMS templates |
| 1. Auth & Landing | 2 | Marketing page, OTP login flow |
| 2. Borrower Forms | 3-4 | Multi-step form with Supabase insert |
| 3. Offer Engine | 5 | Edge function + dashboard cards |
| 4. Admin Basics | 6 | `/admin` pages, product CRUD |
| 5. Docs & Notifications | 7 | File upload, status SMS/email |
| 6. Hardening & UAT | 8 | RLS policies, pen-test checklist, beta launch |

**Total:** **8 weeks** (buffer included).

---

## 6. Reduced Costs & Timeline  

| Item | Monthly (INR) |
|------|---------------|
| Supabase **Free** (upgrade to Pro @ launch) | ₹0 → ₹5 k |
| Vercel Pro (or free until limit hit) | ₹0 → ₹4 k |
| SMS OTP (10 k @ ₹0.15) | ₹1.5 k |
| Misc. (domain, email) | ₹1 k |
| **Total OPEX @ launch** | **≈ ₹10–12 k / month** |

Dev effort: **1 Full-Stack dev + 1 UI contractor** → **8 weeks**.

---

## 7. Security Essentials (Simplified)  

1. **RLS Everywhere** – only row owner or admin can select/update.  
2. **HTTPS enforced** via Vercel & Supabase defaults.  
3. **JWT claims** drive borrower/admin separation.  
4. **Private Storage buckets**; signed URL expires 10 min.  
5. **Service-role key** stored only in server env vars.  
6. **SOC 2 & ISO** inherited from Supabase/Vercel.  
7. **DLT compliance**: pre-approved SMS templates; mask Aadhaar.  
8. **Nightly DB backup** (Supabase auto) + download to local S3 month-end.  

---

## 8. Path to Scale Later  

| Trigger | Next Step |
|---------|-----------|
| >50 k MAU | Upgrade Supabase Pro CPU/RAM; enable read replicas. |
| Offer calc slowdown | Move Comparison Engine to separate Node micro-service on Fly.io or Railway. |
| Complex workflows | Split Admin into dedicated Next.js app; add Redis cache. |
| Compliance / audits | Add Cloudflare WAF, SOC 2 attestation, SIEM export. |
| Mobile apps | Wrap existing PWA with Capacitor or build React Native front-end. |

---

## 9. Next Steps  

1. **Approve this MVP plan & budget (₹10–12 k/month).**  
2. Register DLT header + templates with 2Factor (1 week SLA).  
3. Kick-off Phase 0: set up GitHub repo, Supabase, Vercel.  
4. UI designer delivers Tailwind component kit by Week 2.  
5. Begin borrower flow build immediately.  

With this simplified stack a small team can reach market quickly, prove product-market fit, and layer in advanced architecture only when traction demands it.  