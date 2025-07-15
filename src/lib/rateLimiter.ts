/**
 * Client-side rate limiting utility
 * Prevents excessive API calls from the frontend
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

class ClientRateLimiter {
  private storageKey = 'unbias_rate_limits'
  private limits = new Map<string, RateLimitEntry>()

  constructor() {
    // Load limits from localStorage on initialization
    this.loadFromStorage()
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return
    
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        this.limits = new Map(Object.entries(data))
      }
    } catch (error) {
      console.error('Failed to load rate limits:', error)
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return
    
    try {
      const data = Object.fromEntries(this.limits)
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save rate limits:', error)
    }
  }

  private cleanupExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.limits.entries()) {
      if (entry.resetTime <= now) {
        this.limits.delete(key)
      }
    }
    this.saveToStorage()
  }

  /**
   * Check if request is allowed for given identifier
   */
  checkLimit(
    identifier: string, 
    maxRequests: number, 
    windowMs: number
  ): {
    allowed: boolean
    remaining: number
    resetTime: number
  } {
    this.cleanupExpired()
    
    const now = Date.now()
    const key = identifier
    
    let entry = this.limits.get(key)
    
    // Create new entry if doesn't exist or window expired
    if (!entry || entry.resetTime <= now) {
      entry = { count: 0, resetTime: now + windowMs }
      this.limits.set(key, entry)
    }
    
    const allowed = entry.count < maxRequests
    const remaining = Math.max(0, maxRequests - entry.count)
    
    if (allowed) {
      entry.count++
      this.saveToStorage()
    }
    
    return {
      allowed,
      remaining,
      resetTime: entry.resetTime
    }
  }

  /**
   * Reset limit for specific identifier
   */
  resetLimit(identifier: string): void {
    this.limits.delete(identifier)
    this.saveToStorage()
  }

  /**
   * Clear all limits
   */
  clearAll(): void {
    this.limits.clear()
    this.saveToStorage()
  }
}

export const clientRateLimiter = new ClientRateLimiter()

/**
 * OTP specific rate limiting configuration
 */
export const otpRateLimits = {
  verify: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    identifier: 'otp_verify'
  },
  resend: {
    maxRequests: 3,
    windowMs: 5 * 60 * 1000, // 5 minutes
    identifier: 'otp_resend'
  }
}

/**
 * API call rate limiting configuration
 */
export const apiRateLimits = {
  offers: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    identifier: 'fetch_offers'
  },
  formSubmission: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    identifier: 'form_submit'
  }
}