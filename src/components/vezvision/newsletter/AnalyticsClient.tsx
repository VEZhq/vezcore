'use client'

import { BarChart3, Users, Mail, TrendingUp } from 'lucide-react'

interface AnalyticsClientProps {
  campaigns: Array<{
    id: string
    subject: string
    status: string
    recipient_count: number
    sent_count: number
    sent_at: string | null
    created_at: string
  }>
  stats: {
    totalSubscribers: number
    activeSubscribers: number
    inactiveSubscribers: number
    totalSent: number
    totalFailed: number
    totalCampaigns: number
  }
}

export default function AnalyticsClient({ campaigns, stats }: AnalyticsClientProps) {
  const successRate = stats.totalSent + stats.totalFailed > 0
    ? Math.round((stats.totalSent / (stats.totalSent + stats.totalFailed)) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[18px] font-medium text-[#111111]">Analizy</h2>
        <p className="text-[12px] text-[#656b76]">
          Podsumowanie wysyłek i odbiorców
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-[6px] border border-[#e7e8ee] bg-white p-5 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
          <div className="flex items-center gap-3">
            <div className="rounded-[4px] bg-emerald-50 p-2">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8b9098]">Odbiorcy</p>
              <p className="text-2xl font-medium text-[#111111]">{stats.totalSubscribers}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-4 text-[11px]">
            <span className="text-emerald-600">{stats.activeSubscribers} aktywni</span>
            <span className="text-[#8b9098]">{stats.inactiveSubscribers} wypisani</span>
          </div>
        </div>

        <div className="rounded-[6px] border border-[#e7e8ee] bg-white p-5 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
          <div className="flex items-center gap-3">
            <div className="rounded-[4px] bg-blue-50 p-2">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8b9098]">Wysłane</p>
              <p className="text-2xl font-medium text-[#111111]">{stats.totalSent}</p>
            </div>
          </div>
          <div className="mt-3 text-[11px]">
            <span className="text-blue-600">{stats.totalCampaigns} kampanii</span>
          </div>
        </div>

        <div className="rounded-[6px] border border-[#e7e8ee] bg-white p-5 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
          <div className="flex items-center gap-3">
            <div className="rounded-[4px] bg-emerald-50 p-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8b9098]">Skuteczność</p>
              <p className="text-2xl font-medium text-[#111111]">{successRate}%</p>
            </div>
          </div>
          <div className="mt-3 text-[11px]">
            {stats.totalFailed > 0 && (
              <span className="text-red-600">{stats.totalFailed} błędów</span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[6px] border border-[#e7e8ee] bg-white p-5 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#8b9098]" />
          <h3 className="text-[13px] font-medium text-[#111111]">Kampanie</h3>
        </div>
        {campaigns.length === 0 ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
            Brak wysłanych kampanii
          </p>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => {
              const rate = campaign.recipient_count > 0
                ? Math.round((campaign.sent_count / campaign.recipient_count) * 100)
                : 0
              return (
                <div key={campaign.id} className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[#111111]">{campaign.subject}</p>
                    <p className="text-[11px] text-[#8b9098]">
                      {campaign.sent_at ? new Date(campaign.sent_at).toLocaleDateString('pl-PL') : ''}
                    </p>
                  </div>
                  <div className="w-32">
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#ececf1]">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[10px] text-[#8b9098]">
                      {campaign.sent_count}/{campaign.recipient_count}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
