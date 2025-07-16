'use client'
import React, { createContext, useContext, useState, useEffect } from 'react'
import { secureStorage } from '@/lib/secureStorage'

export interface BorrowerDraft {
  // Personal details
  full_name?: string
  dob?: string
  
  // Property details
  property_type?: string
  property_value_est?: number
  city?: string
  pincode?: string
  
  // Loan details
  loan_amount_required?: number
  
  // Employment
  employment_type?: string
  gross_salary?: number
  annual_net_profit?: number
  other_income?: number
  itr_years?: number
  
  // Financial obligations
  existing_emi?: number
  has_coapplicant?: boolean
  
  // Contact
  mobile?: string
  country_code?: string

  // Journey & verification
  journey_stage?: string
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
  const [draft, setDraft] = useState<BorrowerDraft>({ 
    current_step: 1,
    journey_stage: 'exploring_options',
    existing_emi: 0,
    other_income: 0
  })

  // Load from secure storage on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const saved = await secureStorage.getDraft()
        if (saved) {
          setDraft(prev => ({ ...prev, ...saved }))
        }
      } catch (error) {
        console.error('Failed to load draft from secure storage:', error)
      }
    }
    
    loadDraft()
  }, [])

  // Save to secure storage whenever draft changes
  useEffect(() => {
    secureStorage.setDraft(draft).catch(error => {
      console.error('Failed to save to secure storage:', error)
    })
  }, [draft])

  const updateDraft = (updates: Partial<BorrowerDraft>) => {
    setDraft(prev => ({ ...prev, ...updates }))
  }

  const clearDraft = () => {
    setDraft({ 
      current_step: 1,
      journey_stage: 'exploring_options',
      existing_emi: 0,
      other_income: 0
    })
    secureStorage.removeDraft()
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