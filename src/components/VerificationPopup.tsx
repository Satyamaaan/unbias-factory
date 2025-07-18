'use client'
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useBorrower } from "@/contexts/BorrowerContext"

interface VerificationPopupProps {
  isOpen: boolean
  onClose: () => void
  onVerified: () => void
  offerCount: number
}

export function VerificationPopup({ isOpen, onClose, onVerified, offerCount }: VerificationPopupProps) {
  const { updateDraft } = useBorrower()
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile')
  const [mobileNumber, setMobileNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleSendOTP = async () => {
    if (!mobileNumber || mobileNumber.length !== 10) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Save mobile number to draft
      updateDraft({ mobile: mobileNumber })
      
      setStep('otp')
      setCountdown(30)
    } catch (err) {
      setError('Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Real OTP verification - integrate with your SMS service
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: mobileNumber,
          otp: otp
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        updateDraft({ is_verified: true })
        onVerified()
      } else {
        setError(data.error || 'Invalid OTP. Please try again.')
      }
    } catch (err) {
      setError('Failed to verify OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = () => {
    if (countdown === 0) {
      handleSendOTP()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Verify Your Mobile Number</CardTitle>
          <CardDescription>
            We found {offerCount} offers for you. Verify with your mobile number to see them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'mobile' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Mobile Number</label>
                <Input
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={mobileNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setMobileNumber(value)
                    setError('')
                  }}
                  maxLength={10}
                  className="mt-1"
                />
              </div>
              
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button 
                onClick={handleSendOTP} 
                disabled={loading || mobileNumber.length !== 10}
                className="w-full"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">OTP</label>
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setOtp(value)
                    setError('')
                  }}
                  maxLength={6}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  OTP sent to +91 {mobileNumber}
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleVerifyOTP} 
                  disabled={loading || otp.length !== 6}
                  className="flex-1"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleResendOTP}
                  disabled={countdown > 0}
                  className="flex-1"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}