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
      if (!draft.itr_years || draft.itr_years < 1) {
        newErrors.itr_years = 'Please select years of ITR filing'
      }
    }

    // Validate existing EMI
    if (draft.existing_emi && draft.existing_emi < 0) {
      newErrors.existing_emi = 'EMI amount cannot be negative'
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN').format(value)
  }

  const isValidForNext = () => {
    if (!draft.employment_type) return false
    if (draft.has_coapplicant === undefined) return false
    
    if (draft.employment_type === 'salaried') {
      return draft.gross_salary && draft.gross_salary >= 10000
    } else if (draft.employment_type?.includes('self_employed')) {
      return draft.annual_net_profit && draft.annual_net_profit >= 120000 && draft.itr_years && draft.itr_years >= 1
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

        {draft.employment_type === 'salaried' && (
          <div>
            <Label htmlFor="other_income">Other Monthly Income (₹) - Optional</Label>
            <Input
              id="other_income"
              type="number"
              placeholder="e.g., 15000"
              value={draft.other_income || ''}
              onChange={(e) => updateDraft({ other_income: Number(e.target.value) || 0 })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Include rental income, investments, or other regular income sources
            </p>
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

        {draft.employment_type?.includes('self_employed') && (
          <div>
            <Label htmlFor="itr_years">Years of ITR Filing</Label>
            <Select 
              value={draft.itr_years?.toString() || ''} 
              onValueChange={(value) => updateDraft({ itr_years: parseInt(value) })}
            >
              <SelectTrigger>
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
            <p className="text-xs text-gray-500 mt-1">
              How many years have you been filing income tax returns?
            </p>
            {errors.itr_years && (
              <p className="text-sm text-red-600 mt-1">{errors.itr_years}</p>
            )}
          </div>
        )}

        {/* Financial Obligations */}
        <div>
          <Label htmlFor="existing_emi">Total Existing Monthly EMI (₹)</Label>
          <Input
            id="existing_emi"
            type="number"
            placeholder="e.g., 25000 (Enter 0 if none)"
            value={draft.existing_emi || ''}
            onChange={(e) => updateDraft({ existing_emi: Number(e.target.value) || 0 })}
          />
          {errors.existing_emi && (
            <p className="text-sm text-red-600 mt-1">{errors.existing_emi}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Include all existing loan EMIs (home, car, personal loans, credit cards)
          </p>
        </div>

        {/* Co-applicant */}
        <div>
          <Label>Co-applicant</Label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Card 
              className={`cursor-pointer transition-colors ${
                draft.has_coapplicant === true 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => updateDraft({ has_coapplicant: true })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    draft.has_coapplicant === true 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300'
                  }`}>
                    {draft.has_coapplicant === true && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                  <span className="font-medium">Yes</span>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className={`cursor-pointer transition-colors ${
                draft.has_coapplicant === false 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => updateDraft({ has_coapplicant: false })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    draft.has_coapplicant === false 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300'
                  }`}>
                    {draft.has_coapplicant === false && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                  <span className="font-medium">No</span>
                </div>
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Will you be applying with a co-applicant (spouse, parent, etc.)?
          </p>
          {errors.has_coapplicant && (
            <p className="text-sm text-red-600 mt-1">{errors.has_coapplicant}</p>
          )}
        </div>
      </div>
    </WizardLayout>
  )
}