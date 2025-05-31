'use client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useBorrower } from "@/contexts/BorrowerContext"

export function DebugPanel() {
  const { draft, clearDraft, goToStep } = useBorrower()

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-yellow-50 border-yellow-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 text-xs">
          <p><strong>Current Step:</strong> {draft.current_step}</p>
          <p><strong>Property Type:</strong> {draft.property_type || 'Not set'}</p>
          <p><strong>Mobile:</strong> {draft.mobile || 'Not set'}</p>
          
          <div className="flex gap-1 flex-wrap">
            {[1,2,3,4,5,6].map(step => (
              <Button 
                key={step}
                size="sm" 
                variant={draft.current_step === step ? "default" : "outline"}
                onClick={() => goToStep(step)}
                className="text-xs h-6 px-2"
              >
                {step}
              </Button>
            ))}
          </div>
          
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={clearDraft}
            className="w-full text-xs"
          >
            Reset All Data
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}