# Unbias Lending – Factory.ai “Vibe-Coding” Build Plan  
*(File: unbias-lending-factory-ai-build-plan.md · v1.0 · 29 May 2025)*  

---

## 1. Overview: Vibe Coding with Factory.ai  
“Vibe coding” = replacing a multi-person dev team with rapid AI-assisted creation loops.  
With Factory.ai you’ll:  
1. **Describe → Generate → Refine** instead of design → code → review.  
2. Work in **chat + context panel**; Factory writes the files, you steer.  
3. Use **small, well-scoped prompts** (one component or test at a time).  
4. Lean on Factory’s built-in PR, terminal, and code-review tools for QA.  

Goal: ship the MVP (simplified stack) in ≤ 8 weeks **solo**.

---

## 2. Factory.ai-Optimized Tech Stack  
| Layer | Choice | Why it’s AI-Friendly |
|-------|--------|----------------------|
| Front-/Back-end | **Next.js 15 + TypeScript** | Widely understood by LLMs; unified stack means simpler prompts. |
| Backend-as-a-Service | **Supabase** | Minimal boilerplate; Factory can scaffold DB tables & SQL easily. |
| Styling | **Tailwind CSS** | Declarative utility classes are generated accurately by AI. |
| Auth & Storage | Supabase Auth / Storage | Already has good docs & examples for prompt context. |
| SMS | 2Factor REST | Simple fetch wrapper; Factory can generate typed SDK quickly. |
| Testing | Playwright (e2e) + Vitest (unit) | Frameworks have clear APIs for AI to output tests. |
| CI/CD | GitHub Actions templates | Low-config, easily generated from boilerplate. |

---

## 3. AI-Driven Development Phases  

| Phase | Factory.ai Workflow | Key Prompts |
|------|---------------------|-------------|
| 0. Setup | • Create repo → “Initialize Next.js TS + Supabase env files” <br>• Configure GitHub Actions template | “Generate a Next.js 15 TypeScript starter with supabase-js pre-configured for local dev.” |
| 1. Auth & Landing | • Add Landing page component <br>• OTP login flow <br>• Register SMS templates | “Create a responsive landing page with Tailwind hero section and ‘Get Started’ CTA.” <br>“Implement /login route that calls Supabase OTP auth with 2Factor fallback.” |
| 2. Borrower Forms | • One step at a time: Personal, Property, Financial, Loan | “Scaffold a multi-step React form using useForm + Zod; persist to Supabase table ‘borrowers’.” |
| 3. Offer Engine | • Edge Function file + SQL query | “Write a Supabase Edge Function named match_offers(borrower_id) that returns top 5 offers.” |
| 4. Admin Pages | • /admin route guard <br>• CRUD tables | “Generate an AdminLendersTable component with add/edit/delete using Supabase RPC.” |
| 5. Docs & Notifications | • File upload widget <br>• SMS status updates | “Create a DocumentUpload component limited to PDF/JPG files <10 MB and store privately.” |
| 6. UAT & Hardening | • Generate Playwright tests <br>• Run `npm run test` via terminal toolkit | “Write Playwright tests that cover happy path borrower onboarding and offer display.” |

---

## 4. Prompt Engineering Strategies  

1. **Context first**: paste minimal PRD snippet + current file path.  
2. **One deliverable per prompt**: e.g., “Generate only the component & test.”  
3. **Describe constraints**: performance, file size, RLS security rule.  
4. **Anchor to existing code**: “Following the style in components/Button.tsx…”  
5. **Success criteria**: “Compile without TS errors & pass Vitest.”  
6. **Use incremental diffs**: ask Factory to update just one function when refining.  
7. **Leverage docs**: add Supabase doc link via `@url` before prompting.  

Prompt template:  
```
<system> You are Factory writing code … </system>
<user> Brief context (file path, goal)  
Please create/modify …  
Constraints …  
Output only file content. </user>
```

---

## 5. Code Organization & Consistency  

```
/app
  /(borrower)  – borrower routes
  /admin       – admin routes
/components    – shared UI
/lib           – api, validators
/supabase      – edge functions & SQL
/tests         – e2e + unit
```
Guidelines Factory should follow:  
- **TypeScript strict**; no `any`.  
- **PascalCase** for components, `camelCase` for funcs.  
- Central **tailwind.config.ts** for colours & spacing.  
- Single **zodSchemas.ts** file per domain (borrower, offer).  
- Re-use `supabase.ts` client util across files.

Enforce with `.eslintrc` + Prettier; generate config once and keep in repo.

---

## 6. Testing & Iteration with AI  

| Step | Factory.ai Usage |
|------|------------------|
| Generate test skeletons | “Create Vitest unit tests for comparison_engine.ts.” |
| Auto-run in Terminal | Enable Terminal toolkit → `npm test --watch`. |
| Debug loop | Copy failing stack trace into chat ⇒ “Fix function to satisfy failing test.” |
| e2e | “Create Playwright test for borrower onboarding happy path.” |
| Snapshot review | Use Factory Code Review Droid to flag obvious bugs. |

Best practice: **Red-Green-Refactor** with AI:  
1. Ask Factory to write a failing test for new feature.  
2. Ask Factory to implement code to pass.  
3. Refine prompt to optimize.

---

## 7. Deployment & Management  

1. **Preview flows**: Vercel deploy per PR auto-created by Factory.  
2. **Prod deploy**: Use Factory GitHub tool → squash & merge.  
3. **Secrets**: add via Factory environment manager; never hard-coded.  
4. **Database migrations**: prompt Factory to append SQL in `/supabase/migrations` then run `supabase db push`.  
5. **Rollback**: keep previous tag; Factory can run `vercel deploy --prebuilt` to revert.  

---

## 8. Success Metrics & Quality Control  

| Metric | How to track with Factory.ai |
|--------|-----------------------------|
| Build velocity | #files generated / week (Factory analytics) |
| Test coverage | Vitest coverage report; aim ≥ 80 % |
| Lint errors | ESLint CI must pass 100 % |
| Performance | Next.js Lighthouse in preview must score > 90 mobile |
| Security | Supabase Advisor score “green” before launch |
| Compliance | Checklist in /docs/compliance.md auto-generated by Factory |

---

### Quick-Start Checklist  

- [ ] Create GitHub repo *unbias-lending* in Factory.  
- [ ] Add PRD.md & this build-plan to context panel.  
- [ ] Scaffold Next.js project (prompt).  
- [ ] Configure Supabase keys in Factory env.  
- [ ] Register 2Factor DLT header; add API key to env.  
- [ ] Begin Phase 1 prompts.  

*Build, vibe, iterate – let AI carry the keyboard, you steer the ship.*  