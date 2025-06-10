'use client'
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SessionDebugPanel } from "@/components/SessionDebugPanel"
import { LogViewer } from "@/components/LogViewer"
import { AuthDiagnostics } from "@/components/AuthDiagnostics"
import { useBorrower } from "@/contexts/BorrowerContext"
import { useAuth } from "@/hooks/useAuth"
import { useAuthFallback } from "@/components/AuthFallbackProvider"
import { logger } from "@/lib/logger"

export function DebugPanel() {
  const { draft, clearDraft, goToStep } = useBorrower()
  const { session, error: authError } = useAuth()
  const { isOnline, authHealth } = useAuthFallback()
  const [showSessionDebug, setShowSessionDebug] = useState(false)
  const [showLogViewer, setShowLogViewer] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const handleStepChange = (step: number) => {
    logger.debug('DEBUG_PANEL', `Manual step change to ${step}`, { 
      previousStep: draft.current_step,
      newStep: step 
    })
    goToStep(step)
  }

  const handleClearDraft = () => {
    logger.debug('DEBUG_PANEL', 'Manual draft clear triggered')
    clearDraft()
  }

  const getHealthStatus = () => {
    if (!isOnline) return { color: 'bg-red-500', text: 'Offline' }
    if (authError) return { color: 'bg-yellow-500', text: 'Auth Error' }
    if (!session) return { color: 'bg-yellow-500', text: 'No Session' }
    if (authHealth?.supabaseStatus) return { color: 'bg-green-500', text: 'Healthy' }
    return { color: 'bg-gray-500', text: 'Unknown' }
  }

  const healthStatus = getHealthStatus()

  return (
    <>
      <Card className="fixed bottom-4 right-4 w-80 z-40 bg-yellow-50 border-yellow-200 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${healthStatus.color}`} />
              Debug Panel
            </div>
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowSessionDebug(true)}
                className="text-xs h-6 px-2"
              >
                Session
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowLogViewer(true)}
                className="text-xs h-6 px-2"
              >
                Logs
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-xs">
            {/* Status Overview */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium">Status:</span>
                <Badge variant="outline" className="ml-1 text-xs">
                  {healthStatus.text}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Step:</span>
                <Badge className="ml-1 text-xs">
                  {draft.current_step || 1}
                </Badge>
              </div>
            </div>

            {/* Key Info */}
            <div className="space-y-1">
              <p><strong>Property:</strong> {draft.property_type || 'Not set'}</p>
              <p><strong>Mobile:</strong> {draft.mobile || 'Not set'}</p>
              <p><strong>Verified:</strong> {draft.verified ? '✅' : '❌'}</p>
              <p><strong>Session:</strong> {session ? '✅' : '❌'}</p>
            </div>
            
            {/* Step Navigation */}
            <div className="flex gap-1 flex-wrap">
              {[1,2,3,4,5,6].map(step => (
                <Button 
                  key={step}
                  size="sm" 
                  variant={draft.current_step === step ? "default" : "outline"}
                  onClick={() => handleStepChange(step)}
                  className="text-xs h-6 px-2"
                >
                  {step}
                </Button>
              ))}
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-1">
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={handleClearDraft}
                className="text-xs h-6"
              >
                Reset Data
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowDiagnostics(true)}
                className="text-xs h-6"
              >
                Diagnostics
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  logger.debug('DEBUG_PANEL', 'Manual log test', { 
                    timestamp: new Date().toISOString(),
                    draft: draft,
                    session: !!session,
                    health: authHealth
                  })
                }}
                className="flex-1 text-xs h-6"
              >
                Test Log
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  const logs = logger.exportLogs('json')
                  navigator.clipboard.writeText(logs)
                  logger.info('DEBUG_PANEL', 'Logs copied to clipboard')
                }}
                className="flex-1 text-xs h-6"
              >
                Copy Logs
              </Button>
            </div>

            {/* Health Indicators */}
            <div className="pt-2 border-t text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Network:</span>
                <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Logs:</span>
                <span>{logger.getLogs().length}</span>
              </div>
              {authError && (
                <div className="text-red-600 text-xs mt-1">
                  Auth: {authError.message}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <SessionDebugPanel 
        isOpen={showSessionDebug}
        onClose={() => setShowSessionDebug(false)}
      />

      <LogViewer 
        isOpen={showLogViewer}
        onClose={() => setShowLogViewer(false)}
        maxHeight="400px"
        showExportOptions={true}
      />

      <AuthDiagnostics
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
      />
    </>
  )
}