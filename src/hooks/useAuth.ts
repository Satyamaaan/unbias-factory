'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authManager, type AuthSession, type AuthError } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface UseAuthReturn {
  session: AuthSession | null
  loading: boolean
  error: AuthError | null
  isAuthenticated: boolean
  refreshSession: () => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

export function useAuth(requiredUserId?: string): UseAuthReturn {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)
  const router = useRouter()

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const newSession = await authManager.refreshSession()
      setSession(newSession)
      
      if (!newSession) {
        setError({
          type: 'SESSION_EXPIRED',
          message: 'Session could not be refreshed. Please log in again.',
          retryable: false
        })
      }
    } catch (error: any) {
      console.error('Manual refresh failed:', error)
      setError({
        type: 'UNKNOWN',
        message: error.message || 'Failed to refresh session',
        retryable: true
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      await authManager.signOut()
      setSession(null)
      setError(null)
      router.push('/onboarding')
    } catch (error: any) {
      console.error('Sign out failed:', error)
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
      
      const { valid, session: validSession, error: validationError } = await authManager.validateSession(requiredUserId)
      
      if (valid && validSession) {
        setSession(validSession)
      } else {
        setSession(null)
        if (validationError) {
          setError(validationError)
        }
      }
    } catch (error: any) {
      console.error('Session validation failed:', error)
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
    validateAndSetSession()
  }, [validateAndSetSession])

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      
      if (event === 'SIGNED_OUT' || !session) {
        setSession(null)
        setError(null)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Validate the new session
        await validateAndSetSession()
      }
    })

    return () => subscription.unsubscribe()
  }, [validateAndSetSession])

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!session) return

    const expiresAt = session.expires_at * 1000 // Convert to milliseconds
    const now = Date.now()
    const timeUntilExpiry = expiresAt - now
    const refreshTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 60 * 1000) // 5 minutes before expiry, minimum 1 minute

    if (refreshTime > 0) {
      const timer = setTimeout(() => {
        console.log('Auto-refreshing token before expiration')
        refreshSession()
      }, refreshTime)

      return () => clearTimeout(timer)
    }
  }, [session, refreshSession])

  return {
    session,
    loading,
    error,
    isAuthenticated: !!session,
    refreshSession,
    signOut,
    clearError
  }
}