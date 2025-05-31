'use client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft } from "lucide-react"
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

export function WizardLayout({
  title,
  description,
  children,
  onNext,
  onBack,
  nextLabel = "Continue",
  backLabel = "Back",
  nextDisabled = false,
  showProgress = true
}: WizardLayoutProps) {
  const { draft } = useBorrower()
  const currentStep = draft.current_step || 1
  const totalSteps = 6
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {showProgress && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{title}</CardTitle>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {children}

            <div className="flex justify-between pt-4">
              {currentStep > 1 ? (
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {backLabel}
                </Button>
              ) : (
                <div />
              )}

              {onNext && (
                <Button
                  onClick={onNext}
                  disabled={nextDisabled}
                  className="px-8"
                >
                  {nextLabel}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}