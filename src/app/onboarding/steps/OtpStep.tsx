'use client'
import { useState } from 'react'
import { WizardLayout } from "@/components/WizardLayout"
import { OtpInput } from "@/components/OtpInput"
import { OtpCountdown } from "@/components/OtpCountdown"
import { supabase } from "@/lib/supabase"
import { useBorrower } from "@/contexts/BorrowerContext"
import { useRouter } from 'next/navigation'
import { clientRateLimiter, otpRateLimits } from "@/lib/rateLimiter"

export function OtpStep() {
  const { draft, updateDraft, prevStep } = useBorrower()
  const router = useRouter()
  const [otp, setOtp] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resendKey, setResendKey] = useState(0) // Key to reset countdown

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP')
      return
    }

    setIsVerifying(true)
    setError('')
    setSuccess('')

    try {
      // Check rate limit before verification
      const rateLimit = clientRateLimiter.checkLimit(
        otpRateLimits.verify.identifier,
        otpRateLimits.verify.maxRequests,
        otpRateLimits.verify.windowMs
      )

      if (!rateLimit.allowed) {
        setError(`Too many verification attempts. Please wait ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.`)
        setIsVerifying(false)
        return
      }

      // Production: Real Supabase verification
      const countryCode = draft.country_code || '+91'
      const phone = `${countryCode}${draft.mobile}`
      console.log('Verifying OTP:', otp, 'for phone:', phone)
      
      const { data: authData, error: authError } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms'
      })

      if (authError) {
        throw authError
      }

      if (authData.user) {
        console.log('✅ OTP verified successfully for user:', authData.user.id)
        
        updateDraft({ 
          verified: true,
          user_id: authData.user.id 
        })
        
        // Finalize the draft - move to borrowers table
        try {
          console.log('Calling finalize_draft with:', { draft_data: draft, auth_user_id: authData.user.id })
          const { data: rpcData, error: finalizeError } = await supabase
            .rpc('finalize_draft', {
              draft_data: draft,
              auth_user_id: authData.user.id
            })
          
          if (finalizeError) {
            throw finalizeError
          }
          
          console.log('✅ Draft finalized with borrower ID:', rpcData)
          updateDraft({ borrower_id: rpcData })
          setSuccess('Mobile number verified successfully! Redirecting to offers...')
          
          setTimeout(() => {
            router.push('/offers')
          }, 2000)

        } catch (finalizeRpcError: any) {
          console.error('❌ Failed to finalize draft:', finalizeRpcError)
          setError('Verification successful, but failed to save your application data. Please try again or contact support. Error: ' + finalizeRpcError.message)
          return
        }
      } else {
        setError('OTP verification did not return a user session. Please try again.')
      }

    } catch (error: any) {
      console.error('❌ OTP verification process error:', error)
      if (error.message?.includes('invalid') || error.message?.includes('expired') || error.message?.includes('Token has expired or is invalid')) {
        setError('Invalid or expired OTP. Please try again.')
      } else if (error.message?.includes('rate limit') || error.message?.includes('Too many requests')) {
        setError('Too many attempts. Please wait a few minutes before trying again.')
      } else {
        setError(error.message || 'Verification failed. Please check the OTP and try again.')
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const resendOtp = async () => {
    setIsResending(true)
    setError('')
    setSuccess('')

    try {
      // Check rate limit before resending
      const rateLimit = clientRateLimiter.checkLimit(
        otpRateLimits.resend.identifier,
        otpRateLimits.resend.maxRequests,
        otpRateLimits.resend.windowMs
      )

      if (!rateLimit.allowed) {
        setError(`Too many resend attempts. Please wait ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000 / 60)} minutes.`)
        setIsResending(false)
        return
      }

      const countryCode = draft.country_code || '+91'
      const phone = `${countryCode}${draft.mobile}`
      console.log('Resending OTP to:', phone)
      
      // Production: Real Supabase OTP resend
      const { error: resendError } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          channel: 'sms'
        }
      })

      if (resendError) {
        throw resendError
      }

      console.log('✅ OTP resent successfully')
      setSuccess('A new verification code has been sent to your mobile number.')
      setResendKey(prev => prev + 1) // Reset countdown
      setOtp('')

    } catch (error: any) {
      console.error('❌ Resend OTP error:', error)
      if (error.message?.includes('rate limit') || error.message?.includes('Too many requests')) {
        setError('Too many OTP requests. Please wait a few minutes before trying again.')
      } else {
        setError(error.message || 'Failed to resend OTP. Please try again.')
      }
    } finally {
      setIsResending(false)
    }
  }

  const formatPhoneNumber = (mobile: string, countryCode: string) => {
    if (!mobile) return ''
    return `${countryCode} ${mobile.replace(/(\d{5})(\d{5})/, '$1 $2')}`
  }

  return (
    <WizardLayout
      title="Enter Verification Code"
      description={`We've sent a 6-digit code to ${formatPhoneNumber(draft.mobile || '', draft.country_code || '+91')}`}
      onNext={verifyOtp}
      onBack={prevStep}
      nextLabel={isVerifying ? "Verifying..." : "Verify Code"}
      nextDisabled={otp.length !== 6 || isVerifying}
      showProgress={true}
    >
      <div className="space-y-6">
        <div className="text-center">
          <OtpInput
            value={otp}
            onChange={(value) => {
              setOtp(value)
              if (value.length === 6) setError('')
            }}
            disabled={isVerifying}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-center">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && !error && (
          <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-center">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Didn't receive the code?
          </p>
          
          <OtpCountdown
            key={resendKey}
            initialTime={30}
            onResend={resendOtp}
            disabled={isResending}
          />
        </div>

      </div>
    </WizardLayout>
  )
}