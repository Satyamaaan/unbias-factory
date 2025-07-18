'use client'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Check } from "lucide-react"
import { useBorrower } from "@/contexts/BorrowerContext"

interface WizardLayoutProps {
  title: string
  description?: string
  children: React.ReactNode
  onNext?: () => void
  onBack?: () => void
  nextLabel?: string
  backLabel?: string
  nextDisabled?: boolean
  showProgress?: boolean
}

const STEPS = [
  { number: 1, title: "Property Details", description: "Tell us about your property" },
  { number: 2, title: "Loan Requirements", description: "Your loan amount and tenure" },
  { number: 3, title: "Personal Information", description: "Basic details about you" },
  { number: 4, title: "Income Details", description: "Your work and income information" }
]

export function WizardLayout({
  title,
  description,
  children,
  onNext,
  onBack,
  nextLabel = "Next",
  backLabel = "Back",
  nextDisabled = false
}: WizardLayoutProps) {
  const { draft } = useBorrower()
  const currentStep = draft.current_step || 1

  return (
    <div className="min-h-screen bg-secondary flex justify-center items-center p-2 sm:p-4 lg:p-8">
      {/* Centered Modal Container */}
      <div className="w-full max-w-[1100px] min-h-[750px] bg-card rounded-lg shadow-lg border border-border overflow-hidden">
        <div className="flex flex-col lg:flex-row min-h-[750px]">
          {/* Left Sidebar - Progress Navigation */}
          {/* Desktop Vertical Stepper */}
          <div className="hidden lg:flex lg:w-[30%] bg-sidebar border-r border-sidebar-border p-6 flex-col">
            <div className="mb-8">
              <img
                src="/logo.png"
                alt="Unbias Lending"
                className="h-16 w-auto"
              />
            </div>

            <div className="flex-1">
              <div className="space-y-1">
                {STEPS.map((step, index) => {
                  const isActive = step.number === currentStep
                  const isCompleted = step.number < currentStep
                  
                  return (
                    <div key={step.number} className="relative">
                      <div className="flex items-start gap-3 py-6">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isCompleted
                            ? 'bg-[#007848] text-white'
                            : isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-gray-200 text-gray-500'
                        }`}>
                          {isCompleted ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <span className="text-sm font-medium">{step.number}</span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-medium ${
                            isActive ? 'text-primary' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {step.title}
                          </h3>
                          <p className={`text-xs mt-0.5 ${
                            isActive ? 'text-primary/80' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                          }`}>
                            {step.description}
                          </p>
                        </div>
                      </div>
                      
                      {index < STEPS.length - 1 && (
                        <div className={`absolute left-4 top-16 w-px h-12 ${
                          isCompleted ? 'bg-[#007848]' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Mobile Horizontal Stepper */}
          <div className="lg:hidden w-full bg-sidebar border-b border-sidebar-border p-4">
            <div className="flex justify-center">
              <div className="flex items-center">
                {STEPS.map((step, index) => {
                  const isActive = step.number === currentStep
                  const isCompleted = step.number < currentStep
                  
                  return (
                    <div key={step.number} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          isCompleted
                            ? 'bg-[#007848] text-white'
                            : isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-gray-200 text-gray-500'
                        }`}>
                          {isCompleted ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            step.number
                          )}
                        </div>
                        <span className={`text-xs text-center mt-1 max-w-16 ${
                          isActive ? 'text-primary font-medium' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {step.title.split(' ')[0]}
                        </span>
                      </div>
                      
                      {index < STEPS.length - 1 && (
                        <div className={`w-8 h-px mx-3 mb-[18px] ${
                          isCompleted ? 'bg-[#007848]' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="w-full lg:w-[70%] p-4 sm:p-6 lg:p-8 flex flex-col min-h-0">
            {/* Back Button */}
            {currentStep > 1 && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="flex items-center gap-2 mb-4 text-muted-foreground hover:text-foreground self-start cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Button>
            )}

            {/* Content */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="mb-6">
                <h1 className="text-2xl lg:text-3xl font-bold text-card-foreground mb-2">{title}</h1>
                {description && (
                  <p className="text-muted-foreground text-base lg:text-lg">{description}</p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto pb-4">
                {children}
              </div>

              {/* Next Button */}
              {onNext && (
                <div className="mt-4 flex-shrink-0">
                  <Button
                    onClick={onNext}
                    disabled={nextDisabled}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-6 lg:px-8 py-3 rounded-lg font-medium cursor-pointer"
                  >
                    {nextLabel}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}