'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useBorrower } from "@/contexts/BorrowerContext"

interface Offer {
  product_id: string
  lender_name: string
  product_name: string
  interest_rate_min: number
  processing_fee_value: number
  processing_fee_type: string
  max_ltv_ratio_tier1: number
  loan_amount: number
  estimated_emi: number
}

export default function OffersPage() {
  const router = useRouter()
  const { draft } = useBorrower()
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Check if user is verified
    if (!draft.verified || !draft.borrower_id) {
      router.push('/onboarding')
      return
    }

    fetchOffers()
  }, [draft.verified, draft.borrower_id, router])

  const fetchOffers = async () => {
    if (!draft.borrower_id) return

    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('match_offers', {
        body: { borrower_id: draft.borrower_id }
      })

      if (error) throw error

      setOffers(data.offers || [])
    } catch (error: any) {
      console.error('Error fetching offers:', error)
      setError('Failed to load offers. Please try again.')
    } finally {
      setLoading(false)
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Finding the best loan offers for you...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchOffers}>Try Again</Button>
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
            Your Loan Offers
          </h1>
          <p className="text-gray-600">
            We found {offers.length} loan offers that match your profile
          </p>
        </div>

        {offers.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">No Offers Available</h3>
                <p className="text-gray-600 mb-4">
                  Unfortunately, we couldn't find any loan offers that match your current profile.
                  This could be due to eligibility criteria or temporary unavailability.
                </p>
                <Button onClick={() => router.push('/onboarding')} variant="outline">
                  Update Application
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer, index) => (
              <Card key={offer.product_id} className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
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
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Loan Amount</p>
                      <p className="font-semibold">{formatLoanAmount(offer.loan_amount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">EMI (20 years)</p>
                      <p className="font-semibold">{formatCurrency(offer.estimated_emi)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Processing Fee</p>
                      <p className="font-semibold">{formatCurrency(calculateProcessingFee(offer))}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Max LTV</p>
                      <p className="font-semibold">{offer.max_ltv_ratio_tier1}%</p>
                    </div>
                  </div>
                  
                  <Button className="w-full mt-4 bg-green-600 hover:bg-green-700">
                    Apply Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Application Summary */}
        <Card className="mt-8 max-w-2xl mx-auto">
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
                <p className="font-medium">+91 {draft.mobile}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}