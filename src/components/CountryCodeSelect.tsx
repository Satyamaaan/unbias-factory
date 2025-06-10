'use client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'United States', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
]

interface CountryCodeSelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function CountryCodeSelect({ value, onChange, disabled = false }: CountryCodeSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-24">
        <SelectValue placeholder="+91" />
      </SelectTrigger>
      <SelectContent>
        {COUNTRY_CODES.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            <div className="flex items-center gap-2">
              <span>{country.flag}</span>
              <span>{country.code}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}