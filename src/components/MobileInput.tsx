'use client'
import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CountryCodeSelect } from "./CountryCodeSelect"
import { cn } from "@/lib/utils"

interface MobileInputProps {
  countryCode: string
  phoneNumber: string
  onCountryCodeChange: (code: string) => void
  onPhoneNumberChange: (number: string) => void
  error?: string
  disabled?: boolean
  className?: string
}

export function MobileInput({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  error,
  disabled = false,
  className
}: MobileInputProps) {
  const [focused, setFocused] = useState(false)

  const validatePhoneNumber = (number: string, code: string) => {
    if (!number) return null
    
    // Remove any non-digit characters
    const cleanNumber = number.replace(/\D/g, '')
    
    // Validation rules based on country code
    switch (code) {
      case '+91': // India
        return /^[6-9]\d{9}$/.test(cleanNumber) ? 'valid' : 'invalid'
      case '+1': // US/Canada
        return /^\d{10}$/.test(cleanNumber) ? 'valid' : 'invalid'
      case '+44': // UK
        return /^\d{10,11}$/.test(cleanNumber) ? 'valid' : 'invalid'
      default:
        return cleanNumber.length >= 7 && cleanNumber.length <= 15 ? 'valid' : 'invalid'
    }
  }

  const validationStatus = validatePhoneNumber(phoneNumber, countryCode)

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only digits and common phone number characters
    const cleanValue = value.replace(/[^\d\s\-\(\)]/g, '')
    onPhoneNumberChange(cleanValue)
  }

  const getPlaceholder = (code: string) => {
    switch (code) {
      case '+91':
        return '9876543210'
      case '+1':
        return '(555) 123-4567'
      case '+44':
        return '7700 900123'
      default:
        return 'Enter phone number'
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="mobile">Mobile Number</Label>
      <div className={cn(
        "flex rounded-md border transition-colors",
        focused && "ring-2 ring-ring ring-offset-2",
        error && "border-destructive",
        validationStatus === 'valid' && !error && "border-green-500",
        validationStatus === 'invalid' && !error && "border-yellow-500"
      )}>
        <CountryCodeSelect
          value={countryCode}
          onChange={onCountryCodeChange}
          disabled={disabled}
        />
        <Input
          id="mobile"
          type="tel"
          placeholder={getPlaceholder(countryCode)}
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          className="border-0 border-l rounded-l-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
      
      {/* Validation feedback */}
      {phoneNumber && !error && (
        <div className="flex items-center gap-2 text-sm">
          {validationStatus === 'valid' && (
            <span className="text-green-600 flex items-center gap-1">
              ✅ Valid number format
            </span>
          )}
          {validationStatus === 'invalid' && (
            <span className="text-yellow-600 flex items-center gap-1">
              ⚠️ Please check the number format
            </span>
          )}
        </div>
      )}
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}