'use client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useState } from "react"

export default function Home() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          name,
          interest_rate_min,
          lenders (name)
        `)
        .limit(10)
        
      if (error) throw error
      setData(products || [])
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
        
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Database Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={fetchProducts} disabled={loading} className="w-full">
              {loading ? "Loading..." : "Fetch Products"}
            </Button>
            
            {data.length > 0 && (
              <div className="text-left space-y-2">
                <p className="font-semibold">Found {data.length} products:</p>
                {data.slice(0, 3).map((product, i) => (
                  <div key={i} className="text-sm p-2 bg-muted rounded">
                    <strong>{product.lenders?.name}</strong><br/>
                    {product.name} - {product.interest_rate_min}%
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}