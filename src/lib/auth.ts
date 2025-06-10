import { supabase } from './supabase'
import { logger } from './logger'

export interface AuthSession {
  user: any
  access_token: string
  refresh_token: string
  expires_at: number
}

export interface AuthError {
  type: 'SESSION_EXPIRED' | 'TOKEN_INVALID' | 'NETWORK_ERROR' | 'UNKNOWN'
  message: string
  retryable: boolean
}

class AuthManager {
  private refreshPromise: Promise<AuthSession | null> | null = null
  private maxRetries = 3
  private retryDelay = 1000 // 1 second

  /**
   * Get current session with automatic refresh if needed
   */
  async getValidSession(): Promise<AuthSession | null> {
    try {
      logger.authDebug('Getting valid session')
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        logger.authError('Session retrieval error', { error: error.message })
        return null
      }

      if (!session) {
        logger.authDebug('No active session found')
        return null
      }

      // Check if token is expired or will expire soon (within 5 minutes)
      const expiresAt = session.expires_at || 0
      const now = Math.floor(Date.now() / 1000)
      const fiveMinutes = 5 * 60

      if (expiresAt - now < fiveMinutes) {
        logger.authInfo('Token expires soon, refreshing', { 
          expiresAt,
          now,
          timeUntilExpiry: expiresAt - now 
        })
        return await this.refreshSession()
      }

      logger.authDebug('Session is valid', { 
        userId: session.user?.id,
        expiresAt,
        timeUntilExpiry: expiresAt - now 
      })

      return {
        user: session.user,
        access_token: session.access_token,
        refresh_token: session.refresh_token || '',
        expires_at: expiresAt
      }
    } catch (error: any) {
      logger.authError('Error getting session', { error: error.message })
      return null
    }
  }

  /**
   * Refresh session with retry logic
   */
  async refreshSession(): Promise<AuthSession | null> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      logger.authDebug('Refresh already in progress, waiting for existing promise')
      return await this.refreshPromise
    }

    this.refreshPromise = this._performRefresh()
    const result = await this.refreshPromise
    this.refreshPromise = null
    
    return result
  }

  private async _performRefresh(): Promise<AuthSession | null> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.authInfo('Token refresh attempt', { 
          attempt,
          maxRetries: this.maxRetries 
        })
        
        const { data: { session }, error } = await supabase.auth.refreshSession()
        
        if (error) {
          logger.authError('Refresh attempt failed', { 
            attempt,
            error: error.message 
          })
          
          if (attempt === this.maxRetries) {
            throw new Error(`Token refresh failed after ${this.maxRetries} attempts: ${error.message}`)
          }
          
          // Wait before retrying
          await this.delay(this.retryDelay * attempt)
          continue
        }

        if (!session) {
          throw new Error('Refresh returned no session')
        }

        logger.authInfo('Token refreshed successfully', { 
          userId: session.user?.id,
          expiresAt: session.expires_at 
        })
        
        return {
          user: session.user,
          access_token: session.access_token,
          refresh_token: session.refresh_token || '',
          expires_at: session.expires_at || 0
        }
      } catch (error: any) {
        logger.authError('Refresh attempt error', { 
          attempt,
          error: error.message 
        })
        
        if (attempt === this.maxRetries) {
          throw error
        }
        
        await this.delay(this.retryDelay * attempt)
      }
    }
    
    return null
  }

  /**
   * Validate session and handle auth errors
   */
  async validateSession(requiredUserId?: string): Promise<{ valid: boolean; session?: AuthSession; error?: AuthError }> {
    try {
      logger.authDebug('Validating session', { requiredUserId })
      
      const session = await this.getValidSession()
      
      if (!session) {
        logger.authWarn('Session validation failed - no valid session')
        return {
          valid: false,
          error: {
            type: 'SESSION_EXPIRED',
            message: 'No valid session found. Please log in again.',
            retryable: false
          }
        }
      }

      // Validate user ID if required
      if (requiredUserId && session.user.id !== requiredUserId) {
        logger.authError('Session validation failed - user ID mismatch', { 
          sessionUserId: session.user.id,
          requiredUserId 
        })
        
        return {
          valid: false,
          error: {
            type: 'TOKEN_INVALID',
            message: 'Session user does not match required user ID.',
            retryable: false
          }
        }
      }

      logger.authDebug('Session validation successful', { 
        userId: session.user.id 
      })

      return { valid: true, session }
    } catch (error: any) {
      logger.authError('Session validation error', { 
        error: error.message,
        requiredUserId 
      })
      
      return {
        valid: false,
        error: {
          type: error.message?.includes('network') ? 'NETWORK_ERROR' : 'UNKNOWN',
          message: error.message || 'Unknown authentication error',
          retryable: error.message?.includes('network') || error.message?.includes('timeout')
        }
      }
    }
  }

  /**
   * Sign out and clear session
   */
  async signOut(): Promise<void> {
    try {
      logger.authInfo('Signing out user')
      await supabase.auth.signOut()
      logger.authInfo('Sign out successful')
    } catch (error: any) {
      logger.authError('Sign out error', { error: error.message })
      // Don't throw - signing out should always succeed locally
    }
  }

  /**
   * Check if error is auth-related and retryable
   */
  isAuthError(error: any): { isAuth: boolean; retryable: boolean } {
    const message = error?.message?.toLowerCase() || ''
    
    const authKeywords = ['unauthorized', 'forbidden', 'token', 'session', 'expired', 'invalid']
    const isAuth = authKeywords.some(keyword => message.includes(keyword))
    
    const retryableKeywords = ['network', 'timeout', 'connection', 'temporary']
    const retryable = retryableKeywords.some(keyword => message.includes(keyword))
    
    logger.authDebug('Auth error analysis', { 
      message,
      isAuth,
      retryable 
    })
    
    return { isAuth, retryable }
  }

  /**
   * Get session health information
   */
  async getSessionHealth(): Promise<{
    hasSession: boolean
    isValid: boolean
    expiresAt?: number
    timeUntilExpiry?: number
    userId?: string
    lastRefresh?: Date
  }> {
    try {
      const session = await this.getValidSession()
      
      if (!session) {
        return {
          hasSession: false,
          isValid: false
        }
      }

      const now = Math.floor(Date.now() / 1000)
      const timeUntilExpiry = session.expires_at - now

      return {
        hasSession: true,
        isValid: timeUntilExpiry > 0,
        expiresAt: session.expires_at,
        timeUntilExpiry: Math.max(0, timeUntilExpiry),
        userId: session.user?.id
      }
    } catch (error: any) {
      logger.authError('Session health check failed', { error: error.message })
      return {
        hasSession: false,
        isValid: false
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const authManager = new AuthManager()

// Utility functions for common auth operations
export async function requireAuth(requiredUserId?: string): Promise<AuthSession> {
  const { valid, session, error } = await authManager.validateSession(requiredUserId)
  
  if (!valid || !session) {
    const errorMessage = error?.message || 'Authentication required'
    logger.authError('Authentication requirement failed', { 
      error: errorMessage,
      requiredUserId 
    })
    throw new Error(errorMessage)
  }
  
  return session
}

export async function makeAuthenticatedRequest<T>(
  requestFn: (session: AuthSession) => Promise<T>,
  requiredUserId?: string
): Promise<T> {
  logger.authDebug('Making authenticated request', { requiredUserId })
  
  const session = await requireAuth(requiredUserId)
  
  try {
    const result = await requestFn(session)
    logger.authDebug('Authenticated request successful')
    return result
  } catch (error: any) {
    logger.authError('Authenticated request failed', { 
      error: error.message,
      requiredUserId 
    })
    throw error
  }
}

export async function withAuthRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      const { isAuth, retryable } = authManager.isAuthError(error)
      
      if (isAuth && retryable && attempt <= maxRetries) {
        logger.authWarn('Auth operation failed, retrying', { 
          attempt,
          maxRetries,
          error: error.message 
        })
        
        // Try to refresh session before retry
        await authManager.refreshSession()
        continue
      }
      
      throw error
    }
  }
  
  throw new Error('Operation failed after all retries')
}