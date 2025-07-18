'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AuthErrorBoundary } from "@/components/AuthErrorBoundary"
import { OfferDetailsModal } from "@/components/OfferDetailsModal"
import { VerificationPopup } from "@/components/VerificationPopup"
import { useBorrower } from "@/contexts/BorrowerContext"
import { Offer } from "@/types/offer"

function OffersPageContent() {
  const router = useRouter()
  const { draft } = useBorrower()
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
  const [showVerification, setShowVerification] = useState(false)

  useEffect(() => {
    const is4StepEnabled = process.env.NEXT_PUBLIC_ENABLE_4_STEP_FLOW === 'true'
    const requiredStep = is4StepEnabled ? 4 : 5
    
    console.log('🚨 OFFERS PAGE LOADED:', {
      currentStep: draft.current_step,
      isVerified: draft.is_verified,
      is4StepEnabled,
      requiredStep
    })

    if ((draft.current_step || 1) < requiredStep) {
      console.log('⏪ Redirecting - step', draft.current_step, '<', requiredStep)
      router.push('/onboarding')
      return
    }

    // Load offers based on environment
    const mockOffers: Offer[] = [
      {
        product_id: 'dev_1',
        lender_name: 'HDFC Bank',
        product_name: 'Home Loan Prime',
        interest_rate_min: 8.5,
        interest_rate_max: 9.2,
        loan_amount: 5000000,
        loan_tenure: 20,
        processing_fee_value: 10000,
        processing_fee_type: 'Fixed',
        max_ltv_ratio_tier1: 80,
        max_ltv_ratio_tier2: 90,
        estimated_emi: 43250,
        eligibility_status: 'eligible',
        lender_logo: '/logo.png',
        product_description: 'Best home loan for salaried professionals'
      },
      {
        product_id: 'dev_2',
        lender_name: 'ICICI Bank',
        product_name: 'Home Loan Plus',
        interest_rate_min: 8.7,
        interest_rate_max: 9.5,
        loan_amount: 5000000,
        loan_tenure: 20,
        processing_fee_value: 10000,
        processing_fee_type: 'Fixed',
        max_ltv_ratio_tier1: 75,
        max_ltv_ratio_tier2: 85,
        estimated_emi: 44150,
        eligibility_status: 'eligible',
        lender_logo: '/logo.png',
        product_description: 'Flexible home loan with great features'
      }
    ]

    setOffers(mockOffers)
    
    // Show verification popup if not verified
    if (!draft.is_verified) {
      setShowVerification(true)
    }
  }, [draft.current_step, draft.is_verified, router])

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

  // Feature flag based step validation
  const is4StepEnabled = process.env.NEXT_PUBLIC_ENABLE_4_STEP_FLOW === 'true'
  const requiredStep = is4StepEnabled ? 4 : 5
  
  if ((draft.current_step || 1) < requiredStep) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading offers...</p>
        </div>
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
        </div>

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
                <div className="grid grid-cols-4 gap-4 text-sm mb-4">                  <div>
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
      </div>

      {selectedOffer && (
        <OfferDetailsModal 
          offer={selectedOffer} 
          onClose={() => setSelectedOffer(null)}
        />
      )}

      <VerificationPopup
        isOpen={showVerification}
        onClose={() => setShowVerification(false)}
        onVerified={() => {
          // In development, just close the popup
          setShowVerification(false)
        }}
        offerCount={offers.length}
      />
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