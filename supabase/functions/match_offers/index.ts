// supabase/functions/match_offers/index.ts
import { serve } from "std/http/server.ts"
import { createClient } from '@supabase/supabase-js'

interface CorsHeaders {
  'Access-Control-Allow-Origin': string
  'Access-Control-Allow-Headers': string
  'Access-Control-Allow-Methods': string
}

const corsHeaders: CorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

interface RequestBody {
  borrower_id: string
}

interface OfferResponse {
  borrower_id: string
  offers: any[]
  count: number
  generated_at: string
  user_id: string
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    if (!borrower_id) {
      return new Response(
        JSON.stringify({ error: 'borrower_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CRITICAL SECURITY CHECK: Verify borrower belongs to authenticated user
    const { data: borrowerCheck, error: borrowerError } = await supabase
      .from('borrowers')
      .select('id')
      .eq('id', borrower_id)
      .eq('id', user.id) // This ensures the borrower_id matches the authenticated user's ID
      .single()

    if (borrowerError || !borrowerCheck) {
      console.error('Unauthorized access attempt:', { 
        user_id: user.id, 
        requested_borrower_id: borrower_id,
        error: borrowerError 
      })
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to borrower data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get borrower info for EMI calculation
    const { data: borrower } = await supabase
      .from('borrowers')
      .select('loan_amount_required')
      .eq('id', borrower_id)
      .single()

    // Call our SQL function with the validated borrower_id
    const { data: offers, error } = await supabase
      .rpc('match_products', { input_borrower_id: borrower_id })

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch offers', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      borrower_id,
      offers: enhancedOffers,
      count: enhancedOffers.length,
      generated_at: new Date().toISOString(),
      user_id: user.id // Include for debugging/logging
    }

    console.log(`✅ Successfully generated ${enhancedOffers.length} offers for user ${user.id}`)

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})