'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authManager, type AuthSession, type AuthError } from '@/lib/auth'
import { fallbackAuthManager } from '@/lib/fallbackAuth'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface UseAuthReturn {
  session: AuthSession | null
  loading: boolean
  error: AuthError | null
  isAuthenticated: boolean
  refreshSession: () => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
  retryCount: number
  lastRefresh: Date | null
}

export function useAuth(requiredUserId?: string): UseAuthReturn {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const router = useRouter()

  const clearError = useCallback(() => {
    setError(null)
    setRetryCount(0)
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      logger.authInfo('Manual session refresh initiated', { 
        requiredUserId,
        retryCount 
      })
      
      // Try primary refresh first
      let newSession = await authManager.refreshSession()
      
      // If primary fails, try fallback authentication
      if (!newSession) {
        logger.authWarn('Primary refresh failed, attempting fallback authentication')
        
        const fallbackResult = await fallbackAuthManager.authenticateWithFallback(
          async () => {
            const session = await authManager.getValidSession()
            if (!session) {
              throw new Error('No valid session available')
            }
            return session
          },
          {
            maxRetries: 2,
            retryDelay: 1000,
            fallbackToAnonymous: false,
            enableOfflineMode: false
          }
        )
        
        if (fallbackResult.success && fallbackResult.session) {
          newSession = fallbackResult.session
          logger.authInfo('Fallback authentication successful', { 
            method: fallbackResult.method,
            attempts: fallbackResult.attempts 
          })
        }
      }
      
      setSession(newSession)
      setLastRefresh(new Date())
      
      if (!newSession) {
        setError({
          type: 'SESSION_EXPIRED',
          message: 'Session could not be refreshed. Please log in again.',
          retryable: false
        })
        logger.authError('Session refresh failed completely')
      } else {
        logger.authInfo('Session refresh successful', { 
          userId: newSession.user?.id,
          expiresAt: newSession.expires_at 
        })
      }
    } catch (error: any) {
      logger.authError('Manual refresh failed', { 
        error: error.message,
        retryCount 
      })
      
      setError({
        type: 'UNKNOWN',
        message: error.message || 'Failed to refresh session',
        retryable: true
      })
      setRetryCount(prev => prev + 1)
    } finally {
      setLoading(false)
    }
  }, [requiredUserId, retryCount])

  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      logger.authInfo('Sign out initiated')
      
      await authManager.signOut()
      setSession(null)
      setError(null)
      setRetryCount(0)
      
      logger.authInfo('Sign out completed successfully')
      router.push('/onboarding')
    } catch (error: any) {
      logger.authError('Sign out failed', { error: error.message })
      // Still clear local state even if API call fails
      setSession(null)
      router.push('/onboarding')
    } finally {
      setLoading(false)
    }
  }, [router])

  const validateAndSetSession = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      logger.authDebug('Validating session', { requiredUserId })
      
      const { valid, session: validSession, error: validationError } = await authManager.validateSession(requiredUserId)
      
      if (valid && validSession) {
        setSession(validSession)
        setRetryCount(0)
        
        // Cache session for offline use
        fallbackAuthManager.cacheSession(validSession)
        
        logger.authInfo('Session validation successful', { 
          userId: validSession.user?.id,
          expiresAt: validSession.expires_at 
        })
      } else {
        setSession(null)
        if (validationError) {
          setError(validationError)
          logger.authWarn('Session validation failed', { 
            error: validationError.message,
            retryable: validationError.retryable 
          })
        }
      }
    } catch (error: any) {
      logger.authError('Session validation error', { 
        error: error.message,
        requiredUserId 
      })
      
      setSession(null)
      setError({
        type: 'UNKNOWN',
        message: error.message || 'Authentication check failed',
        retryable: true
      })
    } finally {
      setLoading(false)
    }
  }, [requiredUserId])

  // Initial session check
  useEffect(() => {
    logger.authDebug('useAuth hook initialized', { requiredUserId })
    validateAndSetSession()
  }, [validateAndSetSession])

  // Listen for auth state changes
  useEffect(() => {
    logger.authDebug('Setting up auth state listener')
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.authInfo('Auth state changed', { 
        event, 
        userId: session?.user?.id,
        hasSession: !!session 
      })
      
      if (event === 'SIGNED_OUT' || !session) {
        setSession(null)
        setError(null)
        setRetryCount(0)
        logger.authInfo('User signed out, clearing session state')
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Validate the new session
        await validateAndSetSession()
      }
    })

    return () => {
      logger.authDebug('Cleaning up auth state listener')
      subscription.unsubscribe()
    }
  }, [validateAndSetSession])

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!session) return

    const expiresAt = session.expires_at * 1000 // Convert to milliseconds
    const now = Date.now()
    const timeUntilExpiry = expiresAt - now
    const refreshTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 60 * 1000) // 5 minutes before expiry, minimum 1 minute

    if (refreshTime > 0) {
      logger.authDebug('Setting up auto-refresh timer', { 
        refreshTime: Math.round(refreshTime / 1000),
        expiresAt: new Date(expiresAt).toISOString() 
      })
      
      const timer = setTimeout(() => {
        logger.authInfo('Auto-refreshing token before expiration')
        refreshSession()
      }, refreshTime)

      return () => {
        logger.authDebug('Clearing auto-refresh timer')
        clearTimeout(timer)
      }
    }
  }, [session, refreshSession])

  // Retry logic for retryable errors
  useEffect(() => {
    if (error?.retryable && retryCount < 3 && retryCount > 0) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000) // Exponential backoff, max 10s
      
      logger.authInfo('Scheduling retry for retryable error', { 
        retryCount,
        retryDelay,
        error: error.message 
      })
      
      const timer = setTimeout(() => {
        logger.authInfo('Executing scheduled retry', { retryCount })
        validateAndSetSession()
      }, retryDelay)

      return () => clearTimeout(timer)
    }
  }, [error, retryCount, validateAndSetSession])

  return {
    session,
    loading,
    error,
    isAuthenticated: !!session,
    refreshSession,
    signOut,
    clearError,
    retryCount,
    lastRefresh
  }
}