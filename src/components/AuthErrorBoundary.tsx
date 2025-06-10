'use client'
import React, { Component, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { authManager } from '@/lib/auth'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  isAuthError: boolean
  retryable: boolean
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      isAuthError: false,
      retryable: false
    }
  }

  static getDerivedStateFromError(error: Error): State {
    const { isAuth, retryable } = authManager.isAuthError(error)
    
    return {
      hasError: true,
      error,
      isAuthError: isAuth,
      retryable
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AuthErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      isAuthError: false,
      retryable: false
    })
  }

  handleSignOut = async () => {
    try {
      await authManager.signOut()
      window.location.href = '/onboarding'
    } catch (error) {
      console.error('Sign out failed:', error)
      // Force redirect even if sign out fails
      window.location.href = '/onboarding'
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, isAuthError, retryable } = this.state

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">
                  {isAuthError ? '🔒' : '❌'}
                </span>
                {isAuthError ? 'Authentication Error' : 'Something went wrong'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                {isAuthError 
                  ? 'There was a problem with your authentication session.'
                  : 'An unexpected error occurred while loading the page.'
                }
              </p>
              
              {error && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                    Error details
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {error.message}
                  </pre>
                </details>
              )}

              <div className="flex flex-col gap-2">
                {retryable && (
                  <Button onClick={this.handleRetry} className="w-full">
                    Try Again
                  </Button>
                )}
                
                {isAuthError && (
                  <Button 
                    onClick={this.handleSignOut} 
                    variant="outline" 
                    className="w-full"
                  >
                    Sign In Again
                  </Button>
                )}
                
                <Button 
                  onClick={() => window.location.href = '/'} 
                  variant="ghost" 
                  className="w-full"
                >
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}