export default function AnalyticsLoading() {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <div className="h-5 w-32 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
        <div className="h-3 w-48 animate-pulse rounded-[3px] bg-[#ececf1]" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-[6px] border border-[#e7e8ee] bg-white p-5 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-[4px] bg-[#ececf1]" />
              <div className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded-[3px] bg-[#ececf1]" />
                <div className="h-6 w-12 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
              </div>
            </div>
            <div className="mt-3 h-3 w-24 animate-pulse rounded-[3px] bg-[#ececf1]" />
          </div>
        ))}
      </div>

      <div className="rounded-[6px] border border-[#e7e8ee] bg-white p-5 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded-[3px] bg-[#ececf1]" />
          <div className="h-4 w-24 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
                <div className="h-3 w-1/3 animate-pulse rounded-[3px] bg-[#ececf1]" />
              </div>
              <div className="w-32 space-y-1">
                <div className="h-1.5 animate-pulse rounded-full bg-[#ececf1]" />
                <div className="h-3 w-16 animate-pulse rounded-[3px] bg-[#ececf1]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
