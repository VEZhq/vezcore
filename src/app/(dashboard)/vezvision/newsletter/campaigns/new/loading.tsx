export default function CampaignLoading() {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-[4px] bg-[#ececf1]" />
          <div className="h-5 w-40 animate-pulse rounded-[3px] bg-[#e7e8ee]" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 animate-pulse rounded-[4px] bg-[#ececf1]" />
          <div className="h-8 w-24 animate-pulse rounded-[4px] bg-[#e7e8ee]" />
          <div className="h-8 w-28 animate-pulse rounded-[4px] bg-[#111111]" />
        </div>
      </div>

      <div className="flex flex-1 gap-4">
        <div className="flex-1 space-y-4">
          <div className="h-8 w-32 animate-pulse rounded-[4px] bg-[#ececf1]" />
          <div className="h-9 w-full animate-pulse rounded-[4px] bg-[#e7e8ee]" />
          <div className="h-64 w-full animate-pulse rounded-[4px] bg-[#ececf1]" />
          <div className="h-20 w-full animate-pulse rounded-[6px] bg-[#e7e8ee]" />
        </div>
        <div className="w-1/2 space-y-3">
          <div className="h-4 w-32 animate-pulse rounded-[3px] bg-[#ececf1]" />
          <div className="h-96 w-full animate-pulse rounded-[6px] bg-[#e7e8ee]" />
        </div>
      </div>
    </div>
  )
}
