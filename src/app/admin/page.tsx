'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"

interface Lender {
  id: string
  name: string
  lender_type: string
  website: string
  is_active: boolean
  created_at: string
}

interface Product {
  id: string
  lender_id: string
  name: string
  interest_rate_min: number
  processing_fee_type: string
  processing_fee_value: number
  min_loan_amount: number
  max_loan_amount: number
  is_active: boolean
  lender_name?: string
}

interface Borrower {
  id: string
  full_name: string
  mobile: string
  city: string
  loan_amount_required: number
  employment_type: string
  status: string
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const [lenders, setLenders] = useState<Lender[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  // Admin authentication state
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(true)

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin])

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/admin/login')
        return
      }

      // Check if user has admin role
      const userRole = user.user_metadata?.role
      if (userRole !== 'admin') {
        setError('Access denied. Admin privileges required.')
        setAdminLoading(false)
        return
      }

      setIsAdmin(true)
    } catch (error) {
      console.error('Admin access check failed:', error)
      setError('Authentication failed')
    } finally {
      setAdminLoading(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load lenders
      const { data: lendersData, error: lendersError } = await supabase
        .from('lenders')
        .select('*')
        .order('created_at', { ascending: false })

      if (lendersError) throw lendersError

      // Load products with lender names
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          lenders!inner(name)
        `)
        .order('created_at', { ascending: false })

      if (productsError) throw productsError

      // Load borrowers
      const { data: borrowersData, error: borrowersError } = await supabase
        .from('borrowers')
        .select('id, full_name, mobile, city, loan_amount_required, employment_type, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100)

      if (borrowersError) throw borrowersError

      setLenders(lendersData || [])
      setProducts(productsData?.map(p => ({
        ...p,
        lender_name: p.lenders?.name
      })) || [])
      setBorrowers(borrowersData || [])

    } catch (error: any) {
      console.error('Error loading admin data:', error)
      setError(error.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const toggleLenderStatus = async (lenderId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('lenders')
        .update({ is_active: !currentStatus })
        .eq('id', lenderId)

      if (error) throw error

      setLenders(prev => prev.map(lender => 
        lender.id === lenderId 
          ? { ...lender, is_active: !currentStatus }
          : lender
      ))
    } catch (error: any) {
      console.error('Error updating lender status:', error)
      setError(error.message || 'Failed to update lender status')
    }
  }

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !currentStatus })
        .eq('id', productId)

      if (error) throw error

      setProducts(prev => prev.map(product => 
        product.id === productId 
          ? { ...product, is_active: !currentStatus }
          : product
      ))
    } catch (error: any) {
      console.error('Error updating product status:', error)
      setError(error.message || 'Failed to update product status')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking admin access...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-red-600 mb-4">{error || 'Admin privileges required'}</p>
            <Button onClick={() => router.push('/admin/login')} className="w-full">
              Admin Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Manage lenders, products, and borrower applications</p>
          </div>
          <div className="flex space-x-4">
            <Button onClick={() => router.push('/offers')} variant="outline">
              View Public Site
            </Button>
            <Button onClick={() => supabase.auth.signOut()} variant="outline">
              Logout
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{lenders.length}</div>
                <div className="text-sm text-gray-600">Total Lenders</div>
                <div className="text-xs text-gray-500">
                  {lenders.filter(l => l.is_active).length} active
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{products.length}</div>
                <div className="text-sm text-gray-600">Total Products</div>
                <div className="text-xs text-gray-500">
                  {products.filter(p => p.is_active).length} active
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{borrowers.length}</div>
                <div className="text-sm text-gray-600">Total Borrowers</div>
                <div className="text-xs text-gray-500">
                  {borrowers.filter(b => b.status === 'verified').length} verified
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {borrowers.filter(b => b.status === 'draft').length}
                </div>
                <div className="text-sm text-gray-600">Pending Applications</div>
                <div className="text-xs text-gray-500">Need review</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="lenders">Lenders</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="borrowers">Borrowers</TabsTrigger>
          </TabsList>

          <TabsContent value="lenders" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Lenders Management</h2>
              <Button>Add New Lender</Button>
            </div>
            
            <div className="grid gap-4">
              {lenders.map((lender) => (
                <Card key={lender.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">{lender.name}</h3>
                        <p className="text-gray-600">{lender.lender_type}</p>
                        <p className="text-sm text-gray-500">
                          Created: {formatDate(lender.created_at)}
                        </p>
                        {lender.website && (
                          <p className="text-sm text-blue-600">{lender.website}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={lender.is_active ? "default" : "secondary"}>
                          {lender.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          variant="outline"
                          onClick={() => toggleLenderStatus(lender.id, lender.is_active)}
                        >
                          {lender.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button variant="outline">Edit</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Products Management</h2>
              <Button>Add New Product</Button>
            </div>
            
            <div className="grid gap-4">
              {products.map((product) => (
                <Card key={product.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">{product.name}</h3>
                        <p className="text-gray-600">{product.lender_name}</p>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                          <div>
                            <span className="text-gray-500">Interest Rate:</span>
                            <span className="font-medium ml-2">{product.interest_rate_min}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Processing Fee:</span>
                            <span className="font-medium ml-2">
                              {product.processing_fee_type === 'Percentage' 
                                ? `${product.processing_fee_value}%` 
                                : formatCurrency(product.processing_fee_value)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Min Loan:</span>
                            <span className="font-medium ml-2">{formatCurrency(product.min_loan_amount)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Max Loan:</span>
                            <span className="font-medium ml-2">{formatCurrency(product.max_loan_amount)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          variant="outline"
                          onClick={() => toggleProductStatus(product.id, product.is_active)}
                        >
                          {product.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button variant="outline">Edit</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="borrowers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Borrower Applications</h2>
              <Button variant="outline">Export Data</Button>
            </div>
            
            <div className="grid gap-4">
              {borrowers.map((borrower) => (
                <Card key={borrower.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">{borrower.full_name}</h3>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                          <div>
                            <span className="text-gray-500">Mobile:</span>
                            <span className="font-medium ml-2">{borrower.mobile}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">City:</span>
                            <span className="font-medium ml-2">{borrower.city}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Loan Amount:</span>
                            <span className="font-medium ml-2">{formatCurrency(borrower.loan_amount_required)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Employment:</span>
                            <span className="font-medium ml-2">{borrower.employment_type?.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          Applied: {formatDate(borrower.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          borrower.status === 'verified' ? "default" : 
                          borrower.status === 'draft' ? "secondary" : "outline"
                        }>
                          {borrower.status}
                        </Badge>
                        <Button variant="outline">View Details</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}