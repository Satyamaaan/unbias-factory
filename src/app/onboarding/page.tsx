'use client'
import { useEffect } from 'react'
import { useBorrower } from "@/contexts/BorrowerContext"
import { DebugPanel } from "@/components/DebugPanel"
import { PropertyStep } from "./steps/PropertyStep"
import { LoanStep } from "./steps/LoanStep"
import { PersonalStep } from "./steps/PersonalStep"
import { Employment1Step } from "./steps/Employment1Step"
import { Employment2Step } from "./steps/Employment2Step"
import { ContactStep } from "./steps/ContactStep"
import { OtpStep } from "./steps/OtpStep"

export default function OnboardingPage() {
  const { draft, clearDraft } = useBorrower()
  const currentStep = draft.current_step || 1

  useEffect(() => {
    console.log('=== ONBOARDING DEBUG ===')
    console.log('Current step:', currentStep)
    console.log('Draft:', draft)
    console.log('========================')
  }, [currentStep, draft])

  const renderStep = () => {
    const validStep = Math.max(1, Math.min(7, currentStep))
    
    console.log('Rendering step:', validStep)
    
    try {
      switch (validStep) {
        case 1:
          console.log('Rendering PropertyStep')
          return <PropertyStep />
        case 2:
          console.log('Rendering LoanStep')
          return <LoanStep />
        case 3:
          console.log('Rendering PersonalStep')
          return <PersonalStep />
        case 4:
          console.log('Rendering Employment1Step')
          return <Employment1Step />
        case 5:
          console.log('Rendering Employment2Step')
          return <Employment2Step />
        case 6:
          console.log('Rendering ContactStep')
          return <ContactStep />
        case 7:
          console.log('Rendering OtpStep')
          return <OtpStep />
        default:
          console.log('Fallback to PropertyStep')
          return <PropertyStep />
      }
    } catch (error) {
      console.error('Error rendering step:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h1 className="text-xl font-bold text-red-600">Error loading step {validStep}</h1>
            <p className="text-red-500">{errorMessage}</p>
            <button 
              onClick={() => clearDraft()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
            >
              Reset and Start Over
            </button>
          </div>
        </div>
      )
    }
  }

  return (
    <div>
      {renderStep()}
      <DebugPanel />
    </div>
  )
}