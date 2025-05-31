'use client'
import { useState } from 'react'
import { WizardLayout } from "@/components/WizardLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBorrower } from "@/contexts/BorrowerContext"

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

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      nextStep()
    }
  }

  return (
    <WizardLayout
      title="Tell us about your property"
      description="We'll use this to find the best loan options for you"
      onNext={handleNext}
      nextDisabled={!draft.property_type || !draft.property_value_est || !draft.city}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="property_type">Property Type</Label>
          <Select 
            value={draft.property_type} 
            onValueChange={(value) => updateDraft({ property_type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select property type" />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.property_type && (
            <p className="text-sm text-red-600 mt-1">{errors.property_type}</p>
          )}
        </div>

        <div>
          <Label htmlFor="property_value">Property Value (₹)</Label>
          <Input
            id="property_value"
            type="number"
            placeholder="e.g., 8000000"
            value={draft.property_value_est || ''}
            onChange={(e) => updateDraft({ property_value_est: Number(e.target.value) })}
          />
          {errors.property_value_est && (
            <p className="text-sm text-red-600 mt-1">{errors.property_value_est}</p>
          )}
        </div>

        <div>
          <Label htmlFor="city">City</Label>
          <Select 
            value={draft.city} 
            onValueChange={(value) => updateDraft({ city: value.toLowerCase() })}
          >
            <SelectTrigger>
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
            <p className="text-sm text-red-600 mt-1">{errors.city}</p>
          )}
        </div>
      </div>
    </WizardLayout>
  )
}