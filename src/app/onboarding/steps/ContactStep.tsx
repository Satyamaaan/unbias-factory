'use client'
import { useState } from 'react'
import { WizardLayout } from "@/components/WizardLayout"
import { MobileInput } from "@/components/MobileInput"
import { supabase } from "@/lib/supabase"
import { useBorrower } from "@/contexts/BorrowerContext"

export function ContactStep() {
  const { draft, updateDraft, nextStep, prevStep } = useBorrower()
  const [countryCode, setCountryCode] = useState('+91')
  const [phoneNumber, setPhoneNumber] = useState(draft.mobile || '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSendingOtp, setIsSendingOtp] = useState(false)

  const validateMobileNumber = (number: string, code: string) => {
    if (!number) return 'Please enter your mobile number'
    
    const cleanNumber = number.replace(/\D/g, '')
    
    switch (code) {
      case '+91':
        if (!/^[6-9]\d{9}$/.test(cleanNumber)) {
          return 'Please enter a valid Indian mobile number (10 digits starting with 6-9)'
        }
        break
      case '+1':
        if (!/^\d{10}$/.test(cleanNumber)) {
          return 'Please enter a valid US/Canada phone number (10 digits)'
        }
        break
      case '+44':
        if (!/^\d{10,11}$/.test(cleanNumber)) {
          return 'Please enter a valid UK phone number (10-11 digits)'
        }
        break
      default:
        if (cleanNumber.length < 7 || cleanNumber.length > 15) {
          return 'Please enter a valid phone number (7-15 digits)'
        }
    }
    
    return null
  }

  const handleSendOtp = async () => {
    const validationError = validateMobileNumber(phoneNumber, countryCode)
    
    if (validationError) {
      setErrors({ mobile: validationError })
      return
    }

    setErrors({})
    setIsSendingOtp(true)
    
    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`
      
      console.log('Sending OTP to:', fullPhoneNumber)
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhoneNumber,
        options: {
          channel: 'sms'
        }
      })

      if (error) {
        throw error
      }

      // Update draft with mobile number
      updateDraft({ 
        mobile: phoneNumber.replace(/\D/g, ''),
        country_code: countryCode 
      })

      console.log('✅ OTP sent successfully to:', fullPhoneNumber)
      nextStep() // Move to OTP verification step

    } catch (error: any) {
      console.error('❌ Send OTP error:', error)
      
      if (error.message?.includes('rate limit')) {
        setErrors({ mobile: 'Too many OTP requests. Please wait before trying again.' })
      } else if (error.message?.includes('invalid')) {
        setErrors({ mobile: 'Invalid phone number format' })
      } else {
        setErrors({ mobile: error.message || 'Failed to send OTP. Please try again.' })
      }
    } finally {
      setIsSendingOtp(false)
    }
  }

  const isValidMobile = !validateMobileNumber(phoneNumber, countryCode)

  return (
    <WizardLayout
      title="Verify Your Mobile Number"
      description="We&apos;ll send you a verification code to confirm your mobile number"
      onNext={handleSendOtp}
      onBack={prevStep}
      nextLabel={isSendingOtp ? "Sending OTP..." : "Send Verification Code"}
      nextDisabled={!isValidMobile || isSendingOtp}
      showProgress={true}
    >
      <div className="space-y-4">
        <div className="space-y-4">
          <MobileInput
            countryCode={countryCode}
            phoneNumber={phoneNumber}
            onCountryCodeChange={setCountryCode}
            onPhoneNumberChange={setPhoneNumber}
            error={errors.mobile}
            disabled={isSendingOtp}
          />

          {/* Development testing helper */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>For testing:</strong> Use any valid format number - you&apos;ll receive OTP: <code>123456</code>
              </p>
            </div>
          )}

          {/* Application Summary */}
          <div className="p-3 bg-accent rounded-lg border border-border">
            <h3 className="font-semibold mb-3 text-sm lg:text-base">Application Summary</h3>
            <div className="space-y-2 text-xs lg:text-sm">
              <div className="flex justify-between">
                <span>Name:</span>
                <span>{draft.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Property:</span>
                <span>{draft.property_type} in {draft.city}</span>
              </div>
              {draft.pincode && (
                <div className="flex justify-between">
                  <span>Pincode:</span>
                  <span>{draft.pincode}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Property Value:</span>
                <span>₹{draft.property_value_est?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Loan Amount:</span>
                <span>₹{draft.loan_amount_required?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Employment:</span>
                <span>{draft.employment_type?.replace('_', ' ')}</span>
              </div>
              {draft.employment_type === 'salaried' && (
                <>
                  <div className="flex justify-between">
                    <span>Monthly Salary:</span>
                    <span>₹{draft.gross_salary?.toLocaleString('en-IN')}</span>
                  </div>
                  {draft.other_income && draft.other_income > 0 && (
                    <div className="flex justify-between">
                      <span>Other Income:</span>
                      <span>₹{draft.other_income?.toLocaleString('en-IN')}/month</span>
                    </div>
                  )}
                </>
              )}
              {draft.employment_type?.includes('self_employed') && (
                <>
                  <div className="flex justify-between">
                    <span>Annual Profit:</span>
                    <span>₹{draft.annual_net_profit?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ITR Years:</span>
                    <span>{draft.itr_years} years</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span>Existing EMI:</span>
                <span>₹{draft.existing_emi?.toLocaleString('en-IN')}/month</span>
              </div>
              <div className="flex justify-between">
                <span>Co-applicant:</span>
                <span>{draft.has_coapplicant ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WizardLayout>
  )
}