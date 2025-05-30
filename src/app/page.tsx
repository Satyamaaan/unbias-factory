import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">
          Unbias Lending
        </h1>
        <p className="text-muted-foreground">
          Digital home loan marketplace - Coming soon
        </p>
        
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Ready to Build</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Next.js + TypeScript + Tailwind + ShadCN setup complete
            </p>
            <Button className="w-full">
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}