# Unbias Factory - Development Task List

> **Optimized for Coding Agents (Cursor, GitHub Copilot, etc.)**  
> Complete task breakdown from Codebase Analysis + QA Testing Report

## 📋 **TASK OVERVIEW**

| Priority | Category | Tasks | Est. Time | Status |
|----------|----------|-------|-----------|---------|
| 🔴 **Critical** | Build & Deploy | 8 tasks | 4-6 hours | ⏳ Pending |
| 🟠 **High** | Core Functionality | 12 tasks | 1-2 days | ⏳ Pending |
| 🟡 **Medium** | Quality & Testing | 10 tasks | 2-3 days | ⏳ Pending |
| 🟢 **Low** | Enhancement | 6 tasks | 1-2 days | ⏳ Pending |

**Total Estimated Effort**: 1.5-2 weeks

---

## 🔴 **CRITICAL PRIORITY** (Blockers)

> **Must fix immediately - Prevents build/deployment**

### **C1. Fix ESLint Errors (94 total)**
**Priority**: 🔴 Critical  
**Time**: 2-3 hours  
**Agent Instructions**: Use Cursor's auto-fix feature for bulk ESLint corrections

#### **C1.1: Remove Unused Imports**
```bash
# Files affected: Multiple components
# Command for Cursor: "Remove all unused imports"
```
**Files to fix**:
- `src/app/onboarding/steps/ContactStep.tsx` - Remove unused `Button`
- `src/app/onboarding/steps/EmploymentStep.tsx` - Remove unused `Button`, `Select`, `SelectContent`
- Scan all other files for unused imports

**Cursor Prompt**: 
```
"Scan all TypeScript files and remove unused imports. Use ESLint auto-fix for import/no-unused-vars rules."
```

#### **C1.2: Replace 'any' Types with Proper Interfaces**
```typescript
// Files: src/app/offers/page.tsx, src/app/page.tsx, others
// Current: const data: any
// Fix to: const data: OfferResponse | unknown
```

**Files to fix**:
- `src/app/offers/page.tsx:92:66` - `makeAuthenticatedRequest` parameter
- `src/app/offers/page.tsx:106:21` - `validatedOffers.filter` parameter
- `src/app/page.tsx:24:26` - Error handling in catch block

**Cursor Prompt**: 
```
"Replace all 'any' types with proper TypeScript interfaces. Create interfaces for API responses, error objects, and component props."
```

#### **C1.3: Fix React Hooks Dependencies**
```typescript
// File: src/app/offers/page.tsx:60:6
// Missing dependency: fetchOffers in useEffect
```

**Cursor Prompt**: 
```
"Fix all React hooks exhaustive-deps warnings. Add missing dependencies or wrap functions in useCallback."
```

#### **C1.4: Escape HTML Entities in JSX**
```typescript
// Files: Multiple components with unescaped apostrophes
// Fix: Replace ' with &apos; or &#39;
```

**Cursor Prompt**: 
```
"Fix all unescaped HTML entities in JSX. Replace apostrophes with &apos; or &#39;."
```

### **C2. Fix TypeScript Compilation Errors**
**Priority**: 🔴 Critical  
**Time**: 1-2 hours

#### **C2.1: Fix Error Type Handling**
```typescript
// Problem: 'error' is of type 'unknown'
// Files: Multiple catch blocks
```

**Files to fix**:
- `src/app/onboarding/page.tsx:58:42`
- `src/app/page.tsx:24:26`
- `src/components/AuthDiagnostics.tsx:278:18`
- `src/components/AuthFallbackProvider.tsx:72:61`
- `src/components/AuthFallbackProvider.tsx:103:56`
- `src/components/SessionDebugPanel.tsx:61:80`

**Template Fix**:
```typescript
// Replace this pattern:
} catch (error: any) {
  console.error(error.message)
}

// With this pattern:
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  console.error(errorMessage)
}
```

**Cursor Prompt**: 
```
"Fix all TypeScript 'error is of type unknown' issues. Use proper type guards to handle error objects in catch blocks."
```

#### **C2.2: Fix OtpInput Ref Type Mismatch**
```typescript
// File: src/components/OtpInput.tsx:71:11
// Problem: Ref type incompatibility
```

**Current Issue**:
```typescript
// Problem with ref callback return type
ref={(el: HTMLInputElement | null) => HTMLInputElement | null}
```

**Fix**:
```typescript
// Proper ref callback
ref={(el: HTMLInputElement | null) => {
  inputRefs.current[index] = el
}}
```

### **C3. Configure Next.js for Production Build**
**Priority**: 🔴 Critical  
**Time**: 30 minutes

#### **C3.1: Update next.config.ts**
```typescript
// File: next.config.ts
// Add ESLint configuration for build
```

**Current**: Empty config  
**Fix**: Add ESLint ignore for build

```typescript
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false, // Set to true temporarily
  },
  typescript: {
    ignoreBuildErrors: false, // Set to true temporarily
  }
}
```

### **C4. Environment Configuration**
**Priority**: 🔴 Critical  
**Time**: 1 hour

#### **C4.1: Create Comprehensive .env.example**
```bash
# File: .env.example
# Document all required environment variables
```

**Cursor Prompt**: 
```
"Create .env.example file documenting all environment variables used in the codebase. Include Supabase, development flags, and API keys."
```

---

## 🟠 **HIGH PRIORITY** (Core Functionality)

> **Core features needed for MVP**

### **H1. Backend Services Setup**
**Priority**: 🟠 High  
**Time**: 2-4 hours

#### **H1.1: Local Supabase Setup Documentation**
```markdown
# File: docs/LOCAL_SETUP.md
# Complete setup guide for local development
```

**Tasks**:
1. Create Docker Compose configuration
2. Document Supabase CLI setup
3. Create development database seed data
4. Test edge functions locally

**Cursor Prompt**: 
```
"Create comprehensive local development setup documentation. Include Docker, Supabase CLI, and database seeding instructions."
```

#### **H1.2: Alternative Remote Supabase Config**
```typescript
# For teams without Docker access
# Configure remote Supabase instance for development
```

### **H2. Complete Onboarding Flow Testing**
**Priority**: 🟠 High  
**Time**: 3-4 hours

#### **H2.1: Test Each Onboarding Step**
| Step | Component | Test Needed |
|------|-----------|-------------|
| 1 | PropertyStep | ✅ Already tested |
| 2 | LoanStep | Form validation, navigation |
| 3 | PersonalStep | Date validation, age calculation |
| 4 | EmploymentStep | Income validation, employment type logic |
| 5 | ContactStep | Mobile number validation, country codes |
| 6 | OtpStep | OTP input, countdown timer, development mode |

**Cursor Prompt for each step**: 
```
"Test [StepName] component thoroughly. Verify form validation, error handling, navigation, and data persistence."
```

#### **H2.2: End-to-End Flow Testing**
```typescript
// Create test suite for complete user journey
// File: tests/e2e/onboarding.test.ts
```

### **H3. Authentication System Enhancement**
**Priority**: 🟠 High  
**Time**: 2-3 hours

#### **H3.1: Improve Development Mode**
```typescript
// File: src/lib/auth.ts
// Add better development mode detection and fallbacks
```

#### **H3.2: Add Auth State Persistence**
```typescript
// Ensure auth state survives page refreshes
// Improve session management
```

### **H4. API Integration Testing**
**Priority**: 🟠 High  
**Time**: 2-3 hours

#### **H4.1: Test Match Offers Endpoint**
```typescript
// File: supabase/functions/match_offers/index.ts
// Verify security, performance, and response format
```

#### **H4.2: Add Error Handling for API Calls**
```typescript
// Improve error messages and retry logic
// Add timeout handling
```

---

## 🟡 **MEDIUM PRIORITY** (Quality & Testing)

> **Quality improvements and testing infrastructure**

### **M1. Code Quality Improvements**
**Priority**: 🟡 Medium  
**Time**: 1-2 days

#### **M1.1: Add Type Definitions**
```typescript
// File: src/types/index.ts
// Create comprehensive type definitions
```

**Interfaces Needed**:
- `BorrowerProfile`
- `LoanOffer`
- `OfferResponse`
- `AuthSession`
- `ValidationError`

**Cursor Prompt**: 
```
"Create comprehensive TypeScript interfaces for all data structures. Extract types from existing components and API calls."
```

#### **M1.2: Improve Component Props Types**
```typescript
// Add proper prop types for all components
// Remove any remaining 'any' types
```

#### **M1.3: Add JSDoc Documentation**
```typescript
// Document all functions, components, and complex logic
// Add examples for complex components
```

### **M2. Testing Infrastructure**
**Priority**: 🟡 Medium  
**Time**: 1 day

#### **M2.1: Setup Jest and React Testing Library**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

#### **M2.2: Create Component Tests**
**Priority Components to Test**:
1. `BorrowerContext`
2. `WizardLayout`
3. `OtpInput`
4. `AuthFallbackProvider`

#### **M2.3: Add API Testing**
```typescript
// Mock Supabase calls
// Test edge functions
```

### **M3. Performance Optimization**
**Priority**: 🟡 Medium  
**Time**: 1 day

#### **M3.1: Add Performance Monitoring**
```typescript
// Add Web Vitals tracking
// Monitor component render times
```

#### **M3.2: Optimize Bundle Size**
```typescript
// Analyze bundle with @next/bundle-analyzer
// Implement code splitting where needed
```

#### **M3.3: Add Loading States**
```typescript
// Improve user experience with skeleton loaders
// Add progress indicators
```

---

## 🟢 **LOW PRIORITY** (Enhancements)

> **Nice-to-have features and improvements**

### **L1. Developer Experience**
**Priority**: 🟢 Low  
**Time**: 1 day

#### **L1.1: Add Pre-commit Hooks**
```bash
# Setup Husky for git hooks
npm install --save-dev husky lint-staged
```

#### **L1.2: Add VS Code Configuration**
```json
// .vscode/settings.json
// .vscode/extensions.json
// Optimize for team development
```

#### **L1.3: Add Code Generation Scripts**
```bash
# Scripts to generate components, pages, types
# Use plop.js or similar
```

### **L2. Documentation**
**Priority**: 🟢 Low  
**Time**: 1 day

#### **L2.1: API Documentation**
```markdown
# Document all edge functions
# Add request/response examples
```

#### **L2.2: Component Documentation**
```markdown
# Storybook setup
# Component usage examples
```

### **L3. Security Enhancements**
**Priority**: 🟢 Low  
**Time**: 1 day

#### **L3.1: Add Security Headers**
```typescript
// next.config.ts - Add security headers
// Implement CSP, HSTS, etc.
```

#### **L3.2: Audit Dependencies**
```bash
npm audit
# Fix any security vulnerabilities
```

---

## 🛠 **EXECUTION STRATEGY**

### **Phase 1: Critical Fixes (Day 1)**
1. **Morning (2-3 hours)**: Fix all ESLint errors
2. **Afternoon (2-3 hours)**: Fix TypeScript compilation errors
3. **Evening (1 hour)**: Configure build system

### **Phase 2: Core Functionality (Days 2-3)**
1. Setup backend services (Supabase)
2. Test complete onboarding flow
3. Verify authentication system
4. Test API integrations

### **Phase 3: Quality & Testing (Days 4-6)**
1. Add comprehensive type definitions
2. Create testing infrastructure
3. Add component and API tests
4. Performance optimization

### **Phase 4: Enhancements (Days 7-8)**
1. Developer experience improvements
2. Documentation
3. Security enhancements

---

## 🤖 **CURSOR/AI AGENT INSTRUCTIONS**

### **For Maximum Efficiency with Coding Agents:**

1. **Use Cursor's Auto-fix Features**:
   ```
   Cmd+Shift+P → "ESLint: Fix all auto-fixable Problems"
   ```

2. **Bulk Operations**:
   ```
   "Fix all TypeScript errors in the current file"
   "Remove unused imports from all components"
   "Add proper error handling to all catch blocks"
   ```

3. **Generate Code with Context**:
   ```
   "Create TypeScript interface for this API response"
   "Generate test for this component with all props"
   "Add proper JSDoc documentation to this function"
   ```

4. **Pattern-based Fixes**:
   ```
   "Replace all instances of 'any' type with proper interfaces"
   "Update all catch blocks to handle unknown error type"
   "Add loading states to all async operations"
   ```

### **Verification Commands**:
```bash
# After each phase, run these commands:
npm run lint          # Should pass
npm run build         # Should complete
npx tsc --noEmit     # Should have no errors
npm test             # Should pass all tests
```

---

## 📊 **PROGRESS TRACKING**

### **Task Completion Template**:
```markdown
- [ ] C1.1: Remove unused imports
- [ ] C1.2: Replace 'any' types
- [ ] C1.3: Fix React hooks dependencies
- [ ] C1.4: Escape HTML entities
- [ ] C2.1: Fix error type handling
- [ ] C2.2: Fix OtpInput ref type
- [ ] C3.1: Update next.config.ts
- [ ] C4.1: Create .env.example
```

### **Success Criteria**:
- ✅ **Build Success**: `npm run build` completes without errors
- ✅ **Type Safety**: `npx tsc --noEmit` shows no errors
- ✅ **Code Quality**: ESLint shows 0 errors, minimal warnings
- ✅ **Functionality**: All core user flows work end-to-end
- ✅ **Performance**: Page load times < 3 seconds
- ✅ **Testing**: >80% code coverage on critical components

---

## 🎯 **FINAL DELIVERABLES**

After completing all tasks:

1. **Production-ready build** that passes all checks
2. **Comprehensive test suite** with good coverage
3. **Complete documentation** for setup and usage
4. **Type-safe codebase** with proper interfaces
5. **Performance-optimized** application
6. **Secure authentication** flow
7. **Working loan matching** system

---

*This task list is optimized for step-by-step execution with coding agents like Cursor. Each task includes specific prompts and expected outcomes for maximum efficiency.*