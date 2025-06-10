'use client'
import { useState, useEffect } from 'react'
import { WizardLayout } from "@/components/WizardLayout"
import { Button } from "@/components/ui/button"
import { OtpInput } from "@/components/OtpInput" // Assuming OtpInput is in @/components/
import { supabase } from "@/lib/supabase"
import { useBorrower } from "@/contexts/BorrowerContext"
// import { useRouter } from 'next/navigation' // Not strictly needed if nextStep handles navigation

export function OtpStep() {
  const { draft, updateDraft, nextStep, prevStep } = useBorrower()
  const [otp, setOtp] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [countdown, setCountdown] = useState(30)
  const [canResend, setCanResend] = useState(false)
  // const router = useRouter() // Not used for now

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP')
      return
    }

    setIsVerifying(true)
    setError('')
    setSuccess('')

    try {
      // Development mode simulation
      if (process.env.NODE_ENV === 'development' && otp === '123456') {
        console.log('🚀 Development mode: OTP verified successfully')
        
        // Generate a valid UUID for development mode
        const mockUserId = crypto.randomUUID()
        updateDraft({ 
          verified: true,
          user_id: mockUserId 
        })
        
        // Call finalize_draft with draft data
        try {
          console.log('🚀 Development mode: Calling finalize_draft with:', { draft_data: draft, auth_user_id: mockUserId })
          const { data: rpcData, error: finalizeError } = await supabase
            .rpc('finalize_draft', {
              draft_data: draft, // Send the whole draft
              auth_user_id: mockUserId
            })
          
          if (finalizeError) {
            console.error('❌ Dev: Finalize draft error:', finalizeError)
            setError('Dev: Finalize draft failed, but continuing. Error: ' + finalizeError.message)
            // Continue anyway in development for UI testing
          } else {
            console.log('✅ Dev: Draft finalized with borrower ID:', rpcData) // rpcData is the borrower_id
            updateDraft({ borrower_id: rpcData })
          }
        } catch (finalizeRpcError: any) {
          console.error('❌ Dev: Finalize draft RPC call failed:', finalizeRpcError)
          setError('Dev: Finalize draft RPC call failed. Error: ' + finalizeRpcError.message)
          // Continue anyway in development
        }
        
        setSuccess('Mobile number verified successfully! (Dev mode)')
        setTimeout(() => {
          nextStep() // This should go to step 7 (OffersStep)
        }, 1500)
        return
      }
      
      // Production: Real Supabase verification
      const phone = `+91${draft.mobile}`
      console.log('Verifying OTP:', otp, 'for phone:', phone)
      
      const { data: authData, error: authError } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms' // or 'phone_change' or 'signup' depending on your flow
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
              draft_data: draft, // Send the whole draft
              auth_user_id: authData.user.id
            })
          
          if (finalizeError) {
            throw finalizeError // Throw to be caught by outer catch
          }
          
          console.log('✅ Draft finalized with borrower ID:', rpcData) // rpcData is the borrower_id
          updateDraft({ borrower_id: rpcData })
          setSuccess('Mobile number verified successfully!')
          
          setTimeout(() => {
            nextStep() // This should go to step 7 (OffersStep)
          }, 1500)

        } catch (finalizeRpcError: any) {
          console.error('❌ Failed to finalize draft:', finalizeRpcError)
          setError('Verification successful, but failed to save your application data. Please try again or contact support. Error: ' + finalizeRpcError.message)
          // Optionally, sign out the user if finalization fails critically
          // await supabase.auth.signOut()
          return
        }
      } else {
        // This case should ideally not be reached if verifyOtp doesn't error and doesn't return a user
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
      const phone = `+91${draft.mobile}`
      console.log('Resending OTP to:', phone)
      
      // Development mode simulation for resend
      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 Development mode: Simulating OTP resend to', phone)
        await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API delay
        setSuccess('Development: New OTP "123456" sent!')
        setCountdown(30)
        setCanResend(false)
        setOtp('')
        setIsResending(false)
        return
      }

      // Production: Real Supabase OTP resend
      const { error: resendError } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          channel: 'sms'
          // shouldCreateUser: false, // If you don't want resend to create a new user if one doesn't exist
        }
      })

      if (resendError) {
        throw resendError
      }

      console.log('✅ OTP resent successfully')
      setSuccess('A new OTP has been sent to your mobile number.')
      setCountdown(30) // Reset countdown
      setCanResend(false)
      setOtp('') // Clear current OTP input

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

  return (
    <WizardLayout
      title="Verify Your Mobile Number"
      description={draft.mobile ? `We've sent a 6-digit code to +91 ${draft.mobile}` : "Enter the OTP sent to your mobile."}
      onNext={verifyOtp}
      onBack={prevStep}
      nextLabel={isVerifying ? "Verifying..." : "Verify OTP"}
      nextDisabled={otp.length !== 6 || isVerifying}
      showProgress={true}
    >
      <div className="space-y-6">
        <div className="text-center">
          <OtpInput
            value={otp}
            onChange={(value) => {
              setOtp(value)
              if (value.length === 6) setError('') // Clear error once user types 6 digits
            }}
            disabled={isVerifying}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-center">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && !error && ( // Only show success if there's no error
          <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-center">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Didn't receive the code?
          </p>
          
          {canResend ? (
            <Button
              variant="link"
              onClick={resendOtp}
              disabled={isResending}
              className="p-0 h-auto text-blue-600 hover:text-blue-700"
            >
              {isResending ? "Sending..." : "Resend OTP"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              You can resend OTP in {countdown}s
            </p>
          )}
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
            <p className="text-xs text-yellow-800 text-center">
              <strong>Development Mode:</strong> Use OTP <code>123456</code> for any number.
              <br />
              For real SMS, use test number <code>+915551234567</code> (OTP: <code>123456</code>).
            </p>
          </div>
        )}
      </div>
    </WizardLayout>
  )
}