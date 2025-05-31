'use client'
import { useState } from 'react'
import { WizardLayout } from "@/components/WizardLayout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useBorrower } from "@/contexts/BorrowerContext"

export function PersonalStep() {
  const { draft, updateDraft, nextStep, prevStep } = useBorrower()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleNext = () => {
    const newErrors: Record<string, string> = {}
    
    if (!draft.dob) {
      newErrors.dob = 'Please enter your date of birth'
    } else {
      // Validate age (18-70 years)
      const age = calculateAge(draft.dob)
      if (age < 18) {
        newErrors.dob = 'You must be at least 18 years old'
      } else if (age > 70) {
        newErrors.dob = 'Maximum age limit is 70 years'
      }
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      nextStep()
    }
  }

  const calculateAge = (dob: string) => {
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  const age = draft.dob ? calculateAge(draft.dob) : null

  return (
    <WizardLayout
      title="Personal Information"
      description="Tell us a bit about yourself"
      onNext={handleNext}
      onBack={prevStep}
      nextDisabled={!draft.dob}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="dob">Date of Birth</Label>
          <Input
            id="dob"
            type="date"
            value={draft.dob || ''}
            onChange={(e) => updateDraft({ dob: e.target.value })}
            max={new Date().toISOString().split('T')[0]} // Can't select future dates
          />
          {errors.dob && (
            <p className="text-sm text-red-600 mt-1">{errors.dob}</p>
          )}
        </div>

        {age && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              Age: {age} years
              <span className="ml-2">
                {age >= 18 && age <= 70 ? '✅ Eligible' : '❌ Not eligible'}
              </span>
            </p>
          </div>
        )}
      </div>
    </WizardLayout>
  )
}