/**
 * Secure storage utility for sensitive data
 * Uses a combination of encryption and secure storage practices
 */

const STORAGE_KEY = 'borrower_draft_secure'
const ENCRYPTION_KEY = 'secure-storage-key-32-char-long-key-here!' // 32 bytes for AES-256

/**
 * Enhanced encryption/decryption utility using Web Crypto API
 * Provides better security than simple XOR encryption
 */
class SecureEncryption {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  
  // Generate a proper 256-bit key from the base key
  private static async getKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const keyMaterial = encoder.encode(ENCRYPTION_KEY)
    
    // Use SHA-256 to create a 256-bit key
    const keyHash = await crypto.subtle.digest('SHA-256', keyMaterial)
    
    return await crypto.subtle.importKey(
      'raw',
      keyHash,
      { name: this.ALGORITHM },
      false,
      ['encrypt', 'decrypt']
    )
  }
  
  static async encrypt(data: any): Promise<string> {
    try {
      const encoder = new TextEncoder()
      const jsonString = JSON.stringify(data)
      const dataBuffer = encoder.encode(jsonString)
      
      const key = await this.getKey()
      const iv = crypto.getRandomValues(new Uint8Array(12)) // Initialization vector
      
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv },
        key,
        dataBuffer
      )
      
      // Combine IV and encrypted data, then encode to base64
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encryptedBuffer), iv.length)
      
      return btoa(String.fromCharCode(...combined))
    } catch (error) {
      console.error('Encryption error:', error)
      return ''
    }
  }
  
  static async decrypt(encryptedData: string): Promise<any> {
    try {
      if (!encryptedData) return null
      
      const encryptedBuffer = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      )
      
      const key = await this.getKey()
      const iv = encryptedBuffer.slice(0, 12) // First 12 bytes are IV
      const data = encryptedBuffer.slice(12) // Remaining bytes are encrypted data
      
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv },
        key,
        data
      )
      
      const decoder = new TextDecoder()
      const jsonString = decoder.decode(decryptedBuffer)
      return JSON.parse(jsonString)
    } catch (error) {
      console.error('Decryption error:', error)
      return null
    }
  }
}

// Fallback encryption for environments without Web Crypto API
class FallbackEncryption {
  private static readonly KEY = ENCRYPTION_KEY.padEnd(32, '0')
  
  static encrypt(data: any): string {
    try {
      const jsonString = JSON.stringify(data)
      let result = ''
      for (let i = 0; i < jsonString.length; i++) {
        result += String.fromCharCode(
          jsonString.charCodeAt(i) ^ this.KEY.charCodeAt(i % this.KEY.length)
        )
      }
      return btoa(result)
    } catch (error) {
      console.error('Fallback encryption error:', error)
      return ''
    }
  }
  
  static decrypt(encryptedData: string): any {
    try {
      if (!encryptedData) return null
      const decoded = atob(encryptedData)
      let result = ''
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(
          decoded.charCodeAt(i) ^ this.KEY.charCodeAt(i % this.KEY.length)
        )
      }
      return JSON.parse(result)
    } catch (error) {
      console.error('Fallback decryption error:', error)
      return null
    }
  }
}

/**
 * Secure storage wrapper for sensitive data
 */
export class SecureStorage {
  private static isAvailable(): boolean {
    return typeof window !== 'undefined' && window.localStorage !== undefined
  }
  
  private static async isCryptoAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && 
           window.crypto !== undefined && 
           window.crypto.subtle !== undefined
  }
  
  static async set(key: string, data: any): Promise<void> {
    if (!this.isAvailable()) return
    
    try {
      let encrypted: string
      
      if (await this.isCryptoAvailable()) {
        encrypted = await SecureEncryption.encrypt(data)
      } else {
        // Fallback to base64 encoding if Web Crypto API not available
        encrypted = FallbackEncryption.encrypt(data)
      }
      
      if (encrypted) {
        localStorage.setItem(key, encrypted)
      }
    } catch (error) {
      console.error('Failed to store data securely:', error)
    }
  }
  
  static async get(key: string): Promise<any> {
    if (!this.isAvailable()) return null
    
    try {
      const encrypted = localStorage.getItem(key)
      if (!encrypted) return null
      
      let decrypted: any
      
      if (await this.isCryptoAvailable()) {
        decrypted = await SecureEncryption.decrypt(encrypted)
      } else {
        decrypted = FallbackEncryption.decrypt(encrypted)
      }
      
      return decrypted
    } catch (error) {
      console.error('Failed to retrieve data securely:', error)
      return null
    }
  }
  
  static remove(key: string): void {
    if (!this.isAvailable()) return
    
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to remove secure data:', error)
    }
  }
  
  static clear(): void {
    if (!this.isAvailable()) return
    
    try {
      // Only clear our specific keys
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear secure data:', error)
    }
  }
}

// Export with specific key for borrower draft
export const secureStorage = {
  setDraft: async (data: any): Promise<void> => {
    try {
      await SecureStorage.set(STORAGE_KEY, data)
    } catch (error) {
      console.error('Failed to save draft securely:', error)
      // Fallback to plain storage if encryption fails
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY + '_fallback', JSON.stringify(data))
      }
    }
  },
  
  getDraft: async (): Promise<any> => {
    try {
      const data = await SecureStorage.get(STORAGE_KEY)
      if (data) return data
      
      // Try fallback storage
      if (typeof window !== 'undefined' && window.localStorage) {
        const fallback = localStorage.getItem(STORAGE_KEY + '_fallback')
        if (fallback) return JSON.parse(fallback)
      }
      
      return null
    } catch (error) {
      console.error('Failed to load draft securely:', error)
      return null
    }
  },
  
  removeDraft: (): void => {
    try {
      SecureStorage.remove(STORAGE_KEY)
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY + '_fallback')
      }
    } catch (error) {
      console.error('Failed to remove draft:', error)
    }
  },
  
  clear: (): void => {
    try {
      SecureStorage.clear()
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY + '_fallback')
      }
    } catch (error) {
      console.error('Failed to clear secure data:', error)
    }
  }
}