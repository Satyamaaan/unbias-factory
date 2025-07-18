# Deployment Guide - Onboarding Flow 2025

## 🚀 5-Step Deployment Process

### **Step 1: Pre-Deployment Check (2 minutes)**
```bash
# Verify current state
git status
git log --oneline -5
npm run lint
```

### **Step 2: Environment Setup (1 minute)**
```bash
# Verify environment variables
echo $NODE_ENV
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### **Step 3: Build & Test (3 minutes)**
```bash
# Build for production
npm run build

# Run tests
npm run test

# Start production server
npm run start
```

### **Step 4: Deploy (2 minutes)**
```bash
# Deploy to staging first
npm run deploy:staging

# Verify staging deployment
curl https://staging.yourapp.com/health

# Deploy to production
npm run deploy:production
```

### **Step 5: Post-Deployment Verification (2 minutes)**
```bash
# Verify deployment
open https://yourapp.com/onboarding

# Check monitoring
dashboard.yourapp.com/onboarding-metrics
```

## 📋 Quick Deployment Checklist

### **Before Deploy**
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Team notified
- [ ] Monitoring alerts configured

### **During Deploy**
- [ ] Staging deployment successful
- [ ] Smoke tests passing
- [ ] Error rates normal
- [ ] Performance metrics stable

### **After Deploy**  
- [ ] Production deployment successful
- [ ] User monitoring active
- [ ] Support team notified
- [ ] Status page updated

## 🔧 Deployment Commands

### **Quick Deploy**
```bash
# One-command deployment
npm run deploy:production -- --message="Deploy 4-step onboarding flow"
```

### **Staged Deployment**
```bash
# Deploy to 10% users first
npm run deploy:canary -- --percentage=10

# Monitor for 1 hour
npm run monitor:onboarding

# Deploy to 100% users
npm run deploy:full
```

## 🚨 Emergency Procedures

### **Immediate Rollback**
```bash
# Quick rollback to previous version
npm run rollback:immediate

# Or manual rollback
git revert HEAD
npm run deploy:production
```

### **Monitoring During Deploy**
```bash
# Real-time monitoring
npm run monitor:realtime -- --service=onboarding

# Error rate monitoring
npm run monitor:errors -- --threshold=1%
```

## 📊 Success Criteria

**Deployment Success Indicators:**
- ✅ Build completes without errors
- ✅ All tests pass
- ✅ Staging deployment successful
- ✅ Production deployment successful
- ✅ No increase in error rates
- ✅ No performance degradation

## 📞 Emergency Contacts

| Role | Contact | Response Time |
|------|---------|---------------|
| **Dev Lead** | [Your email] | 5 minutes |
| **DevOps** | [Your contact] | 2 minutes |
| **Product** | [Your contact] | 10 minutes |

## 🔗 Related Resources

- **Rollback Guide**: `./rollback.md`
- **Testing Checklist**: `./testing.md`
- **Monitoring Dashboard**: `https://yourapp.com/monitoring`
- **Status Page**: `https://status.yourapp.com`

## 🎯 Deployment Timeline

| Phase | Duration | Action |
|-------|----------|--------|
| **Pre-deploy** | 2 min | Verify environment |
| **Build** | 3 min | Build and test |
| **Staging** | 2 min | Deploy to staging |
| **Production** | 2 min | Deploy to production |
| **Verification** | 2 min | Post-deploy checks |
| **Total** | **11 min** | Complete deployment |