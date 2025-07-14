'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AuthErrorBoundary } from "@/components/AuthErrorBoundary"
import { OfferDetailsModal } from "@/components/OfferDetailsModal"
import { supabase } from "@/lib/supabase"
import { useBorrower } from "@/contexts/BorrowerContext"
import { useAuth } from "@/hooks/useAuth"
import { makeAuthenticatedRequest } from "@/lib/auth"
import { Offer } from "@/types/offer"

function OffersPageContent() {
  const router = useRouter()
  const { draft } = useBorrower()
  const { session, loading: authLoading, error: authError, isAuthenticated, refreshSession, signOut } = useAuth(draft.borrower_id)
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
  const maxRetries = 3

  // Debug logging for development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Offers page debug:', {
        draft: {
          verified: draft.verified,
          borrower_id: draft.borrower_id,
          user_id: draft.user_id,
          mobile: draft.mobile
        },
        auth: {
          loading: authLoading,
          authenticated: isAuthenticated,
          hasSession: !!session,
          error: authError?.message
        }
      })
    }
  }, [draft, authLoading, isAuthenticated, session, authError])

  const fetchOffers = useCallback(async () => {
    if (!draft.borrower_id) return

    try {
      setLoading(true)
      setError('')

      // Development mode: simulate offers without auth
      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 Development mode: Simulating offers fetch')
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        const mockOffers = [
          {
            product_id: 'dev-offer-1',
            lender_name: 'Dev Bank A',
            product_name: 'Dev Home Loan Premium',
            interest_rate_min: 8.5,
            processing_fee_value: 0.5,
            processing_fee_type: 'Percentage',
            max_ltv_ratio_tier1: 80,
            loan_amount: 5000000,
            estimated_emi: 41000
          },
          {
            product_id: 'dev-offer-2',
            lender_name: 'Dev Bank B',
            product_name: 'Dev Home Loan Basic',
            interest_rate_min: 9.2,
            processing_fee_value: 25000,
            processing_fee_type: 'Fixed',
            max_ltv_ratio_tier1: 75,
            loan_amount: 4500000,
            estimated_emi: 38500
          }
        ]
        
        setOffers(mockOffers)
        console.log(`✅ Development mode: Loaded ${mockOffers.length} mock offers`)
        return
      }

      // Production mode: use authenticated request
      if (!session) {
        throw new Error('No valid session available')
      }

      const data = await makeAuthenticatedRequest(
        async (authSession) => {
          const { data, error } = await supabase.functions.invoke('match_offers', {
            body: { borrower_id: draft.borrower_id },
            headers: {
              Authorization: `Bearer ${authSession.access_token}`
            }
          })

          if (error) {
            throw error
          }

          return data
        },
        draft.borrower_id
      )

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from server')
      }

      const validatedOffers = (data.offers || []).filter((offer: Offer) => {
        return (
          offer &&
          typeof offer.product_id === 'string' &&
          typeof offer.lender_name === 'string' &&
          typeof offer.product_name === 'string' &&
          typeof offer.interest_rate_min === 'number' &&
          typeof offer.loan_amount === 'number'
        )
      })

      setOffers(validatedOffers)
      console.log(`✅ Loaded ${validatedOffers.length} validated offers`)

    } catch (error: any) {
      console.error('Error fetching offers:', error)
      
      // Handle specific error types with retry logic
      if (error.message?.includes('Unauthorized') || error.message?.includes('Invalid or expired token')) {
        if (retryCount < maxRetries) {
          console.log(`Token error, attempting refresh (${retryCount + 1}/${maxRetries})`)
          setRetryCount(prev => prev + 1)
          try {
            await refreshSession()
            // fetchOffers will be called again via useEffect when session updates
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError)
            setError('Session expired. Please log in again.')
            setTimeout(() => router.push('/onboarding'), 2000)
          }
        } else {
          setError('Session expired. Please log in again.')
          setTimeout(() => router.push('/onboarding'), 2000)
        }
      } else if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized access')) {
        setError('Access denied. Please verify your account.')
        setTimeout(() => router.push('/onboarding'), 2000)
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        setError('Network error. Please check your connection and try again.')
      } else {
        setError(error.message || 'Failed to load offers. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [draft.borrower_id, retryCount, maxRetries, router, refreshSession, session])

  useEffect(() => {
    // Only proceed if auth is loaded and we have required data
    if (authLoading) return

    // Check if user completed onboarding
    if (!draft.verified || !draft.borrower_id) {
      router.push('/onboarding')
      return
    }

    // Development mode: bypass auth check if we have draft data
    if (process.env.NODE_ENV === 'development' && draft.verified && draft.borrower_id) {
      console.log('🚀 Development mode: Bypassing auth check, proceeding to fetch offers')
      fetchOffers()
      return
    }

    // Check authentication
    if (!isAuthenticated) {
      if (authError?.retryable && retryCount < maxRetries) {
        console.log(`Auth error is retryable, attempt ${retryCount + 1}/${maxRetries}`)
        setRetryCount(prev => prev + 1)
        setTimeout(() => refreshSession(), 1000 * retryCount) // Exponential backoff
      } else {
        router.push('/onboarding')
      }
      return
    }

    // Reset retry count on successful auth
    setRetryCount(0)
    fetchOffers()
  }, [authLoading, isAuthenticated, authError, draft.verified, draft.borrower_id, router, refreshSession, retryCount, fetchOffers])

  const handleRetry = async () => {
    setRetryCount(0)
    await fetchOffers()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatLoanAmount = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`
    return formatCurrency(amount)
  }

  const calculateProcessingFee = (offer: Offer) => {
    if (offer.processing_fee_type === 'Percentage') {
      return (offer.processing_fee_value / 100) * offer.loan_amount
    }
    return offer.processing_fee_value || 0
  }

  // Show loading state during auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your session...</p>
        </div>
      </div>
    )
  }

  // Show auth error with retry options
  if (authError && !authError.retryable) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-red-600 mb-4">{authError.message}</p>
            <div className="space-y-2">
              <Button onClick={() => router.push('/onboarding')} className="w-full">
                Sign In Again
              </Button>
              <Button onClick={signOut} variant="outline" className="w-full">
                Clear Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Finding the best loan offers for you...</p>
          <p className="text-sm text-gray-500 mt-2">
            {retryCount > 0 && `Retry attempt ${retryCount}/${maxRetries}`}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Unable to Load Offers</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={handleRetry} className="w-full">
                Try Again
              </Button>
              <Button onClick={refreshSession} variant="outline" className="w-full">
                Refresh Session
              </Button>
              <Button 
                onClick={() => router.push('/onboarding')} 
                variant="ghost" 
                className="w-full"
              >
                Back to Application
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your Personalized Loan Offers
          </h1>
          <p className="text-gray-600">
            We found {offers.length} loan offers that match your profile
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-600">Verified Account</span>
          </div>
        </div>

        {/* Application Summary - Moved to top */}
        <Card className="mb-8 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg">Your Application Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Property Type</p>
                <p className="font-medium">{draft.property_type}</p>
              </div>
              <div>
                <p className="text-gray-600">Location</p>
                <p className="font-medium">{draft.city}</p>
              </div>
              <div>
                <p className="text-gray-600">Property Value</p>
                <p className="font-medium">₹{draft.property_value_est?.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-gray-600">Loan Required</p>
                <p className="font-medium">₹{draft.loan_amount_required?.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-gray-600">Employment</p>
                <p className="font-medium">{draft.employment_type?.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-gray-600">Mobile</p>
                <p className="font-medium">{draft.country_code || '+91'} {draft.mobile}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {offers.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">No Offers Available</h3>
                <p className="text-gray-600 mb-4">
                  Unfortunately, we couldn&apos;t find any loan offers that match your current profile.
                  This could be due to eligibility criteria or temporary unavailability.
                </p>
                <Button onClick={() => router.push('/onboarding')} variant="outline">
                  Update Application
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 grid-cols-1 max-w-2xl mx-auto">
            {offers.map((offer, index) => (
              <Card 
                key={offer.product_id} 
                className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedOffer(offer)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <CardTitle className="text-lg text-green-800">
                        {offer.lender_name}
                      </CardTitle>
                      <p className="text-green-700 font-medium text-sm">
                        {offer.product_name}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      #{index + 1}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-800">
                      {offer.interest_rate_min}%
                    </div>
                    <div className="text-sm text-gray-600">per annum</div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="grid grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-600 text-xs">Loan Amount</p>
                      <p className="font-semibold">{formatLoanAmount(offer.loan_amount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs">EMI (20 years)</p>
                      <p className="font-semibold">{formatCurrency(offer.estimated_emi)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs">Processing Fee</p>
                      <p className="font-semibold">{formatCurrency(calculateProcessingFee(offer))}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs">Max LTV</p>
                      <p className="font-semibold">{offer.max_ltv_ratio_tier1}%</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/apply/${offer.product_id}`)
                      }}
                    >
                      Apply Now
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedOffer(offer)
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Single Modal for Offer Details */}
      {selectedOffer && (
        <OfferDetailsModal 
          offer={selectedOffer} 
          onClose={() => setSelectedOffer(null)}
        />
      )}
    </div>
  )
}

export default function OffersPage() {
  return (
    <AuthErrorBoundary>
      <OffersPageContent />
    </AuthErrorBoundary>
  )
}