import { supabase } from './supabase'
import { logger } from './logger'
import { Session } from '@supabase/supabase-js'

export interface FallbackAuthOptions {
  maxRetries: number
  retryDelay: number
  fallbackToAnonymous: boolean
  enableOfflineMode: boolean
}

export interface FallbackAuthResult {
  success: boolean
  method: 'primary' | 'retry' | 'anonymous' | 'offline'
  session?: Session
  error?: string
  attempts: number
}

class FallbackAuthManager {
  private defaultOptions: FallbackAuthOptions = {
    maxRetries: 3,
    retryDelay: 2000,
    fallbackToAnonymous: false,
    enableOfflineMode: true
  }

  /**
   * Attempt authentication with multiple fallback strategies
   */
  async authenticateWithFallback(
    primaryAuthFn: () => Promise<Session | null>,
    options: Partial<FallbackAuthOptions> = {}
  ): Promise<FallbackAuthResult> {
    const opts = { ...this.defaultOptions, ...options }
    let attempts = 0
    let lastError: string = ''

    logger.authInfo('Starting fallback authentication flow', { options: opts })

    // Primary authentication attempt
    try {
      attempts++
      logger.authDebug('Attempting primary authentication', { attempt: attempts })
      
      const result = await primaryAuthFn()
      
      if (result) {
        logger.authInfo('Primary authentication successful')
        return {
          success: true,
          method: 'primary',
          session: result,
          attempts
        }
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
      logger.authWarn('Primary authentication failed', { error: lastError, attempt: attempts })
    }

    // Retry attempts with exponential backoff
    for (let i = 0; i < opts.maxRetries; i++) {
      attempts++
      const delay = opts.retryDelay * Math.pow(2, i)
      
      logger.authDebug(`Retry attempt ${i + 1}/${opts.maxRetries}`, { delay, attempt: attempts })
      
      await this.delay(delay)
      
      try {
        const result = await primaryAuthFn()
        
        if (result) {
          logger.authInfo('Retry authentication successful', { retryAttempt: i + 1 })
          return {
            success: true,
            method: 'retry',
            session: result,
            attempts
          }
        }
      } catch (error: unknown) {
        lastError = error instanceof Error ? error.message : 'Unknown error'
        logger.authWarn(`Retry attempt ${i + 1} failed`, { error: lastError, attempt: attempts })
      }
    }

    // Fallback to anonymous session if enabled
    if (opts.fallbackToAnonymous) {
      try {
        attempts++
        logger.authDebug('Attempting anonymous fallback', { attempt: attempts })
        
        const anonymousResult = await this.createAnonymousSession()
        
        if (anonymousResult) {
          logger.authInfo('Anonymous fallback successful')
          return {
            success: true,
            method: 'anonymous',
            session: anonymousResult,
            attempts
          }
        }
      } catch (error: unknown) {
        lastError = error instanceof Error ? error.message : 'Unknown error'
        logger.authWarn('Anonymous fallback failed', { error: lastError, attempt: attempts })
      }
    }

    // Offline mode fallback if enabled
    if (opts.enableOfflineMode) {
      try {
        attempts++
        logger.authDebug('Attempting offline mode fallback', { attempt: attempts })
        
        const offlineResult = await this.createOfflineSession()
        
        if (offlineResult) {
          logger.authInfo('Offline mode fallback successful')
          return {
            success: true,
            method: 'offline',
            session: offlineResult,
            attempts
          }
        }
      } catch (error: unknown) {
        lastError = error instanceof Error ? error.message : 'Unknown error'
        logger.authWarn('Offline mode fallback failed', { error: lastError, attempt: attempts })
      }
    }

    // All fallback methods failed
    logger.authError('All authentication methods failed', { 
      lastError, 
      attempts,
      methods: ['primary', 'retry', opts.fallbackToAnonymous && 'anonymous', opts.enableOfflineMode && 'offline'].filter(Boolean)
    })

    return {
      success: false,
      method: 'primary',
      error: lastError || 'All authentication methods failed',
      attempts
    }
  }

  /**
   * Create anonymous session for limited functionality
   */
  private async createAnonymousSession(): Promise<Session | null> {
    try {
      const { data, error } = await supabase.auth.signInAnonymously()
      
      if (error) {
        throw error
      }

      logger.authInfo('Anonymous session created', { userId: data.user?.id })
      
      return data.session
    } catch (error) {
      logger.authError('Failed to create anonymous session', { error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }

  /**
   * Create offline session using cached data
   */
  private async createOfflineSession(): Promise<Session | null> {
    try {
      // Check for cached session data
      const cachedSession = this.getCachedSession()
      
      if (cachedSession && this.isSessionValid(cachedSession)) {
        logger.authInfo('Using cached offline session', { userId: cachedSession.user?.id })
        
        return {
          ...cachedSession,
          isOffline: true
        }
      }

      // Create minimal offline session
      const offlineSession = {
        user: {
          id: 'offline-user',
          email: 'offline@example.com',
          isOffline: true
        },
        access_token: 'offline-token',
        refresh_token: 'offline-refresh',
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        isOffline: true
      }

      logger.authInfo('Created minimal offline session')
      
      return offlineSession
    } catch (error) {
      logger.authError('Failed to create offline session', { error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }

  /**
   * Cache session data for offline use
   */
  cacheSession(session: Session | null): void {
    try {
      if (!session) {
        localStorage.removeItem('fallback_session')
        return
      }
      
      const cacheData = {
        user: session.user,
        access_token: session.access_token,
        expires_at: session.expires_at,
        cached_at: Date.now()
      }
      
      localStorage.setItem('cached_session', JSON.stringify(cacheData))
      logger.authDebug('Session cached for offline use', { userId: session.user?.id })
    } catch (error) {
      logger.authWarn('Failed to cache session', { error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  /**
   * Get cached session data
   */
  private getCachedSession(): Session | null {
    try {
      const cached = localStorage.getItem('cached_session')
      
      if (!cached) {
        return null
      }

      const session = JSON.parse(cached)
      logger.authDebug('Retrieved cached session', { userId: session.user?.id })
      
      return session
    } catch (error) {
      logger.authWarn('Failed to retrieve cached session', { error: error instanceof Error ? error.message : 'Unknown error' })
      return null
    }
  }

  /**
   * Check if cached session is still valid
   */
  private isSessionValid(session: Session | null): boolean {
    if (!session || !session.expires_at) {
      return false
    }

    const now = Math.floor(Date.now() / 1000)
    const isValid = session.expires_at > now

    logger.authDebug('Session validity check', { 
      expiresAt: session.expires_at, 
      now, 
      isValid 
    })

    return isValid
  }

  /**
   * Clear cached session data
   */
  clearCache(): void {
    try {
      localStorage.removeItem('cached_session')
      logger.authDebug('Session cache cleared')
    } catch (error) {
      logger.authWarn('Failed to clear session cache', { error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  /**
   * Check network connectivity
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      // Try to reach Supabase
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        }
      })
      
      const isOnline = response.ok
      logger.authDebug('Connectivity check', { isOnline, status: response.status })
      
      return isOnline
    } catch (error) {
      logger.authDebug('Connectivity check failed', { error: error instanceof Error ? error.message : 'Unknown error' })
      return false
    }
  }

  /**
   * Get authentication health status
   */
  async getAuthHealth(): Promise<{
    connectivity: boolean
    supabaseStatus: boolean
    cacheAvailable: boolean
    anonymousEnabled: boolean
  }> {
    const connectivity = await this.checkConnectivity()
    const cacheAvailable = !!this.getCachedSession()
    
    let supabaseStatus = false
    try {
      await supabase.auth.getSession()
      supabaseStatus = true
    } catch (error) {
      logger.authWarn('Supabase auth health check failed', { error: error instanceof Error ? error.message : 'Unknown error' })
    }

    const health = {
      connectivity,
      supabaseStatus,
      cacheAvailable,
      anonymousEnabled: true // Assuming anonymous auth is enabled
    }

    logger.authInfo('Auth health check completed', health)
    
    return health
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const fallbackAuthManager = new FallbackAuthManager()

// Utility functions for common fallback scenarios
export async function authenticateWithRetry(
  authFunction: () => Promise<Session | null>,
  maxRetries: number = 3
): Promise<FallbackAuthResult> {
  return fallbackAuthManager.authenticateWithFallback(authFunction, {
    maxRetries,
    fallbackToAnonymous: false,
    enableOfflineMode: false
  })
}

export async function authenticateWithFullFallback(
  authFunction: () => Promise<any>
): Promise<FallbackAuthResult> {
  return fallbackAuthManager.authenticateWithFallback(authFunction, {
    maxRetries: 3,
    fallbackToAnonymous: true,
    enableOfflineMode: true
  })
}