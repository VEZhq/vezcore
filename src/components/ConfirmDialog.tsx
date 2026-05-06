'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType>({
  confirm: async () => false,
})

export function useConfirm() {
  return useContext(ConfirmContext)
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolve, setResolve] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((res) => {
      setOptions(options)
      setResolve(() => res)
      setIsOpen(true)
    })
  }, [])

  const handleConfirm = () => {
    resolve?.(true)
    setIsOpen(false)
    setOptions(null)
    setResolve(null)
  }

  const handleCancel = () => {
    resolve?.(false)
    setIsOpen(false)
    setOptions(null)
    setResolve(null)
  }

  const variantStyles = {
    danger: {
      icon: 'text-red-600',
      button: 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100',
    },
    warning: {
      icon: 'text-amber-600',
      button: 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100',
    },
    info: {
      icon: 'text-blue-600',
      button: 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100',
    },
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      
      {isOpen && options && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleCancel}
          />
          
          <div className="relative w-full max-w-md mx-4 overflow-hidden rounded-[6px] border border-[#e7e8ee] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ececf1] p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`h-5 w-5 ${variantStyles[options.variant || 'warning'].icon}`} />
                <h3 className="text-[13px] font-medium text-[#111111]">
                  {options.title}
                </h3>
              </div>
              <button
                onClick={handleCancel}
                className="text-[#8b9098] transition-colors hover:text-[#111111]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-[13px] text-[#656b76]">
                {options.message}
              </p>
            </div>
            
            <div className="flex items-center justify-end gap-2 border-t border-[#ececf1] p-4">
              <button
                onClick={handleCancel}
                className="h-8 rounded-[4px] border border-[#e7e8ee] bg-white px-3 text-[11px] text-[#656b76] transition-colors hover:bg-[#f7f7f9] hover:text-[#111111]"
              >
                {options.cancelText || 'Anuluj'}
              </button>
              <button
                onClick={handleConfirm}
                className={`h-8 rounded-[4px] border px-3 text-[11px] font-medium transition-colors ${variantStyles[options.variant || 'warning'].button}`}
              >
                {options.confirmText || 'Potwierdź'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
