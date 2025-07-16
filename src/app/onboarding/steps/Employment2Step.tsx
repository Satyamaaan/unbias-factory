'use client'
import { useState } from 'react'
import { WizardLayout } from "@/components/WizardLayout"
import { Input } from "@/components/ui/input"
import { useBorrower } from "@/contexts/BorrowerContext"

export function Employment2Step() {
  const { draft, updateDraft, nextStep, prevStep } = useBorrower()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleNext = () => {
    const newErrors: Record<string, string> = {}
    
    // Validate income based on employment type
    if (draft.employment_type === 'salaried') {
      if (!draft.gross_salary || draft.gross_salary < 10000) {
        newErrors.gross_salary = 'Minimum salary is ₹10,000 per month'
      }
    } else if (draft.employment_type?.includes('self_employed')) {
      if (!draft.annual_net_profit || draft.annual_net_profit < 120000) {
        newErrors.annual_net_profit = 'Minimum annual profit is ₹1,20,000'
      }
    }

    // Validate existing EMI
    if (draft.existing_emi && draft.existing_emi < 0) {
      newErrors.existing_emi = 'EMI amount cannot be negative'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      nextStep()
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN').format(value)
  }

  const isValidForNext = () => {
    if (draft.employment_type === 'salaried') {
      return draft.gross_salary && draft.gross_salary >= 10000
    } else if (draft.employment_type?.includes('self_employed')) {
      return draft.annual_net_profit && draft.annual_net_profit >= 120000
    }
    
    return false
  }

  return (
    <WizardLayout
      title="Your income"
      description="Tell us about your income and financial obligations"
      onNext={handleNext}
      onBack={prevStep}
      nextDisabled={!isValidForNext()}
    >
      <div className="space-y-4">
        <div className="space-y-4">
          {/* Income Fields based on Employment Type */}
          {draft.employment_type === 'salaried' && (
            <div>
              <p className="text-base lg:text-lg font-medium text-foreground mb-3">
                What is your monthly gross salary?
              </p>
              <div className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-base lg:text-lg">₹</span>
                <Input
                  id="gross_salary"
                  type="number"
                  placeholder="e.g., 120000"
                  value={draft.gross_salary || ''}
                  onChange={(e) => updateDraft({ gross_salary: Number(e.target.value) })}
                  className="pl-8 py-2.5 text-base lg:text-lg border-2 border-input focus:border-primary rounded-lg w-full"
                />
              </div>
              {errors.gross_salary && (
                <p className="text-sm text-destructive mt-2">{errors.gross_salary}</p>
              )}
              {draft.gross_salary && (
                <div className="mt-3 p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-xs lg:text-sm text-primary">
                    Annual Salary: ₹{formatCurrency(draft.gross_salary * 12)}
                  </p>
                </div>
              )}
            </div>
          )}

          {draft.employment_type === 'salaried' && (
            <div>
              <p className="text-base lg:text-lg font-medium text-foreground mb-3">
                Other monthly income <span className="text-muted-foreground font-normal">(Optional)</span>
              </p>
              <div className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-base lg:text-lg">₹</span>
                <Input
                  id="other_income"
                  type="number"
                  placeholder="e.g., 15000"
                  value={draft.other_income || ''}
                  onChange={(e) => updateDraft({ other_income: Number(e.target.value) || 0 })}
                  className="pl-8 py-2.5 text-base lg:text-lg border-2 border-input focus:border-primary rounded-lg w-full"
                />
              </div>
              <div className="mt-3 p-2.5 bg-accent rounded-lg border border-border">
                <p className="text-xs lg:text-sm text-accent-foreground">
                  💡 Include rental income, investments, or other regular income sources
                </p>
              </div>
            </div>
          )}

          {draft.employment_type?.includes('self_employed') && (
            <div>
              <p className="text-base lg:text-lg font-medium text-foreground mb-3">
                What is your annual net profit?
              </p>
              <div className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-base lg:text-lg">₹</span>
                <Input
                  id="annual_net_profit"
                  type="number"
                  placeholder="e.g., 1800000"
                  value={draft.annual_net_profit || ''}
                  onChange={(e) => updateDraft({ annual_net_profit: Number(e.target.value) })}
                  className="pl-8 py-2.5 text-base lg:text-lg border-2 border-input focus:border-primary rounded-lg w-full"
                />
              </div>
              {errors.annual_net_profit && (
                <p className="text-sm text-destructive mt-2">{errors.annual_net_profit}</p>
              )}
              {draft.annual_net_profit && (
                <div className="mt-3 p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-xs lg:text-sm text-primary">
                    Monthly Average: ₹{formatCurrency(Math.round(draft.annual_net_profit / 12))}
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="text-base lg:text-lg font-medium text-foreground mb-3">
              Total existing monthly EMI
            </p>
            <div className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-base lg:text-lg">₹</span>
              <Input
                id="existing_emi"
                type="number"
                placeholder="Enter 0 if none"
                value={draft.existing_emi || ''}
                onChange={(e) => updateDraft({ existing_emi: Number(e.target.value) || 0 })}
                className="pl-8 py-2.5 text-base lg:text-lg border-2 border-input focus:border-primary rounded-lg w-full"
              />
            </div>
            {errors.existing_emi && (
              <p className="text-sm text-destructive mt-2">{errors.existing_emi}</p>
            )}
            <div className="mt-3 p-2.5 bg-accent rounded-lg border border-border">
              <p className="text-xs lg:text-sm text-accent-foreground">
                💡 Include all existing loan EMIs - home loans, car loans, personal loans, and credit card minimum payments
              </p>
            </div>
          </div>
        </div>
      </div>
    </WizardLayout>
  )
}