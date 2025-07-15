// supabase/functions/match_offers/index.ts
import { serve } from "std/http/server.ts"
import { createClient } from '@supabase/supabase-js'

interface CorsHeaders {
  'Access-Control-Allow-Origin': string
  'Access-Control-Allow-Headers': string
  'Access-Control-Allow-Methods': string
  'Access-Control-Allow-Credentials': string
}

const getCorsHeaders = (origin: string | null): CorsHeaders => {
  const allowedOrigins = [
    'https://unbias-factory.vercel.app',
    'https://unbias-factory-git-dev-unbias-factory.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ]
  
  const isAllowedOrigin = origin && allowedOrigins.includes(origin)
  
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
}

interface RequestBody {
  borrower_id: string
}

// Input validation utilities
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

function sanitizeBorrowerId(input: string): string {
  // Remove any potential SQL injection attempts
  return input.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 36)
}

interface OfferResponse {
  borrower_id: string
  offers: any[]
  count: number
  generated_at: string
  user_id: string
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10
const RATE_LIMIT_HEADER = 'X-Rate-Limit'
const RATE_LIMIT_REMAINING_HEADER = 'X-Rate-Limit-Remaining'
const RATE_LIMIT_RESET_HEADER = 'X-Rate-Limit-Reset'

// Simple in-memory rate limiting store (for edge functions)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Rate limiting function
 * Returns true if request should be allowed, false if rate limited
 */
function checkRateLimit(identifier: string): { allowed: boolean; resetTime: number; remaining: number } {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW
  
  let entry = rateLimitStore.get(identifier)
  
  // If no entry or window expired, create new entry
  if (!entry || entry.resetTime <= now) {
    entry = { count: 0, resetTime: now + RATE_LIMIT_WINDOW }
    rateLimitStore.set(identifier, entry)
  }
  
  const allowed = entry.count < MAX_REQUESTS_PER_WINDOW
  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - entry.count)
  
  if (allowed) {
    entry.count++
  }
  
  return {
    allowed,
    resetTime: entry.resetTime,
    remaining
  }
}

// EMI calculation function
function calculateEMI(principal: number, annualRate: number, tenureYears: number = 20): number {
  const monthlyRate = annualRate / 100 / 12;
  const tenureMonths = tenureYears * 12;
  
  if (monthlyRate === 0) return principal / tenureMonths;
  
  const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) / 
              (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  
  return Math.round(emi);
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Rate limiting - use IP address as identifier
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown'
    
    const rateLimitResult = checkRateLimit(clientIP)
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: 'Too many requests. Please try again later.' 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            [RATE_LIMIT_HEADER]: `${MAX_REQUESTS_PER_WINDOW}`,
            [RATE_LIMIT_REMAINING_HEADER]: '0',
            [RATE_LIMIT_RESET_HEADER]: new Date(rateLimitResult.resetTime).toISOString()
          } 
        }
      )
    }

    // Get authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            [RATE_LIMIT_HEADER]: `${MAX_REQUESTS_PER_WINDOW}`,
            [RATE_LIMIT_REMAINING_HEADER]: `${rateLimitResult.remaining - 1}`,
            [RATE_LIMIT_RESET_HEADER]: new Date(rateLimitResult.resetTime).toISOString()
          } 
        }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the JWT token and get user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { borrower_id }: RequestBody = await req.json()

    // Input validation
    if (!borrower_id || typeof borrower_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Valid borrower_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate UUID format to prevent injection
    if (!isValidUUID(borrower_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid borrower_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize input
    const sanitizedBorrowerId = sanitizeBorrowerId(borrower_id)

    // CRITICAL SECURITY CHECK: Verify borrower belongs to authenticated user
    const { data: borrowerCheck, error: borrowerError } = await supabase
      .from('borrowers')
      .select('id, user_id')
      .eq('id', sanitizedBorrowerId)
      .eq('user_id', user.id) // Correct: Check user_id column instead of id column
      .single()

    if (borrowerError || !borrowerCheck) {
      console.error('Unauthorized access attempt:', { 
        user_id: user.id, 
        requested_borrower_id: borrower_id,
        error: borrowerError 
      })
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to borrower data' }),
        { 
          status: 403, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            [RATE_LIMIT_HEADER]: `${MAX_REQUESTS_PER_WINDOW}`,
            [RATE_LIMIT_REMAINING_HEADER]: `${rateLimitResult.remaining - 1}`,
            [RATE_LIMIT_RESET_HEADER]: new Date(rateLimitResult.resetTime).toISOString()
          } 
        }
      )
    }

    // Get borrower info for EMI calculation
    const { data: borrower } = await supabase
      .from('borrowers')
      .select('loan_amount_required')
      .eq('id', sanitizedBorrowerId)
      .eq('user_id', user.id) // Additional security check
      .single()

    if (!borrower) {
      return new Response(
        JSON.stringify({ error: 'Borrower data not found or unauthorized access' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call our SQL function with the validated and sanitized borrower_id
    const { data: offers, error } = await supabase
      .rpc('match_products', { input_borrower_id: sanitizedBorrowerId })

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch offers', details: error.message }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            [RATE_LIMIT_HEADER]: `${MAX_REQUESTS_PER_WINDOW}`,
            [RATE_LIMIT_REMAINING_HEADER]: `${rateLimitResult.remaining - 1}`,
            [RATE_LIMIT_RESET_HEADER]: new Date(rateLimitResult.resetTime).toISOString()
          } 
        }
      )
    }

    // Enhance offers with EMI calculation
    const enhancedOffers = offers?.map((offer: Record<string, unknown>) => {
      const loanAmount = borrower?.loan_amount_required || 0;
      const emi = calculateEMI(loanAmount, offer.interest_rate_min as number);
      
      return {
        ...offer,
        loan_amount: loanAmount,
        estimated_emi: emi,
        tenure_years: 20 // default tenure
      };
    }) || [];

    const response: OfferResponse = {
      borrower_id: sanitizedBorrowerId,
      offers: enhancedOffers,
      count: enhancedOffers.length,
      generated_at: new Date().toISOString(),
      user_id: user.id // Include for debugging/logging
    }

    console.log(`✅ Successfully generated ${enhancedOffers.length} offers for user ${user.id}`)

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          [RATE_LIMIT_HEADER]: `${MAX_REQUESTS_PER_WINDOW}`,
          [RATE_LIMIT_REMAINING_HEADER]: `${rateLimitResult.remaining - 1}`,
          [RATE_LIMIT_RESET_HEADER]: new Date(rateLimitResult.resetTime).toISOString()
        } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          [RATE_LIMIT_HEADER]: `${MAX_REQUESTS_PER_WINDOW}`,
          [RATE_LIMIT_REMAINING_HEADER]: '0',
          [RATE_LIMIT_RESET_HEADER]: new Date(rateLimitResult.resetTime).toISOString()
        } 
      }
    )
  }
})