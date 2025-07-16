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
    
    if (!draft.full_name || draft.full_name.trim().length < 2) {
      newErrors.full_name = 'Please enter your full name (at least 2 characters)'
    }
    
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
      title="Your information"
      description="Tell us a bit about yourself"
      onNext={handleNext}
      onBack={prevStep}
      nextDisabled={!draft.dob || !draft.full_name}
    >
      <div className="space-y-4">
        <div className="space-y-4">
          <div>
            <p className="text-base lg:text-lg font-medium text-foreground mb-3">
              What is your full name?
            </p>
            <div className="w-full max-w-xs sm:max-w-sm lg:max-w-md">
              <Input
                id="full_name"
                type="text"
                value={draft.full_name || ''}
                onChange={(e) => updateDraft({ full_name: e.target.value })}
                placeholder="Enter your full name"
                className="py-2.5 text-base lg:text-lg border-2 border-input focus:border-primary rounded-lg w-full"
              />
            </div>
            {errors.full_name && (
              <p className="text-sm text-destructive mt-2">{errors.full_name}</p>
            )}
          </div>

          <div>
            <p className="text-base lg:text-lg font-medium text-foreground mb-3">
              What is your date of birth?
            </p>
            <div className="w-full max-w-xs sm:max-w-sm lg:max-w-md">
              <Input
                id="dob"
                type="date"
                value={draft.dob || ''}
                onChange={(e) => updateDraft({ dob: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                className="py-2.5 text-base lg:text-lg border-2 border-input focus:border-primary rounded-lg w-full"
              />
            </div>
            {errors.dob && (
              <p className="text-sm text-destructive mt-2">{errors.dob}</p>
            )}
          </div>

          {age && (
            <div className={`p-3 rounded-lg border-2 ${
              age >= 18 && age <= 70 
                ? 'bg-primary/10 border-primary/20' 
                : 'bg-destructive/10 border-destructive/20'
            }`}>
              <p className={`text-sm font-medium ${
                age >= 18 && age <= 70 
                  ? 'text-primary' 
                  : 'text-destructive'
              }`}>
                You are {age} years old
                <span className="ml-2">
                  {age >= 18 && age <= 70 ? '✅ Eligible for loan' : '❌ Not eligible for loan'}
                </span>
              </p>
              {age < 18 && (
                <p className="text-sm text-destructive mt-1">
                  You must be at least 18 years old to apply for a home loan
                </p>
              )}
              {age > 70 && (
                <p className="text-sm text-destructive mt-1">
                  Maximum age limit for home loan is 70 years
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </WizardLayout>
  )
}