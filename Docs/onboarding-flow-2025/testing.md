# Testing Checklist - Onboarding Flow 2025

## ✅ Pre-Deployment Testing

### **1. Development Mode Testing**
- [ ] Start with: `npm run dev`
- [ ] Navigate to: `http://localhost:3001/onboarding`

#### **Step-by-Step Verification**
1. **Property Step**
   - [ ] Can select property type
   - [ ] Can enter property value
   - [ ] "Next" button enables after valid input

2. **Loan Step**
   - [ ] Can enter loan amount
   - [ ] Can select tenure
   - [ ] Validation works correctly

3. **Personal Step**
   - [ ] Name field works
   - [ ] DOB picker works
   - [ ] Form validation triggers

4. **Income Step**
   - [ ] "Show Offers" button appears (not "Next")
   - [ ] Button enables after valid income input
   - [ ] Clicking navigates to `/offers`

#### **Offers Page Verification**
- [ ] Loads without auth validation
- [ ] Shows 2 mock offers (HDFC, ICICI)
- [ ] Mobile verification popup appears
- [ ] OTP verification works (use 123456)

### **2. Production Mode Testing**
- [ ] Build with: `npm run build`
- [ ] Start with: `npm start`

#### **Auth Validation Testing**
1. **Incomplete Flow**
   - [ ] Navigate directly to `/offers` (should redirect to onboarding)
   - [ ] Check redirect happens correctly

2. **Complete Flow**
   - [ ] Complete all 4 steps
   - [ ] Verify step 4 completion in draft
   - [ ] Navigate to `/offers` (should load)
   - [ ] Check mobile verification popup appears

### **3. Cross-Browser Testing**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### **4. Mobile Testing**
- [ ] iPhone Safari
- [ ] Android Chrome
- [ ] Responsive design works
- [ ] Touch interactions work

### **5. Error Handling Testing**
- [ ] Invalid input validation
- [ ] Network error handling
- [ ] Auth session expiration
- [ ] Step completion edge cases

## 🔍 Post-Deployment Monitoring

### **Real-Time Checks**
- [ ] Monitor conversion rates
- [ ] Check error logs
- [ ] Verify mobile verification success rates
- [ ] Monitor page load times

### **User Journey Testing**
```bash
# Automated test script
npm run test:e2e -- --spec="cypress/integration/onboarding-flow.spec.js"
```

## 📊 Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| **4-step completion** | ≥80% | Google Analytics |
| **Mobile verification** | ≥85% | Backend logs |
| **Error rate** | <1% | Error tracking |
| **Page load time** | <2s | Web Vitals |

## 🚨 Edge Cases to Test

### **Data Persistence**
- [ ] Refresh browser during flow
- [ ] Close tab and reopen
- [ ] Clear browser storage
- [ ] Network interruption

### **Validation Edge Cases**
- [ ] Very large numbers in income
- [ ] Special characters in name
- [ ] Future date for DOB
- [ ] Negative numbers

### **Auth Scenarios**
- [ ] Session timeout during flow
- [ ] Logout during flow
- [ ] Multiple browser tabs
- [ ] Incognito mode

## 🎯 Quick Test Commands

```bash
# Development testing
npm run dev
open http://localhost:3001/onboarding

# Production simulation
NODE_ENV=production npm run dev

# Test specific scenarios
npm run test -- --grep="onboarding"
npm run cypress:open
```

## 📞 Test Results Template

```
Date: [DATE]
Tester: [NAME]
Environment: [dev/staging/prod]

Results:
✅ 4-step flow: PASS/FAIL
✅ Mobile verification: PASS/FAIL  
✅ Error handling: PASS/FAIL
✅ Cross-browser: PASS/FAIL

Issues Found:
- [Describe any issues]

Next Steps:
- [Action items]
```