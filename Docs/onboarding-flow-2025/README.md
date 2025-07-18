# Onboarding Flow 2025 - Quick Reference

## 🎯 What Changed?
**7-step onboarding → 4-step onboarding**
- **Removed**: Contact & Verification steps
- **Added**: Mobile verification on offers page
- **Result**: Faster completion, better UX

## 📋 New Flow
1. **Property Details** → 2. **Loan Requirements** → 3. **Personal Info** → 4. **Income Details** → **Offers Page** (with mobile verification popup)

## 🚀 Key Changes

| Component | Before | After |
|-----------|--------|-------|
| **Steps** | 7 steps | 4 steps |
| **Button** | "Next" | "Show Offers" |
| **Verification** | Step 6-7 | Offers page popup |
| **Navigation** | Step-by-step | Direct to offers |

## 🔧 Quick Commands

```bash
# Development (bypass auth)
npm run dev

# Production (full validation)
npm run build && npm start

# Test flow
curl http://localhost:3001/offers  # Development
curl http://localhost:3001/offers  # Production (needs step 4)
```

## 🚨 Emergency Rollback

**30-second rollback:**
```bash
# Feature flag toggle (if implemented)
export ENABLE_4_STEP_FLOW=false
```

**5-minute rollback:**
```bash
# Revert to 7-step flow
git checkout HEAD~1 -- src/app/onboarding/
git checkout HEAD~1 -- src/components/WizardLayout.tsx
```

## 📊 Testing Checklist

- [ ] Complete 4-step flow
- [ ] Mobile verification popup
- [ ] Step 4 → offers navigation
- [ ] Production mode validation
- [ ] Auth error handling

## 📞 Support

**Issues?** Check `/rollback.md` for procedures or contact dev team.