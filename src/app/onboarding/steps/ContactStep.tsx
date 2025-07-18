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
      <div className="space-y-6">
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
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>For testing:</strong> Use any valid format number - you&apos;ll receive OTP: <code>123456</code>
            </p>
          </div>
        )}

        {/* Application Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-3">Application Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Property:</span>
              <span>{draft.property_type} in {draft.city}</span>
            </div>
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
          </div>
        </div>
      </div>
    </WizardLayout>
  )
}