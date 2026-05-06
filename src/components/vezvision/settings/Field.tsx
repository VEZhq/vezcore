interface FieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
}

export function Field({ label, required, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-medium uppercase tracking-[0.16em] text-[#7c7c7c] light:text-[#8e8e8e]">
        {label}
        {required ? <span className="ml-1 text-red-400">*</span> : null}
      </label>
      {children}
    </div>
  )
}
