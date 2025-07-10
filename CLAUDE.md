# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Unbias Factory is a digital home loan marketplace built with Next.js 15 and Supabase. The platform helps Indian home-loan seekers discover, compare, and apply for loans through an unbiased comparison engine.

## Development Commands

### Core Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality

### Database Operations
- `node scripts/test-connection.js` - Test database connectivity
- `node scripts/check-existing-data.js` - Check existing data in database
- `node scripts/sync-database-schema.js` - Sync database schema
- `node scripts/apply-migration.js` - Apply database migrations
- `node scripts/test-edge-function.js` - Test Supabase edge functions

### Supabase
- Database migrations located in `supabase/migrations/`
- Edge functions in `supabase/functions/`
- Main edge function: `match_offers` - matches loan products to borrowers

## Architecture

### Frontend Architecture
- **Framework**: Next.js 15 with App Router
- **UI Components**: Radix UI with shadcn/ui components
- **Styling**: Tailwind CSS v4
- **State Management**: React Context (BorrowerContext) with localStorage persistence
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with fallback authentication system
- **API**: Supabase Edge Functions (Deno runtime)
- **File Storage**: Supabase Storage

### Key Application Flow
1. **Multi-step Onboarding**: 6-step wizard collecting borrower information
   - Personal details, Property info, Loan requirements, Employment, Contact, OTP verification
2. **Offer Matching**: Supabase edge function `match_offers` runs loan product matching algorithm
3. **Offer Display**: Filtered and ranked loan offers with EMI calculations
4. **Application**: Document upload and lender connection

## Key Directories

### `/src/app/`
- **Main Pages**: Landing page, onboarding wizard, offers dashboard, admin panel
- **onboarding/steps/**: Individual step components for the application wizard
- **admin/**: Admin interface for managing lenders and products

### `/src/components/`
- **UI Components**: Reusable UI components (buttons, forms, modals)
- **Business Components**: Offer filters, OTP inputs, mobile inputs, debug panels
- **Error Handling**: Auth error boundaries and fallback providers

### `/src/contexts/`
- **BorrowerContext**: Central state management for borrower draft data with localStorage persistence

### `/src/lib/`
- **supabase.ts**: Database client configuration
- **auth.ts**: Authentication utilities
- **logger.ts**: Logging utilities
- **utils.ts**: Utility functions

### `/supabase/`
- **migrations/**: Database schema migrations
- **functions/match_offers/**: Core loan matching edge function

## Important Implementation Details

### State Management
- BorrowerContext maintains draft data across the multi-step form
- Data persists in localStorage for user convenience
- Step navigation handled through context methods

### Authentication System
- Dual auth system: Supabase Auth with fallback authentication
- AuthErrorBoundary catches and handles auth failures
- Session management with health indicators

### Security Features
- Edge function includes user authorization checks
- Borrower data access restricted to authenticated users
- CORS headers properly configured

### Database Integration
- Custom SQL function `match_products` for loan matching
- EMI calculations performed in edge function
- Migration scripts for schema management

## Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for edge functions)

## Key Features
- Unbiased loan comparison engine
- Multi-step borrower onboarding
- Real-time offer matching with EMI calculations
- Admin panel for managing loan products
- Responsive design with mobile-first approach