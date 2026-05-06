interface WorkspaceButtonProps {
  title: string
  description: string
  icon: React.ElementType
  active: boolean
  onClick: () => void
}

export function WorkspaceButton({
  title,
  description,
  icon: Icon,
  active,
  onClick,
}: WorkspaceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full border p-4 text-left transition-colors duration-150 ${active ? 'border-emerald-400/25 bg-emerald-500/[0.06]' : 'border-white/[0.06] bg-[#111111] hover:bg-white/[0.03] light:border-black/[0.06] light:bg-white light:hover:bg-black/[0.03]'}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 items-center justify-center border ${active ? 'border-emerald-400/20 bg-emerald-500/[0.08]' : 'border-white/[0.06] bg-white/[0.03] light:border-black/[0.06] light:bg-black/[0.03]'}`}>
          <Icon className={`h-4 w-4 ${active ? 'text-emerald-300 light:text-emerald-600' : 'text-[#888888] light:text-[#666666]'}`} />
        </div>
        <div>
          <div className={`text-sm font-medium ${active ? 'text-white light:text-black' : 'text-[#d0d0d0] light:text-black'}`}>{title}</div>
          <p className="mt-1 text-[11px] leading-relaxed text-[#777777] light:text-[#888888]">{description}</p>
        </div>
      </div>
    </button>
  )
}
