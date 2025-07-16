'use client'
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"

interface OtpCountdownProps {
  initialTime: number
  onResend: () => void
  disabled?: boolean
}

export function OtpCountdown({ initialTime, onResend, disabled = false }: OtpCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime)
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    setTimeLeft(initialTime)
    setIsActive(true)
  }, [initialTime])

  useEffect(() => {
    if (!isActive || timeLeft <= 0) {
      setIsActive(false)
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsActive(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isActive, timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleResend = () => {
    onResend()
    setTimeLeft(initialTime)
    setIsActive(true)
  }

  return (
    <div className="text-center space-y-2">
      {isActive ? (
        <p className="text-sm text-muted-foreground">
          Resend code in {formatTime(timeLeft)}
        </p>
      ) : (
        <Button
          variant="link"
          onClick={handleResend}
          disabled={disabled}
          className="p-0 h-auto text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          Resend OTP
        </Button>
      )}
    </div>
  )
}