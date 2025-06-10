'use client'
import React, { createContext, useContext, useState, useEffect } from 'react'

export interface BorrowerDraft {
  // Property details
  property_type?: string
  property_value_est?: number
  city?: string
  
  // Loan details
  loan_amount_required?: number
  
  // Personal details
  dob?: string
  
  // Employment
  employment_type?: string
  gross_salary?: number
  annual_net_profit?: number
  
  // Contact
  mobile?: string
  country_code?: string

  // Verification & User Data
  verified?: boolean
  user_id?: string
  borrower_id?: string
  
  // Progress
  current_step?: number
}

interface BorrowerContextType {
  draft: BorrowerDraft
  updateDraft: (updates: Partial<BorrowerDraft>) => void
  clearDraft: () => void
  goToStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
}

const BorrowerContext = createContext<BorrowerContextType | undefined>(undefined)

export function BorrowerProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<BorrowerDraft>({ current_step: 1 })

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('borrower_draft')
    if (saved) {
      try {
        setDraft(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load draft from localStorage:', error)
      }
    }
  }, [])

  // Save to localStorage whenever draft changes
  useEffect(() => {
    localStorage.setItem('borrower_draft', JSON.stringify(draft))
  }, [draft])

  const updateDraft = (updates: Partial<BorrowerDraft>) => {
    setDraft(prev => ({ ...prev, ...updates }))
  }

  const clearDraft = () => {
    setDraft({ current_step: 1 })
    localStorage.removeItem('borrower_draft')
  }

  const goToStep = (step: number) => {
    updateDraft({ current_step: step })
  }

  const nextStep = () => {
    const currentStep = draft.current_step || 1
    updateDraft({ current_step: currentStep + 1 })
  }

  const prevStep = () => {
    const currentStep = draft.current_step || 1
    updateDraft({ current_step: Math.max(1, currentStep - 1) })
  }

  return (
    <BorrowerContext.Provider value={{
      draft,
      updateDraft,
      clearDraft,
      goToStep,
      nextStep,
      prevStep
    }}>
      {children}
    </BorrowerContext.Provider>
  )
}

export function useBorrower() {
  const context = useContext(BorrowerContext)
  if (context === undefined) {
    throw new Error('useBorrower must be used within a BorrowerProvider')
  }
  return context
}