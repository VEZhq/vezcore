export default function CampaignsLoading() {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
          <div className="h-3 w-24 animate-pulse rounded-[3px] bg-[#ececf1]" />
        </div>
        <div className="h-8 w-28 animate-pulse rounded-[4px] bg-[#e7e8ee]" />
      </div>

      <div className="overflow-hidden rounded-[6px] border border-[#e7e8ee] bg-white shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
        <div className="space-y-0 divide-y divide-[#ececf1]">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-5 py-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="h-3.5 w-3.5 animate-pulse rounded-full bg-[#ececf1]" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
                  <div className="h-3 w-1/2 animate-pulse rounded-[3px] bg-[#ececf1]" />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-7 w-7 animate-pulse rounded-[4px] bg-[#ececf1]" />
                <div className="h-7 w-7 animate-pulse rounded-[4px] bg-[#ececf1]" />
                <div className="h-7 w-7 animate-pulse rounded-[4px] bg-[#ececf1]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
