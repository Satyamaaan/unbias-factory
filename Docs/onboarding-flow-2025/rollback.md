# Emergency Rollback Procedures

## 🚨 3-Second Emergency Rollback

**Feature Flag Method** (if implemented):
```javascript
// Add to .env.local
ENABLE_4_STEP_FLOW=false
npm run dev
```

## ⏱️ 30-Second Rollback

**Step 1: Identify Current State**
```bash
cd /Users/macbook/Documents/01_Projects/Research_and_Concepts/Manual Library/unbias-factory
```

**Step 2: Revert Key Files**
```bash
# Backup current state
cp -r src/app/onboarding src/app/onboarding.4step.backup
cp src/components/WizardLayout.tsx src/components/WizardLayout.4step.backup

# Restore original files (if available)
git checkout HEAD~1 -- src/app/onboarding/
git checkout HEAD~1 -- src/components/WizardLayout.tsx
git checkout HEAD~1 -- src/app/offers/page.tsx
```

## 🔧 5-Minute Manual Rollback

### **Step 1: Revert WizardLayout (7 steps)**
```typescript
// src/components/WizardLayout.tsx - Restore these steps
const STEPS = [
  { number: 1, title: "Property Details", description: "Tell us about your property" },
  { number: 2, title: "Loan Requirements", description: "Your loan amount and tenure" },
  { number: 3, title: "Personal Information", description: "Basic details about you" },
  { number: 4, title: "Employment Details", description: "Your work and income" },
  { number: 5, title: "Contact Verification", description: "Verify your contact details" }
]
```

### **Step 2: Restore Navigation**
```typescript
// src/app/onboarding/steps/Employment2Step.tsx - Change back
updateDraft({ current_step: 5 }) // Instead of 4
// Navigate to nextStep() instead of /offers
```

### **Step 3: Restore Offers Page Auth**
```typescript
// src/app/offers/page.tsx - Remove environment bypass
// Restore full auth validation
```

## 📋 Rollback Checklist

**Before Rollback:**
- [ ] Notify team via Slack #deployments
- [ ] Check active user sessions
- [ ] Document rollback reason
- [ ] Verify backup exists

**During Rollback:**
- [ ] Stop production traffic (if needed)
- [ ] Execute rollback commands
- [ ] Test basic functionality
- [ ] Monitor error logs

**After Rollback:**
- [ ] Notify stakeholders
- [ ] Update status page
- [ ] Document lessons learned
- [ ] Plan fix timeline

## 🔄 Safe Rollback Strategy

### **Gradual Rollback (Recommended)**
1. **Feature Flag Toggle** (30 seconds)
2. **Code Reversion** (5 minutes) 
3. **Database Rollback** (if schema changes)

### **Emergency Contacts**
- **Dev Team**: [Your contact]
- **DevOps**: [Your contact]  
- **Product**: [Your contact]

## 🎯 Testing After Rollback

```bash
# Quick test
curl -I http://localhost:3001/onboarding
# Should show 7 steps again

# Full test
npm run build
npm run start
# Navigate through all 7 steps
```

## 📞 Emergency Procedures

**Critical Issue:**
1. **Slack**: #emergency-onboarding
2. **Phone**: [Emergency number]
3. **Email**: [Emergency group]

**Rollback Decision Matrix:**
- **>10% drop in conversion**: Immediate rollback
- **>5% increase in errors**: 15-minute rollback
- **User complaints**: 30-minute rollback

## 🔗 Related Files

**Files to Monitor:**
- `src/app/onboarding/steps/Employment2Step.tsx`
- `src/components/WizardLayout.tsx`
- `src/app/offers/page.tsx`
- `src/contexts/BorrowerContext.tsx`

**Backup Location:**
```bash
./backups/onboarding-flow-2025/
├── before-4step/
├── rollback-scripts/
└── emergency-procedures/
```