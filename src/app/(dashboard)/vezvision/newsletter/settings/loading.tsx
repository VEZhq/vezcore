export default function SettingsLoading() {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <div className="h-5 w-32 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
        <div className="h-3 w-56 animate-pulse rounded-[3px] bg-[#ececf1]" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-[6px] border border-[#e7e8ee] bg-white p-5 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded-[3px] bg-[#ececf1]" />
            <div className="h-4 w-24 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-1">
                <div className="h-3 w-20 animate-pulse rounded-[3px] bg-[#ececf1]" />
                <div className="h-9 w-full animate-pulse rounded-[4px] bg-[#e7e8ee]" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-[6px] border border-[#e7e8ee] bg-white p-5 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded-[3px] bg-[#ececf1]" />
            <div className="h-4 w-20 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-1">
                <div className="h-3 w-16 animate-pulse rounded-[3px] bg-[#ececf1]" />
                <div className="flex items-center gap-2">
                  <div className="h-9 w-14 animate-pulse rounded-[4px] bg-[#e7e8ee]" />
                  <div className="h-9 flex-1 animate-pulse rounded-[4px] bg-[#e7e8ee]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-[6px] border border-[#e7e8ee] bg-white p-5 shadow-[0_8px_26px_rgba(25,29,42,0.04)] lg:col-span-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded-[3px] bg-[#ececf1]" />
            <div className="h-4 w-28 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-1">
                <div className="h-3 w-20 animate-pulse rounded-[3px] bg-[#ececf1]" />
                <div className="h-9 w-full animate-pulse rounded-[4px] bg-[#e7e8ee]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
