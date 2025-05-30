'use client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useState } from "react"

export default function Home() {
  const [products, setProducts] = useState<any[]>([])
  const [functionResult, setFunctionResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testFunction = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.functions.invoke('hello', {
        body: { test: 'data' }
      })

      if (error) throw error
      setFunctionResult(data)
    } catch (error: unknown) {
      console.error('Function error:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setFunctionResult({ error: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    setProducts([])
    
    console.log('🔍 Starting to fetch products...')
    console.log('🔗 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing')
    console.log('🔑 Supabase Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing')
    
    try {
      // First, try a simple query without joins
      console.log('🔄 Trying simple query first...')
      let { data: productData, error } = await supabase
        .from('products')
        .select('name, interest_rate_min')
        .limit(3)
        
      console.log('📊 Simple query result:', { data: productData, error })
      
      if (error) {
        console.error('❌ Supabase error:', error)
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`)
      }
      
      // If simple query works, try with lenders join
      if (productData && productData.length > 0) {
        console.log('✅ Simple query worked, trying with lenders join...')
        const { data: productDataWithLenders, error: joinError } = await supabase
          .from('products')
          .select(`
            name,
            interest_rate_min,
            lenders (name)
          `)
          .limit(3)
          
        if (!joinError && productDataWithLenders) {
          console.log('✅ Join query also worked!')
          productData = productDataWithLenders
        } else {
          console.log('⚠️ Join failed, using simple data:', joinError?.message)
        }
      }
      
      console.log('✅ Products fetched successfully:', productData)
      setProducts(productData || [])
      
    } catch (error: unknown) {
      console.error('💥 Fetch error:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Unbias Lending</h1>
        
        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {/* Database Test */}
          <Card>
            <CardHeader>
              <CardTitle>Database Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={fetchProducts} disabled={loading} className="w-full">
                {loading ? "Loading..." : "Fetch Products"}
              </Button>
              
              {error && (
                <div className="text-left">
                  <p className="font-semibold text-red-600">❌ Error:</p>
                  <pre className="text-xs p-2 bg-red-50 border border-red-200 rounded overflow-auto text-red-800">
                    {error}
                  </pre>
                  <p className="text-xs text-gray-600 mt-2">Check the browser console for more details</p>
                </div>
              )}
              
              {products.length > 0 && (
                <div className="text-left space-y-2">
                  <p className="font-semibold">✅ Products ({products.length}):</p>
                  {products.map((product, i) => (
                    <div key={i} className="text-sm p-2 bg-muted rounded">
                      {product.lenders?.name && <><strong>{product.lenders.name}</strong><br/></>}
                      {product.name} {product.interest_rate_min && `- ${product.interest_rate_min}%`}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edge Function Test */}
          <Card>
            <CardHeader>
              <CardTitle>Edge Function Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={testFunction} disabled={loading} className="w-full">
                {loading ? "Calling..." : "Test Hello Function"}
              </Button>
              
              {functionResult && (
                <div className="text-left">
                  <p className="font-semibold">
                    {functionResult.error ? "❌ Function Error:" : "✅ Function Response:"}
                  </p>
                  <pre className="text-xs p-2 bg-muted rounded overflow-auto">
                    {JSON.stringify(functionResult, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}