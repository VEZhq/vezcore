export default function CalendarLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#ececf1] px-5 py-3">
        <div className="h-5 w-32 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded-[4px] bg-[#ececf1]" />
          <div className="h-5 w-24 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
          <div className="h-8 w-8 animate-pulse rounded-[4px] bg-[#ececf1]" />
        </div>
      </div>
      <div className="flex-1 p-5">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-[3px] bg-[#ececf1]" />
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-[4px] bg-[#fbfbfc]" />
          ))}
        </div>
      </div>
    </div>
  )
}
