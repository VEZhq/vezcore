'use client'

import { Component, ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch() {
    console.error('ErrorBoundary caught an error')
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-[#0a0a0a] light:bg-[#f5f5f5] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            
            <div>
              <h1 className="text-xl font-medium text-white light:text-black">
                Coś poszło nie tak
              </h1>
              <p className="text-sm text-[#666666] light:text-[#999999] mt-2">
                Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.
              </p>
            </div>



            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Odśwież
              </button>
              
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#666666] border border-white/[0.06] hover:bg-white/[0.02] transition-colors"
              >
                <Home className="h-3 w-3" />
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
