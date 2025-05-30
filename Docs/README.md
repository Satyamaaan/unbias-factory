# Unbias Lending

## 1. Project Overview  
Unbias Lending is a digital home-loan marketplace for Indian borrowers.  
The platform lets users discover, compare, and apply for home-loan products from banks and NBFCs in minutes—100 % online, transparent, and “unbiased.”  
This repository contains the **MVP** implementation built with a **Supabase + Next.js** stack.

---

## 2. Key Documentation  

| Doc | Purpose |
|-----|---------|
| [`unbias-lending-form-flow-specification.md`](docs/unbias-lending-form-flow-specification.md) | Full 17-screen borrower onboarding flow |
| [`unbias-lending-comparison-engine-v2.md`](docs/unbias-lending-comparison-engine-v2.md) | Eligibility-based comparison engine spec (maps to real CSV data) |
| [`unbias-lending-mvp-simplified-architecture.md`](docs/unbias-lending-mvp-simplified-architecture.md) | Lean architecture + timeline for the MVP |
| [`unbias-lending-factory-ai-build-plan.md`](docs/unbias-lending-factory-ai-build-plan.md) | How to build every feature with Factory.ai vibe-coding |
| [`indian_home_loan_products(1).csv`](data/indian_home_loan_products(1).csv) | Source dataset of Indian home-loan products |

*(All docs live in the `docs/` folder unless noted.)*

---

## 3. Getting Started

### Prerequisites  
- Node 20+ and pnpm or npm  
- Supabase CLI (`npm i -g supabase`)  
- Vercel CLI (optional)  
- A Supabase project (Free tier is fine)  
- Factory.ai account (for vibe-coding workflow)

### Local Setup  

```bash
# 1. Clone and install
git clone https://github.com/your-org/unbias-lending.git
cd unbias-lending
pnpm install

# 2. Start Supabase locally (schema + edge functions)
supabase start
supabase db push      # apply migrations
supabase functions serve

# 3. Run Next.js dev
pnpm dev
```

Import the product CSV via `scripts/import_products.sql` or Supabase table editor.

---

## 4. Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend-as-Service | Supabase (Postgres, Row-Level Security, Auth, Storage, Edge Functions) |
| Hosting | Vercel (static + SSR) |
| Auth / OTP | Supabase Auth + 2Factor SMS |
| State | React Context + TanStack Query |
| Testing | Vitest, Playwright |
| Tooling | Factory.ai (code generation, terminal, code review), ESLint, Prettier |

---

## 5. Project Structure

```
/
├─ app/                 # Next.js routes (borrower + admin)
│   └─ onboarding/      # 17-step wizard screens
├─ components/          # Reusable UI components
├─ lib/                 # Helpers (supabase client, validators, utils)
├─ supabase/
│   ├─ migrations/      # SQL migrations
│   └─ functions/       # Edge Functions (match_products, etc.)
├─ data/                # CSV datasets
├─ docs/                # Architecture & spec documents
└─ tests/               # Vitest + Playwright tests
```

---

## 6. Development Workflow with Factory.ai  

1. **Add context** – Attach the relevant doc or file via the Context Panel.  
2. **Prompt** – Use small, focused prompts (e.g., “Create SalaryRangeStep component”).  
3. **Review diff** – Factory shows changes; approve or refine.  
4. **Run tests** – Trigger `pnpm test` in the Terminal toolkit.  
5. **Preview deploy** – Factory opens Vercel Preview after PR creation.  
6. **Merge** – Approve via Factory’s GitHub tool; blue-green deploy to production.  

> Tip: Follow the prompt catalogue in *unbias-lending-factory-ai-build-plan.md* for consistent results.

---

## 7. Deployment

### Production (Vercel + Supabase Cloud)

1. **Environment variables**  
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY` (frontend)  
   - `SUPABASE_SERVICE_ROLE_KEY` (edge functions)  
   - `TWOFACTOR_API_KEY`  

2. **Vercel Project**  
   ```bash
   vercel link
   vercel env add ...
   vercel --prod
   ```

3. **Database & Edge Functions**  
   - `supabase db push` (migrations)  
   - `supabase functions deploy match_products`

### Staging & Previews  
Preview deployments are automatic on every PR (Vercel).  
Supabase “Branch Deployments” can be enabled if desired.

---

## 8. Contributing

Guidelines for internal team & open-source collaborators:

1. **Issue first** – Open a GitHub Issue describing the feature/bug.  
2. **Use Factory.ai** – All code should be generated or reviewed via Factory to stay in sync.  
3. **Branch naming** – `feat/<topic>`, `fix/<topic>`  
4. **Lint & test** – `pnpm lint && pnpm test` must pass before PR review.  
5. **Docs** – Update relevant markdown in `docs/` for any new feature.  
6. **Commits** – Conventional Commits (`feat: …`, `fix: …`) preferred.  
7. **Security** – Never commit secrets; follow RLS & env-var patterns.  

---

Happy building!  
_Unbias.money – Bringing transparency to Indian home-loans._  
