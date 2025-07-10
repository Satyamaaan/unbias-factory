import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from 'next/navigation'
import { Offer } from '@/types/offer'

interface OfferDetailsModalProps {
  offer: Offer
  onClose: () => void
}

export function OfferDetailsModal({ offer, onClose }: OfferDetailsModalProps) {
  const router = useRouter()

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

  const calculateMonthlyPayment = (principal: number, rate: number, years: number) => {
    const monthlyRate = rate / 100 / 12
    const numPayments = years * 12
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                          (Math.pow(1 + monthlyRate, numPayments) - 1)
    return monthlyPayment
  }

  const tenureOptions = [10, 15, 20, 25, 30]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-green-800">
            {offer.lender_name} - {offer.product_name}
          </h2>
        </div>
        
        <div className="space-y-6">
          {/* Key Highlights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-green-700">Key Highlights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {offer.interest_rate_min}%
                  </div>
                  <div className="text-sm text-gray-600">Interest Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatLoanAmount(offer.loan_amount)}
                  </div>
                  <div className="text-sm text-gray-600">Loan Amount</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(offer.estimated_emi)}
                  </div>
                  <div className="text-sm text-gray-600">EMI (20 years)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {offer.max_ltv_ratio_tier1}%
                  </div>
                  <div className="text-sm text-gray-600">Max LTV</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Loan Details</TabsTrigger>
              <TabsTrigger value="calculator">EMI Calculator</TabsTrigger>
              <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Loan Terms & Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-green-700">Interest & Fees</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Interest Rate:</span>
                          <span className="font-medium">{offer.interest_rate_min}% p.a.</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Processing Fee:</span>
                          <span className="font-medium">
                            {offer.processing_fee_type === 'Percentage' 
                              ? `${offer.processing_fee_value}%` 
                              : formatCurrency(offer.processing_fee_value)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Processing Fee Amount:</span>
                          <span className="font-medium">{formatCurrency(calculateProcessingFee(offer))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Prepayment Charges:</span>
                          <span className="font-medium">Usually 2-3% + GST</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-semibold text-green-700">Loan Limits</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Minimum Loan:</span>
                          <span className="font-medium">
                            {offer.min_loan_amount ? formatLoanAmount(offer.min_loan_amount) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Maximum Loan:</span>
                          <span className="font-medium">
                            {offer.max_loan_amount ? formatLoanAmount(offer.max_loan_amount) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max LTV Ratio:</span>
                          <span className="font-medium">{offer.max_ltv_ratio_tier1}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tenure:</span>
                          <span className="font-medium">5-30 years</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="calculator" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>EMI Calculator</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3">Different Tenure Options</h4>
                        <div className="space-y-2">
                          {tenureOptions.map((years) => {
                            const emi = calculateMonthlyPayment(offer.loan_amount, offer.interest_rate_min, years)
                            const totalPayment = emi * years * 12
                            const totalInterest = totalPayment - offer.loan_amount
                            
                            return (
                              <div key={years} className="flex justify-between items-center p-3 border rounded">
                                <div>
                                  <div className="font-medium">{years} years</div>
                                  <div className="text-sm text-gray-600">
                                    Total Interest: {formatCurrency(totalInterest)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-green-600">
                                    {formatCurrency(emi)}
                                  </div>
                                  <div className="text-sm text-gray-600">per month</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-3">Cost Breakdown (20 years)</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>Principal Amount:</span>
                            <span className="font-medium">{formatCurrency(offer.loan_amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Interest:</span>
                            <span className="font-medium">
                              {formatCurrency((offer.estimated_emi * 20 * 12) - offer.loan_amount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Processing Fee:</span>
                            <span className="font-medium">{formatCurrency(calculateProcessingFee(offer))}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="font-semibold">Total Cost:</span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency((offer.estimated_emi * 20 * 12) + calculateProcessingFee(offer))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="eligibility" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Eligibility Criteria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-green-700">General Requirements</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start">
                          <span className="text-green-600 mr-2">✓</span>
                          Age: 23-60 years at loan origination
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-600 mr-2">✓</span>
                          Maximum age at loan maturity: 70 years
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-600 mr-2">✓</span>
                          Minimum income requirement applies
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-600 mr-2">✓</span>
                          Good credit score (typically 720+)
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-600 mr-2">✓</span>
                          Stable employment history
                        </li>
                      </ul>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-semibold text-green-700">Target Borrowers</h4>
                      <div className="space-y-2">
                        {offer.target_borrower_segment?.map((segment, index) => (
                          <Badge key={index} variant="outline" className="mr-2">
                            {segment.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h5 className="font-medium text-blue-900 mb-2">Important Notes</h5>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Final approval subject to bank's credit assessment</li>
                          <li>• Interest rates may vary based on credit profile</li>
                          <li>• Property valuation and legal verification required</li>
                          <li>• Income documents must be recent and verified</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Required Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-green-700">Identity & Address</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start">
                          <span className="text-green-600 mr-2">•</span>
                          PAN Card (mandatory)
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-600 mr-2">•</span>
                          Aadhaar Card
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-600 mr-2">•</span>
                          Passport (if applicable)
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-600 mr-2">•</span>
                          Utility bills (electricity/water)
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-600 mr-2">•</span>
                          Bank statements (6 months)
                        </li>
                      </ul>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-semibold text-green-700">Income Documents</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start">
                          <span className="text-green-600 mr-2">•</span>
                          Salary slips (last 3 months) - for salaried
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-600 mr-2">•</span>
                          ITR (last 2 years) - for self-employed
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-600 mr-2">•</span>
                          Form 16 or salary certificate
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-600 mr-2">•</span>
                          Business registration documents
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-600 mr-2">•</span>
                          Profit & Loss statements
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Property Documents</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <ul className="space-y-1">
                        <li>• Sale deed/Agreement to sell</li>
                        <li>• Property card/Survey settlement</li>
                        <li>• Approved building plan</li>
                        <li>• Completion certificate</li>
                      </ul>
                      <ul className="space-y-1">
                        <li>• NOC from builder/society</li>
                        <li>• Property tax receipts</li>
                        <li>• Chain of title documents</li>
                        <li>• Insurance documents</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => router.push(`/apply/${offer.product_id}`)}
            >
              Apply Now
            </Button>
            <Button variant="outline" className="flex-1">
              Compare Offers
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}