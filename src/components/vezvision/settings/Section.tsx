interface SectionProps {
  title: string
  description: string
  children: React.ReactNode
  action?: React.ReactNode
}

export function Section({ title, description, children, action }: SectionProps) {
  return (
    <section className="border border-white/[0.06] bg-[#111111] p-6 light:border-black/[0.08] light:bg-white">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-[0.01em] text-white light:text-black">{title}</h2>
          <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-[#727272] light:text-[#7f7f7f]">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
