import { createClient } from '@supabase/supabase-js'

// Provide fallback values during build time to prevent build failures
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Runtime check for missing environment variables
if (typeof window !== 'undefined') {
  if (supabaseUrl === 'https://placeholder.supabase.co') {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not configured. Please add it to your environment variables.')
  }
  if (supabaseAnonKey === 'placeholder-key') {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured. Please add it to your environment variables.')
  }
  
  // Log current config (safe for debugging)
  console.log('🔧 Supabase Config:', {
    url: supabaseUrl,
    hasValidKey: supabaseAnonKey !== 'placeholder-key' && supabaseAnonKey.length > 20
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
