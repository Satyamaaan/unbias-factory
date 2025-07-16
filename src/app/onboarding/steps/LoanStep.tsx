'use client'
import { useState } from 'react'
import { WizardLayout } from "@/components/WizardLayout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useBorrower } from "@/contexts/BorrowerContext"

export function LoanStep() {
  const { draft, updateDraft, nextStep, prevStep } = useBorrower()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleNext = () => {
    const newErrors: Record<string, string> = {}
    
    if (!draft.loan_amount_required || draft.loan_amount_required < 100000) {
      newErrors.loan_amount_required = 'Minimum loan amount is ₹1,00,000'
    }

    // Check LTV ratio (basic validation)
    if (draft.property_value_est && draft.loan_amount_required) {
      const ltv = (draft.loan_amount_required / draft.property_value_est) * 100
      if (ltv > 90) {
        newErrors.loan_amount_required = 'Loan amount cannot exceed 90% of property value'
      }
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      nextStep()
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN').format(value)
  }

  const ltvPercentage = draft.property_value_est && draft.loan_amount_required
    ? ((draft.loan_amount_required / draft.property_value_est) * 100).toFixed(1)
    : null

  return (
    <WizardLayout
      title="How much loan do you need?"
      description="Enter the loan amount you're looking for"
      onNext={handleNext}
      onBack={prevStep}
      nextDisabled={!draft.loan_amount_required || draft.loan_amount_required < 100000}
    >
      <div className="space-y-4">
        <div className="space-y-4">
          <div>
            <p className="text-base lg:text-lg font-medium text-foreground mb-3">
              How much loan do you need?
            </p>
            <div className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-base lg:text-lg">₹</span>
              <Input
                id="loan_amount"
                type="number"
                placeholder="e.g., 6000000"
                value={draft.loan_amount_required || ''}
                onChange={(e) => updateDraft({ loan_amount_required: Number(e.target.value) })}
                className="pl-8 py-2.5 text-base lg:text-lg border-2 border-input focus:border-primary rounded-lg w-full"
              />
            </div>
            {errors.loan_amount_required && (
              <p className="text-sm text-destructive mt-2">{errors.loan_amount_required}</p>
            )}
          </div>

          {draft.loan_amount_required && (
            <div className="p-2.5 bg-accent rounded-lg border border-border">
              <p className="text-sm text-accent-foreground">
                Loan Amount: ₹{formatCurrency(draft.loan_amount_required)}
              </p>
              {ltvPercentage && (
                <p className="text-sm text-accent-foreground">
                  LTV Ratio: {ltvPercentage}% 
                  <span className="ml-2 text-xs">
                    ({Number(ltvPercentage) <= 80 ? '✅ Excellent' : 
                      Number(ltvPercentage) <= 90 ? '⚠️ High' : '❌ Too High'})
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </WizardLayout>
  )
}