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
  { number: 5, title: "Your contact", icon: Phone },
  { number: 6, title: "Verification", icon: Lock }
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar - Progress Navigation */}
      <div className="w-80 bg-white border-r border-gray-200 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unbias Factory</h1>
        </div>

        <div className="space-y-1">
          <h2 className="text-sm font-medium text-gray-500 mb-4">Introduction</h2>
          <div className="space-y-2">
            {STEPS.map((step) => {
              const Icon = step.icon
              const isActive = step.number === currentStep
              const isCompleted = step.number < currentStep
              
              return (
                <div
                  key={step.number}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                    isActive
                      ? 'bg-teal-50 border-l-4 border-teal-600'
                      : 'text-gray-600'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? 'bg-teal-600 text-white'
                      : isActive
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-200'
                  }`}>
                    {isCompleted ? (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    ) : (
                      <Icon className="w-3 h-3" />
                    )}
                  </div>
                  <span className={`text-sm ${
                    isActive ? 'text-teal-700 font-medium' : 'text-gray-600'
                  }`}>
                    {step.title}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          {currentStep > 1 && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Button>
          )}

          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
              {description && (
                <p className="text-gray-600 text-lg">{description}</p>
              )}
            </div>

            <div className="space-y-6">
              {children}
            </div>

            {/* Next Button */}
            {onNext && (
              <div className="mt-8">
                <Button
                  onClick={onNext}
                  disabled={nextDisabled}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-lg font-medium"
                >
                  {nextLabel}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}