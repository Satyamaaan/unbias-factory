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
      <div className="space-y-8">
        <div className="space-y-4">
          <div>
            <p className="text-lg font-medium text-gray-900 mb-4">
              What type of property do you want to buy?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {PROPERTY_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => updateDraft({ property_type: type.value })}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    draft.property_type === type.value
                      ? 'border-teal-600 bg-teal-50 text-teal-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <span className="font-medium">{type.label}</span>
                </button>
              ))}
            </div>
            {errors.property_type && (
              <p className="text-sm text-red-600 mt-2">{errors.property_type}</p>
            )}
          </div>

          <div>
            <p className="text-lg font-medium text-gray-900 mb-4">
              What is the estimated value of the property?
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">₹</span>
              <Input
                id="property_value"
                type="number"
                placeholder="e.g., 8000000"
                value={draft.property_value_est || ''}
                onChange={(e) => updateDraft({ property_value_est: Number(e.target.value) })}
                className="pl-8 py-3 text-lg border-2 border-gray-200 focus:border-teal-600 rounded-lg"
              />
            </div>
            {errors.property_value_est && (
              <p className="text-sm text-red-600 mt-2">{errors.property_value_est}</p>
            )}
          </div>

          <div>
            <p className="text-lg font-medium text-gray-900 mb-4">
              In which city is the property located?
            </p>
            <Select 
              value={draft.city} 
              onValueChange={(value) => updateDraft({ city: value.toLowerCase() })}
            >
              <SelectTrigger className="py-3 text-lg border-2 border-gray-200 focus:border-teal-600 rounded-lg">
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
              <p className="text-sm text-red-600 mt-2">{errors.city}</p>
            )}
          </div>

          <div>
            <p className="text-lg font-medium text-gray-900 mb-4">
              Pincode <span className="text-gray-500 font-normal">(Optional)</span>
            </p>
            <Input
              id="pincode"
              type="text"
              placeholder="e.g., 560001"
              value={draft.pincode || ''}
              onChange={(e) => updateDraft({ pincode: e.target.value })}
              maxLength={6}
              className="py-3 text-lg border-2 border-gray-200 focus:border-teal-600 rounded-lg"
            />
            {errors.pincode && (
              <p className="text-sm text-red-600 mt-2">{errors.pincode}</p>
            )}
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                💡 Providing pincode helps us find more accurate loan offers in your area
              </p>
            </div>
          </div>
        </div>
      </div>
    </WizardLayout>
  )
}