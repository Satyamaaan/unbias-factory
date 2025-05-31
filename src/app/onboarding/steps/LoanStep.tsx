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
        <div>
          <Label htmlFor="loan_amount">Loan Amount (₹)</Label>
          <Input
            id="loan_amount"
            type="number"
            placeholder="e.g., 6000000"
            value={draft.loan_amount_required || ''}
            onChange={(e) => updateDraft({ loan_amount_required: Number(e.target.value) })}
          />
          {errors.loan_amount_required && (
            <p className="text-sm text-red-600 mt-1">{errors.loan_amount_required}</p>
          )}
        </div>

        {draft.loan_amount_required && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              Loan Amount: ₹{formatCurrency(draft.loan_amount_required)}
            </p>
            {ltvPercentage && (
              <p className="text-sm text-blue-600">
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
    </WizardLayout>
  )
}