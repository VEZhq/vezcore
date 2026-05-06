export default function FilesLoading() {
  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-36 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
          <div className="h-3 w-56 animate-pulse rounded-[3px] bg-[#ececf1]" />
        </div>
        <div className="h-8 w-24 animate-pulse rounded-[4px] bg-[#e7e8ee]" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[240px_1fr_300px]">
        <div className="space-y-3">
          <div className="h-4 w-20 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-[4px] bg-[#ececf1]" />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-12 animate-pulse rounded-[4px] bg-[#ececf1]" />
          <div className="space-y-0 divide-y divide-[#ececf1]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-4 w-4 animate-pulse rounded-[3px] bg-[#ececf1]" />
                <div className="h-4 flex-1 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
                <div className="h-4 w-20 animate-pulse rounded-[3px] bg-[#ececf1]" />
                <div className="h-4 w-16 animate-pulse rounded-[3px] bg-[#ececf1]" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-4 w-24 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
          <div className="h-40 animate-pulse rounded-[6px] bg-[#ececf1]" />
          <div className="h-24 animate-pulse rounded-[6px] bg-[#ececf1]" />
        </div>
      </div>
    </div>
  )
}
