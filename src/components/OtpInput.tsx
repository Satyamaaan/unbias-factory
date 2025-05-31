'use client'
import { useState, useRef, useEffect } from 'react'
import { Input } from "@/components/ui/input"

interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function OtpInput({ length = 6, value, onChange, disabled = false }: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    // Update internal state when value prop changes
    const otpArray = value.split('').slice(0, length)
    while (otpArray.length < length) {
      otpArray.push('')
    }
    setOtp(otpArray)
  }, [value, length])

  const handleChange = (index: number, digit: string) => {
    if (disabled) return

    // Only allow single digits
    if (digit.length > 1) digit = digit.slice(-1)
    if (!/^\d*$/.test(digit)) return

    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    onChange(newOtp.join(''))

    // Auto-focus next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (disabled) return

    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return

    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length)
    const newOtp = Array(length).fill('')
    
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i]
    }
    
    setOtp(newOtp)
    onChange(newOtp.join(''))
  }

  return (
    <div className="flex gap-2 justify-center">
      {otp.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-12 h-12 text-center text-lg font-semibold"
        />
      ))}
    </div>
  )
}