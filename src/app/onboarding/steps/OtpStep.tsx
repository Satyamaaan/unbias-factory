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
  const [retryCount, setRetryCount] = useState(0)
  const [lastVerificationAttempt, setLastVerificationAttempt] = useState(0)

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP')
      return
    }

    // Prevent rapid retry attempts
    const now = Date.now()
    if (now - lastVerificationAttempt < 3000) {
      setError('Please wait a moment before trying again')
      return
    }
    setLastVerificationAttempt(now)

    setIsVerifying(true)
    setError('')
    setSuccess('')

    console.log('🚀 Starting OTP verification process...')
    console.log('📊 Retry count:', retryCount)

    // Add multiple timeouts for different stages
    const timeouts: NodeJS.Timeout[] = []
    
    // Main timeout for entire process
    const mainTimeout = setTimeout(() => {
      console.log('⏰ Main verification timeout reached')
      setIsVerifying(false)
      setError('Verification timed out. Please try again.')
      
      // Force redirect on timeout
      console.log('🔄 Force redirect on timeout...')
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/offers'
        }
      }, 1000)
    }, 30000)
    
    // Network timeout for API calls
    const networkTimeout = setTimeout(() => {
      console.log('⏰ Network timeout - Supabase calls taking too long')
    }, 15000)
    
    // Emergency redirect timeout (always redirect after 20 seconds)
    const emergencyRedirect = setTimeout(() => {
      console.log('🚨 Emergency redirect - something went wrong but we redirect anyway')
      setIsVerifying(false)
      setError('Processing... Redirecting to offers...')
      if (typeof window !== 'undefined') {
        window.location.href = '/offers'
      }
    }, 20000)
    
    timeouts.push(mainTimeout, networkTimeout, emergencyRedirect)

    const cleanupTimeouts = () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
    }

    try {
      // Check rate limit before verification
      const rateLimit = clientRateLimiter.checkLimit(
        otpRateLimits.verify.identifier,
        otpRateLimits.verify.maxRequests,
        otpRateLimits.verify.windowMs
      )

      if (!rateLimit.allowed) {
        cleanupTimeouts()
        setError(`Too many verification attempts. Please wait ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.`)
        setIsVerifying(false)
        return
      }

      // Production: Real Supabase verification
      const countryCode = draft.country_code || '+91'
      const phone = `${countryCode}${draft.mobile}`
      
      console.log('🔍 Starting OTP verification:', { 
        phone, 
        otpLength: otp.length,
        phoneLength: phone.length,
        countryCode: countryCode 
      })
      
      // Validate phone format before verification
      if (!phone || phone.length < 10) {
        cleanupTimeouts()
        setIsVerifying(false)
        setError('Invalid phone number format. Please check and try again.')
        return
      }
      
      clearTimeout(networkTimeout) // Clear network timeout if we get here
      
      console.log('📞 Calling supabase.auth.verifyOtp...')
      console.log('📱 Phone format:', phone, 'OTP:', otp)
      
      // Check if Supabase is properly configured
      console.log('🔧 Supabase client status:', {
        url: supabase.supabaseUrl,
        hasKey: supabase.supabaseKey !== 'placeholder-key'
      })
      
      const { data: authData, error: authError } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms'
      })

      console.log('✅ OTP verification response received:', { 
        hasAuthData: !!authData,
        hasUser: !!authData?.user,
        authError: authError?.message || 'No error'
      })

      if (authError) {
        cleanupTimeouts()
        console.error('❌ OTP verification error:', authError)
        throw authError
      }

      if (authData?.user) {
        console.log('✅ OTP verified successfully for user:', authData.user.id)
        
        // Ensure we have all required data before proceeding
        if (!draft.mobile) {
          cleanupTimeouts()
          setIsVerifying(false)
          setError('Missing mobile number in draft. Please restart the process.')
          return
        }
        
        updateDraft({ 
          verified: true,
          user_id: authData.user.id 
        })
        
        // First complete finalize_draft to get borrower_id, then redirect
        console.log('🔄 Completing finalize_draft before redirect...')
        setSuccess('Verification successful! Finalizing your application...')
        cleanupTimeouts()
        
        setTimeout(async () => {
          try {
            console.log('🔄 Starting finalize_draft with:', {
              auth_user_id: authData.user.id,
              draft_has_mobile: !!draft.mobile,
              draft_has_data: Object.keys(draft).length > 0
            })
            
            const { data: borrowerId, error: finalizeError } = await supabase
              .rpc('finalize_draft', {
                draft_data: draft,
                auth_user_id: authData.user.id
              })
            
            if (finalizeError) {
              console.error('❌ finalize_draft error:', finalizeError)
              throw finalizeError
            }
            
            console.log('✅ finalize_draft successful, borrower_id:', borrowerId)
            
            // Ensure borrower_id is set before redirect
            await updateDraft({ 
              borrower_id: borrowerId,
              verified: true,
              user_id: authData.user.id
            })
            
            // Wait for storage to save before redirect
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            console.log('🔄 Redirecting to offers with borrower_id:', borrowerId)
            if (typeof window !== 'undefined') {
              window.location.href = '/offers'
            } else {
              router.push('/offers')
            }
            
          } catch (finalizeError) {
            console.error('❌ finalize_draft failed:', finalizeError)
            
            // Handle duplicate key error - borrower already exists
            if (finalizeError.message?.includes('duplicate key') || finalizeError.code === '23505') {
              console.log('ℹ️ Borrower already exists, using existing ID:', authData.user.id)
              await updateDraft({ 
                borrower_id: authData.user.id,
                verified: true,
                user_id: authData.user.id
              })
              
              await new Promise(resolve => setTimeout(resolve, 1000))
              
              if (typeof window !== 'undefined') {
                window.location.href = '/offers'
              } else {
                router.push('/offers')
              }
            } else {
              // For other errors, still try to proceed with user_id as fallback
              console.warn('⚠️ Using user_id as fallback borrower_id:', authData.user.id)
              await updateDraft({ 
                borrower_id: authData.user.id,
                verified: true,
                user_id: authData.user.id
              })
              
              await new Promise(resolve => setTimeout(resolve, 1000))
              
              if (typeof window !== 'undefined') {
                window.location.href = '/offers'
              } else {
                router.push('/offers')
              }
            }
          }
        }, 1000)
      } else {
        cleanupTimeouts()
        console.warn('⚠️ OTP verification did not return a user session')
        console.log('Debug authData:', authData)
        setError('OTP verification did not return a user session. Please try again.')
      }

    } catch (error: any) {
      cleanupTimeouts()
      console.error('❌ OTP verification process error:', {
        error: error?.message || error,
        stack: error?.stack,
        type: typeof error
      })
      
      let errorMessage = 'Verification failed. Please try again.'
      
      if (error?.message?.includes('invalid')) {
        errorMessage = 'Invalid OTP. Please check the code and try again.'
      } else if (error?.message?.includes('expired')) {
        errorMessage = 'OTP has expired. Please request a new code.'
      } else if (error?.message?.includes('rate limit')) {
        errorMessage = 'Too many attempts. Please wait a few minutes.'
      } else if (error?.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.'
      } else if (error?.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.'
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      cleanupTimeouts()
      setIsVerifying(false)
      console.log('✅ OTP verification process completed')
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
      <div className="space-y-4">
        <div className="space-y-4">
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
            <div className="p-2.5 bg-red-100 border border-red-300 rounded-lg text-center">
              <p className="text-xs lg:text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && !error && (
            <div className="p-2.5 bg-green-100 border border-green-300 rounded-lg text-center">
              <p className="text-xs lg:text-sm text-green-700">{success}</p>
            </div>
          )}

          <div className="text-center space-y-2">
            <p className="text-xs lg:text-sm text-muted-foreground">
              Didn't receive the code?
            </p>
            
            <OtpCountdown
              key={resendKey}
              initialTime={30}
              onResend={resendOtp}
              disabled={isResending || isVerifying}
            />
            
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Attempts: {retryCount}
              </p>
            )}
            
            <div className="mt-4 p-2 bg-accent rounded-lg text-xs text-muted-foreground text-center">
              Debug: Step {draft.current_step}, Verified: {draft.verified ? '✅' : '❌'}, 
              User ID: {draft.user_id?.substring(0, 8) || 'none'}
            </div>
          </div>
        </div>
      </div>
    </WizardLayout>
  )
}