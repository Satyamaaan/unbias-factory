import { supabase } from './supabase'

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
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Session retrieval error:', error)
        return null
      }

      if (!session) {
        console.log('No active session found')
        return null
      }

      // Check if token is expired or will expire soon (within 5 minutes)
      const expiresAt = session.expires_at || 0
      const now = Math.floor(Date.now() / 1000)
      const fiveMinutes = 5 * 60

      if (expiresAt - now < fiveMinutes) {
        console.log('Token expires soon, refreshing...')
        return await this.refreshSession()
      }

      return {
        user: session.user,
        access_token: session.access_token,
        refresh_token: session.refresh_token || '',
        expires_at: expiresAt
      }
    } catch (error) {
      console.error('Error getting session:', error)
      return null
    }
  }

  /**
   * Refresh session with retry logic
   */
  async refreshSession(): Promise<AuthSession | null> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
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
        console.log(`Token refresh attempt ${attempt}/${this.maxRetries}`)
        
        const { data: { session }, error } = await supabase.auth.refreshSession()
        
        if (error) {
          console.error(`Refresh attempt ${attempt} failed:`, error)
          
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

        console.log('✅ Token refreshed successfully')
        return {
          user: session.user,
          access_token: session.access_token,
          refresh_token: session.refresh_token || '',
          expires_at: session.expires_at || 0
        }
      } catch (error) {
        console.error(`Refresh attempt ${attempt} error:`, error)
        
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
      const session = await this.getValidSession()
      
      if (!session) {
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
        return {
          valid: false,
          error: {
            type: 'TOKEN_INVALID',
            message: 'Session user does not match required user ID.',
            retryable: false
          }
        }
      }

      return { valid: true, session }
    } catch (error: any) {
      console.error('Session validation error:', error)
      
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
      await supabase.auth.signOut()
      console.log('✅ Signed out successfully')
    } catch (error) {
      console.error('Sign out error:', error)
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
    
    return { isAuth, retryable }
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
    throw new Error(error?.message || 'Authentication required')
  }
  
  return session
}

export async function makeAuthenticatedRequest<T>(
  requestFn: (session: AuthSession) => Promise<T>,
  requiredUserId?: string
): Promise<T> {
  const session = await requireAuth(requiredUserId)
  return await requestFn(session)
}