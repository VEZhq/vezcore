'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CollapsibleProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export function Collapsible({ title, children, defaultOpen = false }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-[6px] border border-[#e7e8ee] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-[12px] font-medium text-[#111111] transition-colors hover:bg-[#fbfbfc]"
      >
        {title}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div className="space-y-4 border-t border-[#ececf1] px-4 pb-4 pt-4">
          {children}
        </div>
      )}
    </div>
  )
}

interface FieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
}

export function Field({ label, required, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium text-[#555b66]">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

export const inputCls = 'w-full rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc] px-3 py-2 text-[13px] text-[#111111] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#d7d9e2] focus:bg-white'
export const textareaCls = `${inputCls} resize-none`
