# Onboarding Flow Changes

## Overview
This document outlines the changes needed to modify the onboarding flow to skip directly to offers after income information, with mobile verification as a gate.

## Current Flow
1. Personal Details
2. Property Information
3. Loan Requirements
4. Employment Details
5. **Income Information** (Employment2Step)
6. Contact Information
7. OTP Verification
8. Offers Page

## New Flow
1. Personal Details
2. Property Information
3. Loan Requirements
4. Employment Details
5. **Income Information** (Employment2Step) → **"Show Offers" button**
6. **Offers Page** (with verification popup)
7. **Mobile Verification Popup** → OTP Input → Unlocked Offers

## Changes Required

### 1. Income Step (Employment2Step.tsx)
- Change button text from "Next" to "Show Offers"
- Skip contact information and OTP steps
- Navigate directly to offers page

### 2. Offers Page (/offers)
- Add verification popup overlay
- Display message: "We found X offers for you, verify with your mobile number to see them"
- Show mobile number input field
- Show OTP input after mobile submission
- Unlock offers only after successful verification

### 3. Verification Popup Component
- Modal overlay with mobile number input
- OTP input section
- Countdown timer for OTP resend
- Error handling for invalid OTP
- Success state that unlocks offers

### 4. State Management
- Track verification status in BorrowerContext
- Store mobile number and verification state
- Handle edge cases for already verified users

### 5. Navigation Changes
- Skip ContactStep and OtpStep in onboarding
- Direct navigation from income to offers
- Handle back navigation from offers

## Technical Implementation Details

### Files to Modify
- `src/app/onboarding/steps/Employment2Step.tsx` - Change button text and navigation
- `src/app/offers/page.tsx` - Add verification popup
- `src/contexts/BorrowerContext.tsx` - Add verification state
- Create new component: `src/components/VerificationPopup.tsx`

### New Components
- `VerificationPopup.tsx` - Mobile verification modal
- Update navigation logic in `BorrowerContext`

### Data Flow
1. User completes income step → clicks "Show Offers"
2. Navigate to `/offers` with verification popup active
3. User enters mobile → receives OTP
4. OTP verification → unlock offers display
5. Store verification state for future sessions

## Edge Cases to Handle
- User already verified in previous session
- Invalid mobile number format
- OTP expiration
- Network failures during verification
- Back navigation from offers page

## Testing Checkpoints
- [ ] Income step shows "Show Offers" button
- [ ] Direct navigation to offers page
- [ ] Verification popup appears on offers page
- [ ] Mobile input validation works
- [ ] OTP verification flow complete
- [ ] Offers unlock after verification
- [ ] State persists across page refreshes