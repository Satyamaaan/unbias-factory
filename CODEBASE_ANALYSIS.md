# Unbias Factory - Codebase Analysis

## Overview

**Unbias Factory** is a sophisticated digital home loan marketplace built with Next.js, TypeScript, and Supabase. The application helps borrowers find the best home loan offers by removing bias and providing transparent comparisons across multiple lenders.

## Technology Stack

### Frontend
- **Framework**: Next.js 15.3.3 with App Router
- **Language**: TypeScript
- **UI Library**: Radix UI components + custom components
- **Styling**: Tailwind CSS v4
- **Form Management**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Animations**: tw-animate-css

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with SMS OTP
- **Edge Functions**: Deno-based Supabase functions
- **Real-time**: Supabase Realtime (enabled)

## Core Functionality

### 1. User Onboarding Flow
The application features a 6-step wizard-based onboarding process:

1. **Property Details** (`PropertyStep.tsx`)
   - Property type selection (apartment, independent house, villa, plot)
   - Property value estimation
   - City selection from predefined list

2. **Loan Requirements** (`LoanStep.tsx`)
   - Loan amount required input
   - Automatic validation against property value

3. **Personal Information** (`PersonalStep.tsx`)
   - Date of birth collection
   - Age-based eligibility checking

4. **Employment Details** (`EmploymentStep.tsx`)
   - Employment type (salaried vs self-employed)
   - Income information (gross salary or annual net profit)
   - Existing EMI details

5. **Contact Information** (`ContactStep.tsx`)
   - Mobile number with country code selection
   - SMS-based OTP verification setup

6. **OTP Verification** (`OtpStep.tsx`)
   - 6-digit OTP input with countdown timer
   - Development mode bypass (OTP: 123456)
   - Automatic borrower profile creation upon verification

### 2. Intelligent Loan Matching Engine

#### Core Algorithm (`supabase/functions/match_offers/index.ts`)
The matching engine uses a sophisticated SQL-based algorithm that:

- **Security**: Validates borrower ownership before processing
- **EMI Calculation**: Computes monthly payments using standard loan formulas
- **Multi-criteria Matching**: Evaluates eligibility across multiple dimensions

#### Database Schema
**Borrowers Table**: Stores verified user profiles
```sql
- id (UUID, primary key)
- employment_type, income details
- property information
- loan requirements
- verification status
- CIBIL score
```

**Products Table**: Loan products from various lenders
```sql
- lender_id, product details
- interest rate ranges
- eligibility criteria
- processing fees
- loan limits and tenure
```

**Product Rules**: Flexible eligibility rules system
```sql
- rule_key/rule_value pairs
- JSON-based rule definitions
- Extensible for complex criteria
```

#### Matching Criteria
1. **Basic Eligibility**:
   - Age limits (origination and maturity)
   - Income requirements
   - Credit score thresholds
   - Loan-to-Value (LTV) ratios

2. **Advanced Filters**:
   - Employment type compatibility
   - Property type acceptance
   - Geographic restrictions
   - FOIR (Fixed Obligation to Income Ratio) limits

3. **Scoring & Ranking**:
   - Interest rate (primary sort)
   - Processing fees (secondary sort)
   - Future: Match score based on borrower profile

### 3. Authentication System

#### Multi-layered Auth Architecture
- **Primary**: Supabase Auth with SMS OTP
- **Fallback**: Custom fallback auth system (`AuthFallbackProvider.tsx`)
- **Session Management**: Robust session handling with automatic refresh
- **Security**: Row Level Security (RLS) policies

#### Key Features
- **Development Mode**: Bypass for testing (OTP: 123456)
- **Session Health Monitoring**: Real-time session status tracking
- **Error Recovery**: Automatic retry mechanisms
- **Comprehensive Logging**: Detailed auth event tracking

### 4. State Management

#### Borrower Context (`BorrowerContext.tsx`)
- **Draft State**: Local storage persistence
- **Step Navigation**: Wizard flow control
- **Data Persistence**: Automatic saving of form progress
- **Type Safety**: Full TypeScript interface definitions

#### Context Structure
```typescript
interface BorrowerDraft {
  // Property details
  property_type?: string
  property_value_est?: number
  city?: string
  
  // Loan details
  loan_amount_required?: number
  
  // Personal & employment
  dob?: string
  employment_type?: string
  gross_salary?: number
  annual_net_profit?: number
  
  // Contact & verification
  mobile?: string
  verified?: boolean
  current_step?: number
}
```

### 5. UI Components

#### Custom Component Library
Located in `src/components/ui/`:
- **Form Components**: Input, Label, Select with validation
- **Layout Components**: Card, Button, Badge, Tabs
- **Progress Indicators**: Progress bar, loading states

#### Specialized Components
- **`OtpInput.tsx`**: Custom 6-digit OTP input with auto-focus
- **`OtpCountdown.tsx`**: Resend timer with visual feedback
- **`MobileInput.tsx`**: Country code + mobile number input
- **`CountryCodeSelect.tsx`**: Dropdown for country codes
- **`WizardLayout.tsx`**: Consistent step-by-step layout

### 6. Development & Debugging Tools

#### Debug Components
- **`DebugPanel.tsx`**: Real-time state inspection
- **`SessionDebugPanel.tsx`**: Auth session monitoring
- **`LogViewer.tsx`**: Application log viewer
- **`AuthDiagnostics.tsx`**: Comprehensive auth system diagnostics

#### Logging System (`logger.ts`)
- **Structured Logging**: Categorized log levels
- **Browser Storage**: Client-side log persistence
- **Auth-specific Logging**: Detailed authentication event tracking
- **Performance Metrics**: Request timing and error tracking

### 7. Database Design

#### Core Tables
1. **`borrower_drafts`**: Pre-verification user data
2. **`borrowers`**: Verified user profiles
3. **`lenders`**: Financial institutions
4. **`products`**: Loan products
5. **`product_rules`**: Flexible eligibility rules
6. **`offers`**: Generated loan offers

#### Security Features
- **Row Level Security (RLS)**: Data isolation per user
- **JWT Validation**: Server-side token verification
- **Audit Trails**: Created/updated timestamps
- **Data Anonymization**: Session-based access for drafts

### 8. API Architecture

#### Supabase Edge Functions
- **`match_offers`**: Core loan matching algorithm
- **Security**: JWT token validation
- **Performance**: Optimized SQL queries with indexes
- **Error Handling**: Comprehensive error responses

#### Function Security
```typescript
// Critical security check
const { data: borrowerCheck } = await supabase
  .from('borrowers')
  .select('id')
  .eq('id', borrower_id)
  .eq('id', user.id) // Ensures ownership
  .single()
```

### 9. Configuration & Environment

#### Supabase Configuration
- **Local Development**: Full local stack with Docker
- **Database Migrations**: Version-controlled schema changes
- **Seed Data**: Test borrowers and loan products
- **Edge Runtime**: Deno-based function execution

#### Environment Features
- **Development Mode**: OTP bypass and enhanced logging
- **Production Ready**: Rate limiting and security hardening
- **Monitoring**: Health checks and diagnostics

## Key Features & Differentiators

### 1. Unbiased Comparison
- **Transparent Ranking**: Interest rate and fee-based sorting
- **No Hidden Preferences**: Algorithm treats all lenders equally
- **Complete Information**: All fees and terms displayed

### 2. Smart Eligibility Matching
- **Pre-qualification**: Only shows eligible offers
- **Comprehensive Criteria**: Multi-dimensional matching
- **Real-time Validation**: Instant feedback on eligibility

### 3. Mobile-First Experience
- **OTP Authentication**: No passwords or complex setup
- **Progressive Web App**: Mobile-optimized interface
- **Offline Capability**: Local storage for draft persistence

### 4. Developer Experience
- **Type Safety**: Full TypeScript coverage
- **Debug Tools**: Comprehensive debugging interface
- **Hot Reload**: Turbopack-enabled development
- **Testing Support**: Development mode bypasses

### 5. Security & Privacy
- **Data Encryption**: Supabase-managed encryption
- **Minimal Data Collection**: Only loan-relevant information
- **User Control**: Clear consent and data ownership
- **GDPR Compliance**: Right to data deletion

## Architecture Patterns

### 1. Component Composition
- **Compound Components**: Wizard steps with shared layout
- **Provider Pattern**: Context-based state management
- **Higher-Order Components**: Error boundaries and auth wrappers

### 2. State Management
- **Local State**: React useState for component-specific data
- **Global State**: Context API for shared borrower data
- **Persistent State**: localStorage for draft persistence
- **Server State**: Supabase for verified data

### 3. Error Handling
- **Error Boundaries**: Component-level error isolation
- **Fallback UI**: Graceful degradation for auth failures
- **Retry Logic**: Automatic recovery for network issues
- **User Feedback**: Clear error messages and guidance

### 4. Performance Optimization
- **Code Splitting**: Next.js automatic route-based splitting
- **Image Optimization**: Next.js built-in optimization
- **Database Indexing**: Strategic indexes for query performance
- **Caching**: Supabase query caching and CDN

## Future Enhancements

### Planned Features
1. **Credit Score Integration**: Real-time CIBIL score fetching
2. **Document Upload**: KYC document verification
3. **Loan Tracking**: Application status monitoring
4. **Comparison Analytics**: Advanced offer comparison tools
5. **Lender Integration**: Direct application submission

### Technical Improvements
1. **A/B Testing**: Feature flag system
2. **Analytics**: User journey tracking
3. **Performance Monitoring**: Real-time performance metrics
4. **Automated Testing**: E2E test coverage
5. **CI/CD Pipeline**: Automated deployment

## Conclusion

Unbias Factory represents a well-architected, modern web application that successfully addresses the complexity of home loan comparison. The codebase demonstrates strong engineering practices including:

- **Security-first approach** with comprehensive authentication
- **User-centric design** with intuitive onboarding flow
- **Scalable architecture** supporting multiple lenders and products
- **Developer-friendly** with extensive debugging and logging tools
- **Performance-optimized** with smart caching and indexing strategies

The application is production-ready with robust error handling, comprehensive logging, and strong security measures, making it a solid foundation for a digital lending marketplace.