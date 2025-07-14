'use client'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { fallbackAuthManager, type FallbackAuthResult } from '@/lib/fallbackAuth'
import { authManager } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface AuthFallbackContextType {
  isOnline: boolean
  authHealth: any
  lastFallbackResult: FallbackAuthResult | null
  retryAuthentication: () => Promise<void>
  enableOfflineMode: () => void
  clearAuthCache: () => void
}

const AuthFallbackContext = createContext<AuthFallbackContextType | undefined>(undefined)

interface AuthFallbackProviderProps {
  children: ReactNode
  enableFallbacks?: boolean
  showHealthIndicator?: boolean
}

export function AuthFallbackProvider({ 
  children, 
  enableFallbacks = true,
  showHealthIndicator = process.env.NODE_ENV === 'development'
}: AuthFallbackProviderProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [authHealth, setAuthHealth] = useState<any>(null)
  const [lastFallbackResult, setLastFallbackResult] = useState<FallbackAuthResult | null>(null)
  const [showHealthPanel, setShowHealthPanel] = useState(false)

  useEffect(() => {
    // Monitor online status
    const handleOnline = () => {
      setIsOnline(true)
      logger.authInfo('Network connectivity restored')
      checkAuthHealth()
    }

    const handleOffline = () => {
      setIsOnline(false)
      logger.authWarn('Network connectivity lost')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial health check
    checkAuthHealth()

    // Periodic health checks
    const healthCheckInterval = setInterval(checkAuthHealth, 30000) // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(healthCheckInterval)
    }
  }, [])

  const checkAuthHealth = async () => {
    try {
      const health = await fallbackAuthManager.getAuthHealth()
      setAuthHealth(health)
      logger.authDebug('Auth health updated', health)
    } catch (error) {
      logger.authError('Auth health check failed', { error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  const retryAuthentication = async () => {
    logger.authInfo('Manual authentication retry initiated')
    
    try {
      const result = await fallbackAuthManager.authenticateWithFallback(
        async () => {
          const session = await authManager.getValidSession()
          if (!session) {
            throw new Error('No valid session available')
          }
          return session
        },
        {
          maxRetries: 3,
          retryDelay: 1000,
          fallbackToAnonymous: !isOnline,
          enableOfflineMode: !isOnline
        }
      )

      setLastFallbackResult(result)
      logger.authInfo('Manual retry completed', { success: result.success, method: result.method })
      
      if (result.success) {
        await checkAuthHealth()
      }
    } catch (error) {
      logger.authError('Manual retry failed', { error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  const enableOfflineMode = () => {
    logger.authInfo('Offline mode manually enabled')
    fallbackAuthManager.authenticateWithFallback(
      async () => {
        throw new Error('Forcing offline mode')
      },
      {
        maxRetries: 0,
        fallbackToAnonymous: false,
        enableOfflineMode: true
      }
    ).then(result => {
      setLastFallbackResult(result)
      logger.authInfo('Offline mode activated', result)
    })
  }

  const clearAuthCache = () => {
    fallbackAuthManager.clearCache()
    logger.authInfo('Authentication cache cleared')
    checkAuthHealth()
  }

  const contextValue: AuthFallbackContextType = {
    isOnline,
    authHealth,
    lastFallbackResult,
    retryAuthentication,
    enableOfflineMode,
    clearAuthCache
  }

  return (
    <AuthFallbackContext.Provider value={contextValue}>
      {children}
      
      {/* Health Indicator */}
      {showHealthIndicator && (
        <div className="fixed bottom-4 left-4 z-40">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowHealthPanel(!showHealthPanel)}
            className={`${
              authHealth?.connectivity && authHealth?.supabaseStatus 
                ? 'border-green-500 text-green-700' 
                : 'border-yellow-500 text-yellow-700'
            }`}
          >
            <div className={`w-2 h-2 rounded-full mr-2 ${
              authHealth?.connectivity && authHealth?.supabaseStatus 
                ? 'bg-green-500' 
                : 'bg-yellow-500'
            }`} />
            Auth Health
          </Button>
          
          {showHealthPanel && (
            <Card className="mt-2 w-80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Authentication Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs">Network:</span>
                  <Badge variant={isOnline ? "default" : "destructive"}>
                    {isOnline ? "Online" : "Offline"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs">Supabase:</span>
                  <Badge variant={authHealth?.supabaseStatus ? "default" : "destructive"}>
                    {authHealth?.supabaseStatus ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs">Cache:</span>
                  <Badge variant={authHealth?.cacheAvailable ? "default" : "secondary"}>
                    {authHealth?.cacheAvailable ? "Available" : "Empty"}
                  </Badge>
                </div>
                
                {lastFallbackResult && (
                  <div className="pt-2 border-t">
                    <div className="text-xs text-gray-600 mb-1">Last Fallback:</div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Method:</span>
                      <Badge variant="outline">{lastFallbackResult.method}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Success:</span>
                      <Badge variant={lastFallbackResult.success ? "default" : "destructive"}>
                        {lastFallbackResult.success ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Attempts:</span>
                      <span className="text-xs">{lastFallbackResult.attempts}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-1 pt-2">
                  <Button size="sm" onClick={retryAuthentication} className="flex-1 text-xs">
                    Retry
                  </Button>
                  <Button size="sm" onClick={clearAuthCache} variant="outline" className="flex-1 text-xs">
                    Clear Cache
                  </Button>
                </div>
                
                {!isOnline && (
                  <Button size="sm" onClick={enableOfflineMode} variant="secondary" className="w-full text-xs">
                    Enable Offline Mode
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AuthFallbackContext.Provider>
  )
}

export function useAuthFallback() {
  const context = useContext(AuthFallbackContext)
  if (context === undefined) {
    throw new Error('useAuthFallback must be used within an AuthFallbackProvider')
  }
  return context
}