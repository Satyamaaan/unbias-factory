'use client'
import { useState } from 'react'
import { WizardLayout } from "@/components/WizardLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBorrower } from "@/contexts/BorrowerContext"

// Function to convert number to Indian currency words
const convertToIndianWords = (amount: number): string => {
  if (!amount || amount === 0) return 'Zero'
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  
  const convertHundreds = (num: number): string => {
    let result = ''
    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' Hundred '
      num %= 100
    }
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + ' '
      num %= 10
    } else if (num >= 10) {
      result += teens[num - 10] + ' '
      num = 0
    }
    if (num > 0) {
      result += ones[num] + ' '
    }
    return result
  }
  
  if (amount >= 10000000) { // 1 Crore and above
    const crores = Math.floor(amount / 10000000)
    const remainder = amount % 10000000
    let result = convertHundreds(crores) + 'Crore '
    if (remainder > 0) {
      result += convertToIndianWords(remainder)
    }
    return result.trim()
  } else if (amount >= 100000) { // 1 Lakh and above
    const lakhs = Math.floor(amount / 100000)
    const remainder = amount % 100000
    let result = convertHundreds(lakhs) + 'Lakh '
    if (remainder > 0) {
      result += convertToIndianWords(remainder)
    }
    return result.trim()
  } else if (amount >= 1000) { // 1 Thousand and above
    const thousands = Math.floor(amount / 1000)
    const remainder = amount % 1000
    let result = convertHundreds(thousands) + 'Thousand '
    if (remainder > 0) {
      result += convertHundreds(remainder)
    }
    return result.trim()
  } else {
    return convertHundreds(amount).trim()
  }
}

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'independent_house', label: 'Independent House' },
  { value: 'villa', label: 'Villa' },
  { value: 'plot', label: 'Plot' }
]

const CITIES = [
  'Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Pune', 'Hyderabad', 
  'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kochi', 'Gurgaon', 'Noida'
]

export function PropertyStep() {
  const { draft, updateDraft, nextStep } = useBorrower()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleNext = () => {
    const newErrors: Record<string, string> = {}
    
    if (!draft.property_type) newErrors.property_type = 'Please select a property type'
    if (!draft.property_value_est || draft.property_value_est <= 0) {
      newErrors.property_value_est = 'Please enter a valid property value'
    }
    if (!draft.city) newErrors.city = 'Please select a city'
    
    // Validate pincode if provided
    if (draft.pincode && !/^\d{6}$/.test(draft.pincode)) {
      newErrors.pincode = 'Please enter a valid 6-digit pincode'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      nextStep()
    }
  }

  return (
    <WizardLayout
      title="Your property"
      description="Tell us about the property you want to buy"
      onNext={handleNext}
      nextDisabled={!draft.property_type || !draft.property_value_est || !draft.city}
    >
      <div className="space-y-5">
        <div className="space-y-4">
          <div>
            <p className="text-base lg:text-lg font-medium text-foreground mb-3">
              What type of property do you want to buy?
            </p>
            <div className="grid grid-cols-1 gap-3">
              {PROPERTY_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => updateDraft({ property_type: type.value })}
                  className={`p-4 rounded-lg border-2 text-left transition-all cursor-pointer flex items-center space-x-4 ${
                    draft.property_type === type.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-border/60 text-foreground'
                  }`}
                >
                  <img
                    src={`/icons/${type.value.replace('_', '-')}.svg`}
                    alt={type.label}
                    className="w-10 h-10 lg:w-12 lg:h-12 object-contain flex-shrink-0"
                  />
                  <span className="font-medium text-sm lg:text-base text-left">{type.label}</span>
                </button>
              ))}
            </div>
            {errors.property_type && (
              <p className="text-sm text-destructive mt-2">{errors.property_type}</p>
            )}
          </div>

          <div>
            <p className="text-base lg:text-lg font-medium text-foreground mb-3">
              What is the estimated value of the property?
            </p>
            <div className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-base lg:text-lg">₹</span>
              <Input
                id="property_value"
                type="number"
                placeholder="e.g., 8000000"
                value={draft.property_value_est || ''}
                onChange={(e) => updateDraft({ property_value_est: Number(e.target.value) })}
                className="pl-8 py-2.5 text-base lg:text-lg border-2 border-input focus:border-primary rounded-lg w-full"
              />
            </div>
            {draft.property_value_est !== undefined && draft.property_value_est !== null && draft.property_value_est >= 0 && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                {convertToIndianWords(draft.property_value_est)} Rupees
              </p>
            )}
            {errors.property_value_est && (
              <p className="text-sm text-destructive mt-2">{errors.property_value_est}</p>
            )}
          </div>

          <div>
            <p className="text-base lg:text-lg font-medium text-foreground mb-3">
              In which city is the property located?
            </p>
            <div className="flex flex-row gap-4">
              <div className="w-1/2">
                <p className="text-sm lg:text-base font-medium text-foreground mb-2">
                  City
                </p>
                <Select 
                  value={draft.city} 
                  onValueChange={(value) => updateDraft({ city: value.toLowerCase() })}
                >
                  <SelectTrigger className="py-2.5 text-base lg:text-lg border-2 border-input focus:border-primary rounded-lg w-full">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map((city) => (
                      <SelectItem key={city} value={city.toLowerCase()}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.city && (
                  <p className="text-sm text-destructive mt-2">{errors.city}</p>
                )}
              </div>
              
              <div className="w-1/2">
                <p className="text-sm lg:text-base font-medium text-foreground mb-2">
                  Pincode <span className="text-muted-foreground font-normal">(Optional)</span>
                </p>
                <Input
                  id="pincode"
                  type="text"
                  placeholder="e.g., 560001"
                  value={draft.pincode || ''}
                  onChange={(e) => updateDraft({ pincode: e.target.value })}
                  maxLength={6}
                  className="py-2.5 text-base lg:text-lg border-2 border-input focus:border-primary rounded-lg w-full"
                />
                {errors.pincode && (
                  <p className="text-sm text-destructive mt-2">{errors.pincode}</p>
                )}
              </div>
            </div>
            
            <div className="mt-3 p-2.5 bg-accent rounded-lg border border-border">
              <p className="text-xs lg:text-sm text-accent-foreground">
                💡 Providing pincode helps us find more accurate loan offers in your area
              </p>
            </div>
          </div>
        </div>
      </div>
    </WizardLayout>
  )
}