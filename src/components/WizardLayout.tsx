'use client'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Home, FileText, User, Briefcase, Phone, Lock } from "lucide-react"
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
  { number: 1, title: "Your property", icon: Home },
  { number: 2, title: "Your project", icon: FileText },
  { number: 3, title: "Your information", icon: User },
  { number: 4, title: "Your professional situation", icon: Briefcase },
  { number: 5, title: "Your income", icon: Briefcase },
  { number: 6, title: "Your contact", icon: Phone },
  { number: 7, title: "Verification", icon: Lock }
]

export function WizardLayout({
  title,
  description,
  children,
  onNext,
  onBack,
  nextLabel = "Next",
  backLabel = "Back",
  nextDisabled = false,
  showProgress = true
}: WizardLayoutProps) {
  const { draft } = useBorrower()
  const currentStep = draft.current_step || 1

  return (
    <div className="min-h-screen bg-secondary flex justify-center items-center p-2 sm:p-4 lg:p-8">
      {/* Centered Modal Container */}
      <div className="w-full max-w-[1100px] min-h-[750px] bg-card rounded-lg shadow-lg border border-border overflow-hidden">
        <div className="flex flex-col lg:flex-row min-h-[750px]">
          {/* Left Sidebar - Progress Navigation */}
          <div className="w-full lg:w-[30%] bg-sidebar border-b lg:border-b-0 lg:border-r border-sidebar-border p-4 lg:p-6 flex flex-col">
            <div className="mb-6 lg:mb-8">
              <img
                src="/logo.png"
                alt="Unbias Lending"
                className="h-16 w-auto"
              />
            </div>

            <div className="space-y-1 flex-1">
              <h2 className="text-sm font-medium text-muted-foreground mb-4">Introduction</h2>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 lg:space-y-2 lg:gap-0">
                {STEPS.map((step) => {
                  const Icon = step.icon
                  const isActive = step.number === currentStep
                  const isCompleted = step.number < currentStep
                  
                  return (
                    <div
                      key={step.number}
                      className={`flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-2 rounded-lg text-xs lg:text-sm ${
                        isActive
                          ? 'bg-primary/10 border-l-4 border-primary'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <div className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? 'bg-primary text-primary-foreground'
                          : isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}>
                        {isCompleted ? (
                          <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-primary-foreground rounded-full"></div>
                        ) : (
                          <Icon className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                        )}
                      </div>
                      <span className={`${
                        isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                      } truncate`}>
                        {step.title}
                      </span>
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