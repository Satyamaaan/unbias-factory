'use client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useState } from "react"

export default function Home() {
  const [offers, setOffers] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testMatchOffers = async (borrowerId: string, label: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('match_offers', {
        body: { borrower_id: borrowerId }
      })

      if (error) throw error
      setOffers({ ...data, label })
    } catch (error) {
      console.error('Error:', error)
      setOffers({ error: error.message, label })
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

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Unbias Lending</h1>
        <p className="text-muted-foreground">Comparison Engine Test</p>
        
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Match Offers Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={() => testMatchOffers('11111111-1111-1111-1111-111111111111', 'Salaried Borrower')} 
                disabled={loading} 
                className="flex-1"
              >
                {loading ? "Loading..." : "Test Salaried Borrower"}
              </Button>
              <Button 
                onClick={() => testMatchOffers('22222222-2222-2222-2222-222222222222', 'Self-Employed')} 
                disabled={loading} 
                variant="outline"
                className="flex-1"
              >
                {loading ? "Loading..." : "Test Self-Employed"}
              </Button>
            </div>
            
            {offers && (
              <div className="text-left space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Results for {offers.label}:</h3>
                  <Badge variant={offers.count > 0 ? "default" : "secondary"}>
                    {offers.count} offers found
                  </Badge>
                </div>

                {offers.error ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="font-semibold text-red-700">❌ Error:</p>
                    <p className="text-sm text-red-600">{offers.error}</p>
                  </div>
                ) : offers.count === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="font-semibold text-yellow-700">⚠️ No eligible offers</p>
                    <p className="text-sm text-yellow-600">
                      This borrower doesn't meet the eligibility criteria for any available products.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {offers.offers?.map((offer: any, i: number) => (
                      <Card key={i} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-bold text-lg text-green-800">
                                {offer.lender_name}
                              </h4>
                              <p className="text-green-700 font-medium">
                                {offer.product_name}
                              </p>
                            </div>
                            <Badge className="bg-green-100 text-green-800">
                              {offer.interest_rate}% p.a.
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Loan Amount</p>
                              <p className="font-semibold">{formatLoanAmount(offer.loan_amount)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">EMI (20 years)</p>
                              <p className="font-semibold">{formatCurrency(offer.estimated_emi)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Processing Fee</p>
                              <p className="font-semibold">{formatCurrency(offer.processing_fee)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Max LTV</p>
                              <p className="font-semibold">{offer.max_ltv}%</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                
                <details className="mt-4">
                  <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                    View Raw Response
                  </summary>
                  <pre className="text-xs p-3 bg-muted rounded mt-2 overflow-auto max-h-60">
                    {JSON.stringify(offers, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}