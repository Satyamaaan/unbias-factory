import React from 'react'

interface DialogProps {
  children: React.ReactNode
}

interface DialogContentProps {
  className?: string
  children: React.ReactNode
}

interface DialogHeaderProps {
  children: React.ReactNode
}

interface DialogTitleProps {
  className?: string
  children: React.ReactNode
}

interface DialogTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

export function Dialog({ children }: DialogProps) {
  return (
    <div className="relative">
      {children}
    </div>
  )
}

export function DialogTrigger({ asChild, children }: DialogTriggerProps) {
  if (asChild) {
    return <>{children}</>
  }
  return (
    <button className="inline-flex items-center justify-center">
      {children}
    </button>
  )
}

export function DialogContent({ className = "", children }: DialogContentProps) {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${className}`}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return (
    <div className="mb-4">
      {children}
    </div>
  )
}

export function DialogTitle({ className = "", children }: DialogTitleProps) {
  return (
    <h2 className={`text-lg font-semibold ${className}`}>
      {children}
    </h2>
  )
}