'use client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useState } from "react"

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState<string>("")

  const testConnection = async () => {
    try {
      const { data, error } = await supabase.from('test').select('*').limit(1)
      if (error && error.message.includes('does not exist')) {
        setConnectionStatus("✅ Connected to Supabase (no tables yet)")
      } else if (error) {
        setConnectionStatus(`❌ Error: ${error.message}`)
      } else {
        setConnectionStatus("✅ Connected to Supabase")
      }
    } catch (err) {
      setConnectionStatus(`❌ Connection failed`)
    }
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Unbias Lending</h1>
        <p className="text-muted-foreground">Digital home loan marketplace</p>
        
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Supabase Connection Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testConnection} className="w-full">
              Test Supabase Connection
            </Button>
            {connectionStatus && (
              <p className="text-sm">{connectionStatus}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}