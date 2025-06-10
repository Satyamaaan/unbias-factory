'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { logger } from "@/lib/logger"
import { authManager } from "@/lib/auth"
import { useAuth } from "@/hooks/useAuth"
import { useBorrower } from "@/contexts/BorrowerContext"
import { LogViewer } from "./LogViewer"
import { AuthDiagnostics } from "./AuthDiagnostics"

interface SessionDebugPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SessionDebugPanel({ isOpen, onClose }: SessionDebugPanelProps) {
  const { session, loading, error } = useAuth()
  const { draft } = useBorrower()
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [showLogViewer, setShowLogViewer] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [realTimeStats, setRealTimeStats] = useState({
    totalLogs: 0,
    errorCount: 0,
    warnCount: 0,
    lastActivity: 'No activity'
  })

  useEffect(() => {
    if (isOpen) {
      refreshSessionInfo()
      startRealTimeMonitoring()
    }
  }, [isOpen])

  const refreshSessionInfo = async () => {
    try {
      const validSession = await authManager.getValidSession()
      const sessionSummary = session ? logger.getSessionSummary(session.user?.id || 'unknown') : null
      
      setSessionInfo({
        hasSession: !!validSession,
        userId: validSession?.user?.id,
        expiresAt: validSession?.expires_at,
        timeUntilExpiry: validSession?.expires_at ? 
          Math.max(0, validSession.expires_at * 1000 - Date.now()) : 0,
        draft: {
          currentStep: draft.current_step,
          verified: draft.verified,
          borrowerId: draft.borrower_id,
          mobile: draft.mobile,
          countryCode: draft.country_code
        },
        sessionSummary
      })
    } catch (error) {
      console.error('Failed to get session info:', error)
      logger.error('SESSION_DEBUG', 'Failed to refresh session info', { error: error.message })
    }
  }

  const startRealTimeMonitoring = () => {
    const interval = setInterval(() => {
      const logs = logger.getLogs()
      const sessionId = session?.user?.id || 'unknown'
      const summary = logger.getSessionSummary(sessionId)
      
      setRealTimeStats({
        totalLogs: logs.length,
        errorCount: logs.filter(l => l.level === 'ERROR').length,
        warnCount: logs.filter(l => l.level === 'WARN').length,
        lastActivity: summary.lastActivity
      })
    }, 2000)

    return () => clearInterval(interval)
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const testAuthFlow = async () => {
    logger.authInfo('Manual auth test started from debug panel')
    try {
      const session = await authManager.getValidSession()
      logger.authInfo('Auth test completed', { hasSession: !!session })
      refreshSessionInfo()
    } catch (error) {
      logger.authError('Auth test failed', { error: error.message })
    }
  }

  const simulateAuthError = async () => {
    logger.authWarn('Simulating auth error for testing')
    try {
      throw new Error('Simulated authentication error for debugging')
    } catch (error) {
      logger.authError('Simulated auth error', { error: error.message, simulated: true })
    }
  }

  const clearSessionData = async () => {
    logger.authInfo('Clearing session data from debug panel')
    try {
      await authManager.signOut()
      refreshSessionInfo()
    } catch (error) {
      logger.authError('Failed to clear session', { error: error.message })
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Session Debug Panel
              <div className="flex gap-1">
                <div className={`w-2 h-2 rounded-full ${sessionInfo?.hasSession ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-500">
                  {realTimeStats.totalLogs} logs
                </span>
              </div>
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowLogViewer(true)}>
                📋 Logs
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowDiagnostics(true)}>
                🔧 Diagnostics
              </Button>
              <Button variant="ghost" onClick={onClose}>✕</Button>
            </div>
          </CardHeader>
          
          <CardContent className="overflow-auto">
            <Tabs defaultValue="session" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="session">Session</TabsTrigger>
                <TabsTrigger value="auth">Auth Test</TabsTrigger>
                <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="tools">Tools</TabsTrigger>
              </TabsList>

              <TabsContent value="session" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Authentication Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Loading:</span>
                        <Badge variant={loading ? "default" : "secondary"}>
                          {loading ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Has Session:</span>
                        <Badge variant={sessionInfo?.hasSession ? "default" : "destructive"}>
                          {sessionInfo?.hasSession ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>User ID:</span>
                        <span className="text-xs font-mono">
                          {sessionInfo?.userId?.slice(0, 12) || 'None'}...
                        </span>
                      </div>
                      {sessionInfo?.timeUntilExpiry && (
                        <div className="flex justify-between">
                          <span>Expires In:</span>
                          <span className="text-xs">
                            {formatDuration(sessionInfo.timeUntilExpiry)}
                          </span>
                        </div>
                      )}
                      {error && (
                        <div className="text-red-600 text-xs">
                          Error: {error.message}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Draft Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Current Step:</span>
                        <Badge>{sessionInfo?.draft?.currentStep || 'Unknown'}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Verified:</span>
                        <Badge variant={sessionInfo?.draft?.verified ? "default" : "secondary"}>
                          {sessionInfo?.draft?.verified ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Borrower ID:</span>
                        <span className="text-xs font-mono">
                          {sessionInfo?.draft?.borrowerId?.slice(0, 12) || 'None'}...
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mobile:</span>
                        <span className="text-xs">
                          {sessionInfo?.draft?.countryCode} {sessionInfo?.draft?.mobile || 'None'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {sessionInfo?.sessionSummary && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Session Activity Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">{sessionInfo.sessionSummary.totalLogs}</div>
                        <div className="text-xs text-gray-600">Total Logs</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">{sessionInfo.sessionSummary.errorCount}</div>
                        <div className="text-xs text-gray-600">Errors</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-yellow-600">{sessionInfo.sessionSummary.warnCount}</div>
                        <div className="text-xs text-gray-600">Warnings</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold">{sessionInfo.sessionSummary.categories.length}</div>
                        <div className="text-xs text-gray-600">Categories</div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Button onClick={refreshSessionInfo} size="sm">
                    🔄 Refresh
                  </Button>
                  <Button onClick={testAuthFlow} size="sm" variant="outline">
                    🧪 Test Auth
                  </Button>
                  <Button onClick={clearSessionData} size="sm" variant="destructive">
                    🗑️ Clear Session
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="auth" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Authentication Testing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button onClick={testAuthFlow}>
                        🔍 Test Session Validation
                      </Button>
                      <Button onClick={async () => {
                        logger.authInfo('Manual token refresh test')
                        try {
                          await authManager.refreshSession()
                          logger.authInfo('Token refresh test completed')
                          refreshSessionInfo()
                        } catch (error) {
                          logger.authError('Token refresh test failed', { error: error.message })
                        }
                      }}>
                        🔄 Test Token Refresh
                      </Button>
                      <Button onClick={async () => {
                        logger.authInfo('Session validation test with user ID')
                        try {
                          const result = await authManager.validateSession(draft.borrower_id)
                          logger.authInfo('Validation test completed', result)
                        } catch (error) {
                          logger.authError('Validation test failed', { error: error.message })
                        }
                      }}>
                        👤 Test User Validation
                      </Button>
                      <Button onClick={simulateAuthError} variant="outline">
                        ⚠️ Simulate Auth Error
                      </Button>
                    </div>
                    
                    <div className="text-sm text-gray-600 p-3 bg-blue-50 rounded">
                      <strong>Testing Guide:</strong> Use these buttons to test different authentication flows. 
                      Results will appear in the logs and can be viewed in the Logs tab.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="monitoring" className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold">{realTimeStats.totalLogs}</div>
                    <div className="text-sm text-gray-600">Total Logs</div>
                    <div className="text-xs text-gray-500 mt-1">Real-time</div>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold text-red-600">{realTimeStats.errorCount}</div>
                    <div className="text-sm text-gray-600">Errors</div>
                    <div className="text-xs text-gray-500 mt-1">Last 2s</div>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold text-yellow-600">{realTimeStats.warnCount}</div>
                    <div className="text-sm text-gray-600">Warnings</div>
                    <div className="text-xs text-gray-500 mt-1">Live count</div>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="text-sm font-bold">
                      {realTimeStats.lastActivity !== 'No activity' ? 
                        formatTime(realTimeStats.lastActivity) : 'None'}
                    </div>
                    <div className="text-sm text-gray-600">Last Activity</div>
                    <div className="text-xs text-gray-500 mt-1">Timestamp</div>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Log Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {logger.getLogs().reduce((categories, log) => {
                        categories.add(log.category)
                        return categories
                      }, new Set<string>()).size > 0 ? (
                        Array.from(logger.getLogs().reduce((categories, log) => {
                          categories.add(log.category)
                          return categories
                        }, new Set<string>())).map(category => (
                          <Badge key={category} variant="outline">
                            {category}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-500 text-sm">No log categories yet</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 border rounded">
                        <div className="text-lg font-bold">
                          {sessionInfo?.timeUntilExpiry ? 
                            formatDuration(sessionInfo.timeUntilExpiry) : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-600">Token TTL</div>
                      </div>
                      <div className="p-3 border rounded">
                        <div className="text-lg font-bold">
                          {logger.getLogs().length}
                        </div>
                        <div className="text-xs text-gray-600">Log Buffer Size</div>
                      </div>
                      <div className="p-3 border rounded">
                        <div className="text-lg font-bold">
                          {Math.round(performance.now())}ms
                        </div>
                        <div className="text-xs text-gray-600">Page Load Time</div>
                      </div>
                    </div>

                    <Button 
                      onClick={() => {
                        const start = performance.now()
                        authManager.getValidSession().then(() => {
                          const duration = performance.now() - start
                          logger.info('PERFORMANCE', `Session validation took ${duration.toFixed(2)}ms`)
                        })
                      }}
                      size="sm"
                      className="w-full"
                    >
                      📊 Measure Session Validation Time
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tools" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={() => setShowLogViewer(true)} className="h-20 flex flex-col">
                    <span className="text-2xl mb-1">📋</span>
                    <span>Log Viewer</span>
                    <span className="text-xs opacity-70">View & export logs</span>
                  </Button>
                  <Button onClick={() => setShowDiagnostics(true)} className="h-20 flex flex-col">
                    <span className="text-2xl mb-1">🔧</span>
                    <span>Diagnostics</span>
                    <span className="text-xs opacity-70">Run system tests</span>
                  </Button>
                  <Button 
                    onClick={() => {
                      const logs = logger.exportLogs()
                      navigator.clipboard.writeText(logs)
                      logger.info('TOOLS', 'Logs copied to clipboard')
                    }}
                    variant="outline"
                    className="h-20 flex flex-col"
                  >
                    <span className="text-2xl mb-1">📋</span>
                    <span>Copy Logs</span>
                    <span className="text-xs opacity-70">To clipboard</span>
                  </Button>
                  <Button 
                    onClick={() => {
                      logger.clearLogs()
                      refreshSessionInfo()
                    }}
                    variant="destructive"
                    className="h-20 flex flex-col"
                  >
                    <span className="text-2xl mb-1">🗑️</span>
                    <span>Clear Logs</span>
                    <span className="text-xs opacity-70">Reset all data</span>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <LogViewer 
        isOpen={showLogViewer}
        onClose={() => setShowLogViewer(false)}
        maxHeight="500px"
        showExportOptions={true}
      />

      <AuthDiagnostics
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
      />
    </>
  )
}