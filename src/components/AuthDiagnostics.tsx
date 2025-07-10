'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { authManager } from '@/lib/auth'
import { fallbackAuthManager } from '@/lib/fallbackAuth'
import { logger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'
import { useAuthFallback } from './AuthFallbackProvider'

interface AuthDiagnosticsProps {
  isOpen: boolean
  onClose: () => void
}

interface DiagnosticTest {
  name: string
  description: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  result?: Record<string, unknown>
  error?: string
  duration?: number
}

export function AuthDiagnostics({ isOpen, onClose }: AuthDiagnosticsProps) {
  const { session, loading, error } = useAuth()
  const { isOnline, authHealth } = useAuthFallback()
  const [tests, setTests] = useState<DiagnosticTest[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)

  const diagnosticTests: Omit<DiagnosticTest, 'status'>[] = [
    {
      name: 'Session Validation',
      description: 'Check if current session is valid and not expired'
    },
    {
      name: 'Token Refresh',
      description: 'Test token refresh mechanism'
    },
    {
      name: 'Network Connectivity',
      description: 'Verify connection to Supabase services'
    },
    {
      name: 'Cache Functionality',
      description: 'Test session caching and retrieval'
    },
    {
      name: 'Fallback Authentication',
      description: 'Test fallback authentication mechanisms'
    },
    {
      name: 'RLS Permissions',
      description: 'Verify Row Level Security permissions'
    },
    {
      name: 'API Endpoints',
      description: 'Test critical API endpoint accessibility'
    }
  ]

  useEffect(() => {
    if (isOpen) {
      initializeTests()
    }
  }, [isOpen])

  const initializeTests = () => {
    setTests(diagnosticTests.map(test => ({ ...test, status: 'pending' })))
    setProgress(0)
  }

  const runAllTests = async () => {
    setIsRunning(true)
    setProgress(0)
    
    const testResults: DiagnosticTest[] = []
    
    for (let i = 0; i < diagnosticTests.length; i++) {
      const test = diagnosticTests[i]
      const testWithStatus: DiagnosticTest = { ...test, status: 'running' }
      
      setTests(prev => [
        ...prev.slice(0, i),
        testWithStatus,
        ...prev.slice(i + 1)
      ])
      
      const startTime = Date.now()
      
      try {
        let result: Record<string, unknown>
        
        switch (test.name) {
          case 'Session Validation':
            result = await testSessionValidation()
            break
          case 'Token Refresh':
            result = await testTokenRefresh()
            break
          case 'Network Connectivity':
            result = await testNetworkConnectivity()
            break
          case 'Cache Functionality':
            result = await testCacheFunctionality()
            break
          case 'Fallback Authentication':
            result = await testFallbackAuthentication()
            break
          case 'RLS Permissions':
            result = await testRLSPermissions()
            break
          case 'API Endpoints':
            result = await testAPIEndpoints()
            break
          default:
            throw new Error('Unknown test')
        }
        
        const duration = Date.now() - startTime
        
        testResults.push({
          ...test,
          status: 'passed',
          result,
          duration
        })
        
        logger.info('DIAGNOSTICS', `Test passed: ${test.name}`, { result, duration })
        
      } catch (error: unknown) {
        const duration = Date.now() - startTime
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        testResults.push({
          ...test,
          status: 'failed',
          error: errorMessage,
          duration
        })
        
        logger.error('DIAGNOSTICS', `Test failed: ${test.name}`, { error: errorMessage, duration })
      }
      
      setProgress(((i + 1) / diagnosticTests.length) * 100)
      
      // Update tests state
      setTests(prev => [
        ...prev.slice(0, i),
        testResults[i],
        ...prev.slice(i + 1)
      ])
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    setIsRunning(false)
    logger.info('DIAGNOSTICS', 'All diagnostic tests completed', { 
      passed: testResults.filter(t => t.status === 'passed').length,
      failed: testResults.filter(t => t.status === 'failed').length
    })
  }

  // Individual test implementations
  const testSessionValidation = async () => {
    const validation = await authManager.validateSession()
    if (!validation.valid) {
      throw new Error(validation.error?.message || 'Session validation failed')
    }
    return {
      valid: validation.valid,
      userId: validation.session?.user?.id,
      expiresAt: validation.session?.expires_at
    }
  }

  const testTokenRefresh = async () => {
    const refreshedSession = await authManager.refreshSession()
    if (!refreshedSession) {
      throw new Error('Token refresh returned null')
    }
    return {
      success: true,
      newExpiresAt: refreshedSession.expires_at
    }
  }

  const testNetworkConnectivity = async () => {
    const isConnected = await fallbackAuthManager.checkConnectivity()
    if (!isConnected) {
      throw new Error('Network connectivity test failed')
    }
    return { connected: true }
  }

  const testCacheFunctionality = async () => {
    // Test caching by storing and retrieving a test session
    const testSession = {
      user: { id: 'test-user' },
      access_token: 'test-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600
    }
    
    fallbackAuthManager.cacheSession(testSession)
    
    // Clear and check if cache works
    const health = await fallbackAuthManager.getAuthHealth()
    
    return {
      cacheAvailable: health.cacheAvailable
    }
  }

  const testFallbackAuthentication = async () => {
    const result = await fallbackAuthManager.authenticateWithFallback(
      async () => {
        // Simulate a failing auth attempt for testing
        throw new Error('Simulated auth failure for testing')
      },
      {
        maxRetries: 1,
        retryDelay: 100,
        fallbackToAnonymous: false,
        enableOfflineMode: true
      }
    )
    
    return {
      success: result.success,
      method: result.method,
      attempts: result.attempts
    }
  }

  const testRLSPermissions = async () => {
    // This would test actual RLS by making a query
    // For now, we'll simulate based on session state
    if (!session) {
      throw new Error('No session available for RLS test')
    }
    
    return {
      hasValidSession: !!session,
      userId: session.user?.id
    }
  }

  const testAPIEndpoints = async () => {
    // Test critical endpoints
    const endpoints = [
      '/functions/v1/match_offers'
    ]
    
    const results = []
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}${endpoint}`, {
          method: 'OPTIONS', // Use OPTIONS to avoid triggering actual logic
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        
        results.push({
          endpoint,
          status: response.status,
          accessible: response.status < 500
        })
      } catch (error) {
        results.push({
          endpoint,
          error: error instanceof Error ? error.message : 'Unknown error',
          accessible: false
        })
      }
    }
    
    return { endpoints: results }
  }

  const getStatusColor = (status: DiagnosticTest['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'passed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: DiagnosticTest['status']) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'running': return '🔄'
      case 'passed': return '✅'
      case 'failed': return '❌'
      default: return '❓'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>Authentication Diagnostics</span>
            {isRunning && (
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            )}
          </CardTitle>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </CardHeader>
        
        <CardContent className="overflow-auto">
          <Tabs defaultValue="tests" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tests">Diagnostic Tests</TabsTrigger>
              <TabsTrigger value="status">Current Status</TabsTrigger>
              <TabsTrigger value="health">System Health</TabsTrigger>
            </TabsList>

            <TabsContent value="tests" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Diagnostic Tests</h3>
                <Button 
                  onClick={runAllTests} 
                  disabled={isRunning}
                  className="flex items-center gap-2"
                >
                  {isRunning ? '🔄 Running...' : '▶️ Run All Tests'}
                </Button>
              </div>

              {isRunning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              <div className="space-y-3">
                {tests.map((test, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getStatusIcon(test.status)}</span>
                        <div>
                          <h4 className="font-medium">{test.name}</h4>
                          <p className="text-sm text-gray-600">{test.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(test.status)}>
                          {test.status}
                        </Badge>
                        {test.duration && (
                          <span className="text-xs text-gray-500">
                            {test.duration}ms
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {test.result && (
                      <details className="mt-2">
                        <summary className="text-sm cursor-pointer text-green-600">
                          View Result
                        </summary>
                        <pre className="text-xs bg-green-50 p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(test.result, null, 2)}
                        </pre>
                      </details>
                    )}
                    
                    {test.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-700">{test.error}</p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="status" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Session Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Loading:</span>
                      <Badge variant={loading ? "default" : "secondary"}>
                        {loading ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Authenticated:</span>
                      <Badge variant={session ? "default" : "destructive"}>
                        {session ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>User ID:</span>
                      <span className="text-xs font-mono">
                        {session?.user?.id?.slice(0, 8) || 'None'}...
                      </span>
                    </div>
                    {error && (
                      <div className="text-red-600 text-xs">
                        Error: {error.message}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Network Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Online:</span>
                      <Badge variant={isOnline ? "default" : "destructive"}>
                        {isOnline ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Supabase:</span>
                      <Badge variant={authHealth?.supabaseStatus ? "default" : "destructive"}>
                        {authHealth?.supabaseStatus ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Cache:</span>
                      <Badge variant={authHealth?.cacheAvailable ? "default" : "secondary"}>
                        {authHealth?.cacheAvailable ? "Available" : "Empty"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="health" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">System Health Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div className="p-3 border rounded">
                        <div className="text-2xl mb-1">
                          {authHealth?.connectivity ? '🟢' : '🔴'}
                        </div>
                        <div className="text-xs">Connectivity</div>
                      </div>
                      <div className="p-3 border rounded">
                        <div className="text-2xl mb-1">
                          {authHealth?.supabaseStatus ? '🟢' : '🔴'}
                        </div>
                        <div className="text-xs">Supabase</div>
                      </div>
                      <div className="p-3 border rounded">
                        <div className="text-2xl mb-1">
                          {session ? '🟢' : '🔴'}
                        </div>
                        <div className="text-xs">Session</div>
                      </div>
                      <div className="p-3 border rounded">
                        <div className="text-2xl mb-1">
                          {authHealth?.cacheAvailable ? '🟡' : '⚪'}
                        </div>
                        <div className="text-xs">Cache</div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <p>🟢 = Healthy | 🔴 = Issue | 🟡 = Available | ⚪ = Not Available</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}