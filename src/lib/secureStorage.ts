/**
 * Secure storage utility for sensitive data
 * Uses a combination of encryption and secure storage practices
 */

const STORAGE_KEY = 'borrower_draft_secure'
const ENCRYPTION_KEY = 'secure-storage-key' // In production, use environment variables

/**
 * Enhanced encryption/decryption utility using Web Crypto API
 * Provides better security than simple XOR encryption
 */
class SecureEncryption {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  
  // In production, this should be derived from user authentication or environment
  private static async getKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const keyMaterial = encoder.encode(ENCRYPTION_KEY)
    
    return await crypto.subtle.importKey(
      'raw',
      keyMaterial,
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
  static encrypt(data: any): string {
    try {
      const jsonString = JSON.stringify(data)
      // Basic obfuscation - not actual encryption
      const encoded = btoa(jsonString)
      return encoded
    } catch (error) {
      console.error('Fallback encryption error:', error)
      return ''
    }
  }
  
  static decrypt(encryptedData: string): any {
    try {
      if (!encryptedData) return null
      const decoded = atob(encryptedData)
      return JSON.parse(decoded)
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
  setDraft: (data: any) => SecureStorage.set(STORAGE_KEY, data),
  getDraft: () => SecureStorage.get(STORAGE_KEY),
  removeDraft: () => SecureStorage.remove(STORAGE_KEY),
  clear: () => SecureStorage.clear()
}