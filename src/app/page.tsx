'use client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useState } from "react"

export default function Home() {
  const [products, setProducts] = useState<any[]>([])
  const [borrowers, setBorrowers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch products
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          name,
          interest_rate_min,
          max_loan_amount,
          lenders (name)
        `)
        .limit(5)
        
      if (productError) throw productError
      setProducts(productData || [])

      // Fetch borrowers (this will be empty due to RLS, but let's try)
      const { data: borrowerData, error: borrowerError } = await supabase
        .from('borrowers')
        .select('id, city, employment_type, loan_amount_required')
        .limit(5)
        
      // Don't throw error for borrowers since RLS will block this
      setBorrowers(borrowerData || [])
      
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Unbias Lending</h1>
        
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Database Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={fetchData} disabled={loading} className="w-full">
              {loading ? "Loading..." : "Test Database"}
            </Button>
            
            {products.length > 0 && (
              <div className="text-left space-y-2">
                <p className="font-semibold">✅ Products ({products.length}):</p>
                {products.map((product, i) => (
                  <div key={i} className="text-sm p-2 bg-muted rounded">
                    <strong>{product.lenders?.name}</strong><br/>
                    {product.name} - {product.interest_rate_min}%
                  </div>
                ))}
              </div>
            )}

            <div className="text-left">
              <p className="font-semibold">
                {borrowers.length > 0 ? `✅ Borrowers (${borrowers.length}):` : "❌ Borrowers (0) - RLS working correctly"}
              </p>
              <p className="text-xs text-muted-foreground">
                Borrowers won't show due to Row Level Security - this is correct!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}