import * as React from 'react'
import { Check, Minus } from 'lucide-react'

import { cn } from '@/lib/utils'

type CheckboxProps = Omit<React.ComponentProps<'input'>, 'type'> & {
  indeterminate?: boolean
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, indeterminate = false, checked, disabled, ...props },
  ref
) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

  React.useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.indeterminate = indeterminate && !checked
  }, [indeterminate, checked])

  return (
    <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
      <input
        {...props}
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-checked={indeterminate ? 'mixed' : checked ? 'true' : 'false'}
        data-indeterminate={indeterminate ? 'true' : 'false'}
        className={cn(
          'peer h-4 w-4 appearance-none rounded-[5px] border border-white/[0.14] bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(0,0,0,0.22)] outline-none transition-all duration-200',
          'hover:border-emerald-400/40 hover:bg-white/[0.05]',
          'focus-visible:border-emerald-400/60 focus-visible:ring-2 focus-visible:ring-emerald-500/20',
          'checked:border-emerald-400/70 checked:bg-emerald-500/18 checked:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_0_1px_rgba(16,185,129,0.2)]',
          'data-[indeterminate=true]:border-emerald-400/70 data-[indeterminate=true]:bg-emerald-500/18 data-[indeterminate=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_0_1px_rgba(16,185,129,0.2)]',
          'disabled:cursor-not-allowed disabled:border-white/[0.08] disabled:bg-white/[0.01] disabled:opacity-50',
          'light:border-black/[0.14] light:bg-black/[0.02] light:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_0_0_1px_rgba(0,0,0,0.06)]',
          'light:hover:border-emerald-500/45 light:hover:bg-black/[0.04]',
          'light:focus-visible:border-emerald-500/60 light:focus-visible:ring-emerald-500/15',
          'light:checked:border-emerald-600/60 light:checked:bg-emerald-500/15',
          'light:data-[indeterminate=true]:border-emerald-600/60 light:data-[indeterminate=true]:bg-emerald-500/15',
          className
        )}
      />

      {indeterminate && !checked ? (
        <Minus className="pointer-events-none absolute h-3 w-3 text-emerald-300 light:text-emerald-700" strokeWidth={2.75} />
      ) : (
        <Check className="pointer-events-none absolute h-3 w-3 scale-75 text-emerald-300 opacity-0 transition-all duration-150 peer-checked:scale-100 peer-checked:opacity-100 light:text-emerald-700" strokeWidth={2.75} />
      )}
    </span>
  )
})

export { Checkbox }
