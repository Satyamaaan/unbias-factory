'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { supabase } from "@/lib/supabase"
import { useBorrower } from "@/contexts/BorrowerContext"
import { useAuth } from "@/hooks/useAuth"
import { makeAuthenticatedRequest } from "@/lib/auth"

interface ApplicationStep {
  id: string
  title: string
  description: string
  completed: boolean
  required: boolean
}

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

interface RequiredDocument {
  id: string
  name: string
  description: string
  required: boolean
  uploaded: boolean
  file?: File
}

export default function ApplyPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.productId as string
  const { draft } = useBorrower()
  const { session, loading: authLoading, isAuthenticated } = useAuth(draft.borrower_id)
  
  const [offer, setOffer] = useState<Offer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [applicationStatus, setApplicationStatus] = useState<'draft' | 'submitted' | 'processing' | 'approved' | 'rejected'>('draft')
  const [documents, setDocuments] = useState<RequiredDocument[]>([])

  const applicationSteps: ApplicationStep[] = [
    {
      id: 'review',
      title: 'Review Application',
      description: 'Review your loan application details',
      completed: false,
      required: true
    },
    {
      id: 'documents',
      title: 'Upload Documents',
      description: 'Upload required documents for verification',
      completed: false,
      required: true
    },
    {
      id: 'consent',
      title: 'Final Consent',
      description: 'Provide final consent and submit application',
      completed: false,
      required: true
    },
    {
      id: 'confirmation',
      title: 'Confirmation',
      description: 'Application submitted successfully',
      completed: false,
      required: true
    }
  ]

  useEffect(() => {
    if (authLoading) return
    
    if (!isAuthenticated || !draft.verified || !draft.borrower_id) {
      router.push('/onboarding')
      return
    }

    fetchOfferDetails()
    initializeDocuments()
  }, [authLoading, isAuthenticated, draft.verified, draft.borrower_id, productId])

  const fetchOfferDetails = async () => {
    try {
      setLoading(true)
      
      const data = await makeAuthenticatedRequest(
        async (authSession) => {
          const { data, error } = await supabase.functions.invoke('match_offers', {
            body: { borrower_id: draft.borrower_id },
            headers: {
              Authorization: `Bearer ${authSession.access_token}`
            }
          })

          if (error) throw error
          return data
        },
        draft.borrower_id
      )

      const selectedOffer = data.offers?.find((o: Offer) => o.product_id === productId)
      if (!selectedOffer) {
        setError('Offer not found or no longer available')
        return
      }

      setOffer(selectedOffer)
    } catch (error: any) {
      console.error('Error fetching offer details:', error)
      setError(error.message || 'Failed to load offer details')
    } finally {
      setLoading(false)
    }
  }

  const initializeDocuments = () => {
    const requiredDocs: RequiredDocument[] = [
      {
        id: 'identity',
        name: 'Identity Proof',
        description: 'Aadhaar Card, PAN Card, or Passport',
        required: true,
        uploaded: false
      },
      {
        id: 'address',
        name: 'Address Proof',
        description: 'Utility bill, Bank statement, or Rental agreement',
        required: true,
        uploaded: false
      },
      {
        id: 'income',
        name: 'Income Proof',
        description: draft.employment_type === 'salaried' ? 'Salary slips (last 3 months)' : 'ITR (last 2 years)',
        required: true,
        uploaded: false
      },
      {
        id: 'bank',
        name: 'Bank Statements',
        description: 'Bank statements for last 6 months',
        required: true,
        uploaded: false
      },
      {
        id: 'property',
        name: 'Property Documents',
        description: 'Sale deed, Property card, or Allotment letter',
        required: true,
        uploaded: false
      }
    ]

    setDocuments(requiredDocs)
  }

  const handleFileUpload = (documentId: string, file: File) => {
    setDocuments((prev: RequiredDocument[]) => prev.map((doc: RequiredDocument) => 
      doc.id === documentId 
        ? { ...doc, uploaded: true, file }
        : doc
    ))
  }

  const handleStepNext = () => {
    if (currentStep < applicationSteps.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleStepBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmitApplication = async () => {
    try {
      setLoading(true)
      
      // Create application record
      const applicationData = {
        borrower_id: draft.borrower_id,
        product_id: productId,
        lender_name: offer?.lender_name,
        product_name: offer?.product_name,
        loan_amount: offer?.loan_amount,
        interest_rate: offer?.interest_rate_min,
        estimated_emi: offer?.estimated_emi,
        status: 'submitted',
        application_date: new Date().toISOString(),
        documents_uploaded: documents.filter(d => d.uploaded).length,
        total_documents_required: documents.filter(d => d.required).length
      }

      console.log('Submitting application:', applicationData)
      
      // Here you would typically save to database
      // For now, we'll simulate a successful submission
      
      setApplicationStatus('submitted')
      setCurrentStep(3) // Move to confirmation step
      
    } catch (error: any) {
      console.error('Error submitting application:', error)
      setError(error.message || 'Failed to submit application')
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

  const calculateProcessingFee = (offer: Offer) => {
    if (offer.processing_fee_type === 'Percentage') {
      return (offer.processing_fee_value / 100) * offer.loan_amount
    }
    return offer.processing_fee_value || 0
  }

  const progress = ((currentStep + 1) / applicationSteps.length) * 100

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
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
            <h3 className="text-lg font-semibold mb-2">Error</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/offers')} className="w-full">
              Back to Offers
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Offer Not Found</h3>
            <p className="text-gray-600 mb-4">This offer is no longer available or has expired.</p>
            <Button onClick={() => router.push('/offers')} className="w-full">
              View All Offers
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Apply for Loan</h1>
          <p className="text-gray-600">{offer.lender_name} - {offer.product_name}</p>
        </div>

        {/* Progress Bar */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Application Progress</h3>
              <span className="text-sm text-gray-600">{currentStep + 1} of {applicationSteps.length}</span>
            </div>
            <Progress value={progress} className="mb-4" />
            <div className="flex justify-between text-sm">
              {applicationSteps.map((step, index) => (
                <div key={step.id} className={`flex flex-col items-center ${index <= currentStep ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                    {index + 1}
                  </div>
                  <span className="text-xs text-center">{step.title}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Review Application */}
            {currentStep === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Your Application</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Loan Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Loan Amount:</span>
                            <span className="font-medium">{formatCurrency(offer.loan_amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Interest Rate:</span>
                            <span className="font-medium">{offer.interest_rate_min}% p.a.</span>
                          </div>
                          <div className="flex justify-between">
                            <span>EMI (20 years):</span>
                            <span className="font-medium">{formatCurrency(offer.estimated_emi)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Processing Fee:</span>
                            <span className="font-medium">{formatCurrency(calculateProcessingFee(offer))}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Personal Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Property Type:</span>
                            <span className="font-medium">{draft.property_type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>City:</span>
                            <span className="font-medium">{draft.city}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Employment:</span>
                            <span className="font-medium">{draft.employment_type?.replace('_', ' ')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Mobile:</span>
                            <span className="font-medium">{draft.mobile}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Important Notes</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Interest rate is subject to bank's approval and credit assessment</li>
                        <li>• Processing fee is non-refundable</li>
                        <li>• Loan approval depends on document verification</li>
                        <li>• EMI calculation is approximate and may vary</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Documents */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Upload Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {documents.map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold">{doc.name}</h4>
                            <p className="text-sm text-gray-600">{doc.description}</p>
                          </div>
                          {doc.required && (
                            <Badge variant="outline" className="text-red-600">Required</Badge>
                          )}
                        </div>
                        <div className="mt-3">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handleFileUpload(doc.id, file)
                              }
                            }}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          {doc.uploaded && (
                            <p className="text-sm text-green-600 mt-1">✓ Uploaded: {doc.file?.name}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Consent */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Final Consent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Terms and Conditions</h4>
                      <div className="text-sm space-y-2">
                        <label className="flex items-start space-x-2">
                          <input type="checkbox" className="mt-1" required />
                          <span>I agree to the terms and conditions of the loan application</span>
                        </label>
                        <label className="flex items-start space-x-2">
                          <input type="checkbox" className="mt-1" required />
                          <span>I consent to credit bureau checks and sharing of my information</span>
                        </label>
                        <label className="flex items-start space-x-2">
                          <input type="checkbox" className="mt-1" required />
                          <span>I understand that this is a loan application and not a guarantee of approval</span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-yellow-900 mb-2">Next Steps</h4>
                      <ul className="text-sm text-yellow-800 space-y-1">
                        <li>• Your application will be reviewed by {offer.lender_name}</li>
                        <li>• You'll receive updates via SMS and email</li>
                        <li>• Document verification may take 2-3 business days</li>
                        <li>• Loan approval depends on bank's credit assessment</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Confirmation */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Application Submitted!</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">✅</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Your application has been submitted successfully!</h3>
                    <p className="text-gray-600 mb-4">
                      Application ID: <span className="font-mono font-semibold">APP-{Date.now().toString().slice(-6)}</span>
                    </p>
                    <div className="bg-green-50 p-4 rounded-lg mb-4">
                      <h4 className="font-semibold text-green-900 mb-2">What happens next?</h4>
                      <ul className="text-sm text-green-800 space-y-1 text-left">
                        <li>• {offer.lender_name} will review your application</li>
                        <li>• You'll receive a confirmation email shortly</li>
                        <li>• Bank representative may call you for verification</li>
                        <li>• Decision typically takes 3-5 business days</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handleStepBack}
                disabled={currentStep === 0 || currentStep === 3}
              >
                Previous
              </Button>
              
              {currentStep < 2 && (
                <Button onClick={handleStepNext}>
                  Next
                </Button>
              )}
              
              {currentStep === 2 && (
                <Button 
                  onClick={handleSubmitApplication}
                  disabled={loading || documents.filter(d => d.required && !d.uploaded).length > 0}
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </Button>
              )}
              
              {currentStep === 3 && (
                <Button onClick={() => router.push('/offers')}>
                  Back to Offers
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Loan Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Lender:</span>
                    <span className="font-medium">{offer.lender_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Product:</span>
                    <span className="font-medium text-sm">{offer.product_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Amount:</span>
                    <span className="font-medium">{formatCurrency(offer.loan_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Interest Rate:</span>
                    <span className="font-medium text-green-600">{offer.interest_rate_min}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">EMI:</span>
                    <span className="font-medium">{formatCurrency(offer.estimated_emi)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Processing Fee:</span>
                    <span className="font-medium">{formatCurrency(calculateProcessingFee(offer))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}