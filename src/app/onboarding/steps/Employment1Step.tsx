'use client'
import { useState } from 'react'
import { WizardLayout } from "@/components/WizardLayout"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { useBorrower } from "@/contexts/BorrowerContext"

const EMPLOYMENT_TYPES = [
  { value: 'salaried', label: 'Salaried Employee' },
  { value: 'self_employed_professional', label: 'Self-Employed Professional' },
  { value: 'self_employed_business', label: 'Self-Employed Business' },
]

export function Employment1Step() {
  const { draft, updateDraft, nextStep, prevStep } = useBorrower()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleNext = () => {
    const newErrors: Record<string, string> = {}
    
    if (!draft.employment_type) {
      newErrors.employment_type = 'Please select your employment type'
    }

    // Validate ITR years for self-employed
    if (draft.employment_type?.includes('self_employed')) {
      if (!draft.itr_years || draft.itr_years < 1) {
        newErrors.itr_years = 'Please select years of ITR filing'
      }
    }

    // Validate co-applicant selection
    if (draft.has_coapplicant === undefined) {
      newErrors.has_coapplicant = 'Please select whether you have a co-applicant'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      nextStep()
    }
  }

  const isValidForNext = () => {
    if (!draft.employment_type) return false
    if (draft.has_coapplicant === undefined) return false
    
    if (draft.employment_type?.includes('self_employed')) {
      return draft.itr_years && draft.itr_years >= 1
    }
    
    return true
  }

  return (
    <WizardLayout
      title="Your professional situation"
      description="Tell us about your employment"
      onNext={handleNext}
      onBack={prevStep}
      nextDisabled={!isValidForNext()}
    >
      <div className="space-y-4">
        <div className="space-y-4">
          <div>
            <p className="text-base lg:text-lg font-medium text-foreground mb-3">
              What is your employment type?
            </p>
            <div className="space-y-3">
              {EMPLOYMENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => updateDraft({ employment_type: type.value })}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all cursor-pointer ${
                    draft.employment_type === type.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-border/60 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      draft.employment_type === type.value
                        ? 'border-primary bg-primary'
                        : 'border-border'
                    }`}>
                      {draft.employment_type === type.value && (
                        <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                      )}
                    </div>
                    <span className="font-medium text-sm lg:text-base">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
            {errors.employment_type && (
              <p className="text-sm text-destructive mt-2">{errors.employment_type}</p>
            )}
          </div>

          {draft.employment_type?.includes('self_employed') && (
            <div>
              <p className="text-base lg:text-lg font-medium text-foreground mb-3">
                How many years have you been filing ITR?
              </p>
              <div className="w-full max-w-xs sm:max-w-sm lg:max-w-md">
                <Select 
                  value={draft.itr_years?.toString() || ''} 
                  onValueChange={(value) => updateDraft({ itr_years: parseInt(value) })}
                >
                  <SelectTrigger className="py-2.5 text-base lg:text-lg border-2 border-input focus:border-primary rounded-lg w-full">
                    <SelectValue placeholder="Select years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Year</SelectItem>
                    <SelectItem value="2">2 Years</SelectItem>
                    <SelectItem value="3">3 Years</SelectItem>
                    <SelectItem value="4">4 Years</SelectItem>
                    <SelectItem value="5">5+ Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {errors.itr_years && (
                <p className="text-sm text-destructive mt-2">{errors.itr_years}</p>
              )}
              <div className="mt-3 p-2.5 bg-accent rounded-lg border border-border">
                <p className="text-xs lg:text-sm text-accent-foreground">
                  💡 Most lenders require at least 2 years of ITR filing for self-employed applicants
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="text-base lg:text-lg font-medium text-foreground mb-3">
              Will you be applying with a co-applicant?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateDraft({ has_coapplicant: true })}
                className={`p-3 rounded-lg border-2 text-left transition-all cursor-pointer ${
                  draft.has_coapplicant === true
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-border/60 text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    draft.has_coapplicant === true
                      ? 'border-primary bg-primary'
                      : 'border-border'
                  }`}>
                    {draft.has_coapplicant === true && (
                      <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                    )}
                  </div>
                  <span className="font-medium text-sm lg:text-base">Yes</span>
                </div>
              </button>
              
              <button
                onClick={() => updateDraft({ has_coapplicant: false })}
                className={`p-3 rounded-lg border-2 text-left transition-all cursor-pointer ${
                  draft.has_coapplicant === false
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-border/60 text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    draft.has_coapplicant === false
                      ? 'border-primary bg-primary'
                      : 'border-border'
                  }`}>
                    {draft.has_coapplicant === false && (
                      <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                    )}
                  </div>
                  <span className="font-medium text-sm lg:text-base">No</span>
                </div>
              </button>
            </div>
            {errors.has_coapplicant && (
              <p className="text-sm text-destructive mt-2">{errors.has_coapplicant}</p>
            )}
            <div className="mt-3 p-2.5 bg-accent rounded-lg border border-border">
              <p className="text-xs lg:text-sm text-accent-foreground">
                💡 A co-applicant (spouse, parent, etc.) can help increase your loan eligibility
              </p>
            </div>
          </div>
        </div>
      </div>
    </WizardLayout>
  )
}