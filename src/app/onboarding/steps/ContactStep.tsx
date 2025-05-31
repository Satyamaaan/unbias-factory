'use client'
import { useState } from 'react'
import { WizardLayout } from "@/components/WizardLayout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useBorrower } from "@/contexts/BorrowerContext"

export function ContactStep() {
  const { draft, updateDraft, nextStep, prevStep } = useBorrower()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSendingOtp, setIsSendingOtp] = useState(false)

  const handleSendOtp = async () => {
    const newErrors: Record<string, string> = {}
    
    if (!draft.mobile) {
      newErrors.mobile = 'Please enter your mobile number'
    } else if (!/^[6-9]\d{9}$/.test(draft.mobile)) {
      newErrors.mobile = 'Please enter a valid Indian mobile number'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      setIsSendingOtp(true)
      
      try {
        const phone = `+91${draft.mobile}`
        
        console.log('Sending OTP to:', phone)
        
        const { error } = await supabase.auth.signInWithOtp({
          phone,
          options: {
            channel: 'sms'
          }
        })

        if (error) {
          throw error
        }

        console.log('✅ OTP sent successfully to:', phone)
        nextStep() // Move to OTP verification step

      } catch (error: any) {
        console.error('❌ Send OTP error:', error)
        
        // Handle specific error cases
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
  }

  const isValidMobile = draft.mobile && /^[6-9]\d{9}$/.test(draft.mobile)

  return (
    <WizardLayout
      title="Contact Information"
      description="We'll send you an OTP to verify your mobile number"
      onNext={handleSendOtp}
      onBack={prevStep}
      nextLabel={isSendingOtp ? "Sending OTP..." : "Send OTP"}
      nextDisabled={!isValidMobile || isSendingOtp}
      showProgress={true}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="mobile">Mobile Number</Label>
          <div className="flex">
            <div className="flex items-center px-3 bg-gray-50 border border-r-0 rounded-l-md">
              <span className="text-sm text-gray-600">+91</span>
            </div>
            <Input
              id="mobile"
              type="tel"
              placeholder="9876543210"
              className="rounded-l-none"
              value={draft.mobile || ''}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                updateDraft({ mobile: value })
                // Clear errors when user types
                if (errors.mobile) {
                  setErrors({})
                }
              }}
            />
          </div>
          {errors.mobile && (
            <p className="text-sm text-red-600 mt-1">{errors.mobile}</p>
          )}
          {isValidMobile && !errors.mobile && (
            <p className="text-sm text-green-600 mt-1">✅ Valid mobile number</p>
          )}
        </div>

        {/* Development testing helper */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>For testing:</strong> Use test number <code>5551234567</code> - you'll receive OTP: <code>123456</code>
          </p>
        </div>

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