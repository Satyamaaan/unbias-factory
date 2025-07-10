'use client'
import { useState } from 'react'
import { WizardLayout } from "@/components/WizardLayout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { useBorrower } from "@/contexts/BorrowerContext"

const EMPLOYMENT_TYPES = [
  { value: 'salaried', label: 'Salaried Employee' },
  { value: 'self_employed_professional', label: 'Self-Employed Professional' },
  { value: 'self_employed_business', label: 'Self-Employed Business' },
]

export function EmploymentStep() {
  const { draft, updateDraft, nextStep, prevStep } = useBorrower()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleNext = () => {
    const newErrors: Record<string, string> = {}
    
    if (!draft.employment_type) {
      newErrors.employment_type = 'Please select your employment type'
    }

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

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      nextStep()
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN').format(value)
  }

  const isValidForNext = () => {
    if (!draft.employment_type) return false
    
    if (draft.employment_type === 'salaried') {
      return draft.gross_salary && draft.gross_salary >= 10000
    } else if (draft.employment_type?.includes('self_employed')) {
      return draft.annual_net_profit && draft.annual_net_profit >= 120000
    }
    
    return false
  }

  return (
    <WizardLayout
      title="Employment Information"
      description="Help us understand your income"
      onNext={handleNext}
      onBack={prevStep}
      nextDisabled={!isValidForNext()}
    >
      <div className="space-y-4">
        {/* Employment Type Selection */}
        <div>
          <Label>Employment Type</Label>
          <div className="grid gap-3 mt-2">
            {EMPLOYMENT_TYPES.map((type) => (
              <Card 
                key={type.value}
                className={`cursor-pointer transition-colors ${
                  draft.employment_type === type.value 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => updateDraft({ employment_type: type.value })}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      draft.employment_type === type.value 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-gray-300'
                    }`}>
                      {draft.employment_type === type.value && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                      )}
                    </div>
                    <span className="font-medium">{type.label}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {errors.employment_type && (
            <p className="text-sm text-red-600 mt-1">{errors.employment_type}</p>
          )}
        </div>

        {/* Income Fields based on Employment Type */}
        {draft.employment_type === 'salaried' && (
          <div>
            <Label htmlFor="gross_salary">Monthly Gross Salary (₹)</Label>
            <Input
              id="gross_salary"
              type="number"
              placeholder="e.g., 120000"
              value={draft.gross_salary || ''}
              onChange={(e) => updateDraft({ gross_salary: Number(e.target.value) })}
            />
            {errors.gross_salary && (
              <p className="text-sm text-red-600 mt-1">{errors.gross_salary}</p>
            )}
            {draft.gross_salary && (
              <p className="text-sm text-blue-600 mt-1">
                Annual: ₹{formatCurrency(draft.gross_salary * 12)}
              </p>
            )}
          </div>
        )}

        {draft.employment_type?.includes('self_employed') && (
          <div>
            <Label htmlFor="annual_net_profit">Annual Net Profit (₹)</Label>
            <Input
              id="annual_net_profit"
              type="number"
              placeholder="e.g., 1800000"
              value={draft.annual_net_profit || ''}
              onChange={(e) => updateDraft({ annual_net_profit: Number(e.target.value) })}
            />
            {errors.annual_net_profit && (
              <p className="text-sm text-red-600 mt-1">{errors.annual_net_profit}</p>
            )}
            {draft.annual_net_profit && (
              <p className="text-sm text-blue-600 mt-1">
                Monthly: ₹{formatCurrency(Math.round(draft.annual_net_profit / 12))}
              </p>
            )}
          </div>
        )}
      </div>
    </WizardLayout>
  )
}