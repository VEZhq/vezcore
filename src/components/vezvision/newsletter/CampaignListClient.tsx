'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Send, Trash2, Edit3, Eye, Clock, CheckCircle, XCircle, AlertCircle, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { useConfirm } from '@/components/ConfirmDialog'
import { sendNewsletterCampaign, deleteNewsletterCampaign, duplicateNewsletterCampaign } from '@/lib/actions/vezvision/newsletter/campaigns'
import type { VVNewsletterCampaign } from '@/lib/actions/vezvision/types'

interface CampaignListClientProps {
  campaigns: VVNewsletterCampaign[]
  canManage: boolean
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'draft':
      return <Edit3 className="h-3.5 w-3.5 text-slate-400" />
    case 'scheduled':
      return <Clock className="h-3.5 w-3.5 text-amber-500" />
    case 'sending':
      return <AlertCircle className="h-3.5 w-3.5 text-blue-500" />
    case 'sent':
      return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
    case 'failed':
      return <XCircle className="h-3.5 w-3.5 text-red-500" />
    default:
      return <Eye className="h-3.5 w-3.5 text-slate-400" />
  }
}

function StatusBadge({ status }: { status: string }) {
  const meta: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
    draft: { label: 'Wersja robocza', dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
    scheduled: { label: 'Zaplanowana', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    sending: { label: 'Wysyłanie', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    sent: { label: 'Wysłana', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    failed: { label: 'Błąd', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  }
  const m = meta[status] ?? meta.draft
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${m.text} ${m.bg} border ${m.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}

export default function CampaignListClient({ campaigns: initialCampaigns, canManage }: CampaignListClientProps) {
  const { token: csrfToken } = useCSRFToken()
  const { confirm } = useConfirm()
  const [campaigns, setCampaigns] = useState<VVNewsletterCampaign[]>(initialCampaigns)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleSend = async (campaign: VVNewsletterCampaign) => {
    if (!canManage || !csrfToken) return
    const accepted = await confirm({
      title: 'Wysłać kampanię?',
      message: `Czy na pewno chcesz wysłać kampanię „${campaign.subject}" do ${campaign.recipient_count || 0} odbiorców?`,
      confirmText: 'Wyślij',
      variant: 'info',
    })
    if (!accepted) return

    setLoadingId(campaign.id)
    const result = await sendNewsletterCampaign(campaign.id, csrfToken)
    if (result.success) {
      toast.success(`Wysłano: ${result.data.sentCount}, błędy: ${result.data.errorCount}`)
      setCampaigns((prev) => prev.map((c) => c.id === campaign.id ? { ...c, status: 'sent', sent_at: new Date().toISOString() } : c))
    } else {
      toast.error(result.error)
    }
    setLoadingId(null)
  }

  const handleDelete = async (campaign: VVNewsletterCampaign) => {
    if (!canManage || !csrfToken) return
    const accepted = await confirm({
      title: 'Usunąć kampanię?',
      message: `Czy na pewno chcesz usunąć kampanię „${campaign.subject}"?`,
      confirmText: 'Usuń',
      variant: 'danger',
    })
    if (!accepted) return

    setLoadingId(campaign.id)
    const result = await deleteNewsletterCampaign(campaign.id, csrfToken)
    if (result.success) {
      toast.success('Kampania usunięta')
      setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id))
    } else {
      toast.error(result.error)
    }
    setLoadingId(null)
  }

  const handleDuplicate = async (campaign: VVNewsletterCampaign) => {
    if (!canManage || !csrfToken) return
    setLoadingId(campaign.id)
    const result = await duplicateNewsletterCampaign(campaign.id, csrfToken)
    if (result.success) {
      toast.success('Kampania skopiowana')
      setCampaigns((prev) => [result.data, ...prev])
    } else {
      toast.error(result.error)
    }
    setLoadingId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-medium text-[#111111]">Kampanie</h2>
          <p className="text-[12px] text-[#656b76]">
            {campaigns.length} kampanii
          </p>
        </div>
        {canManage && (
          <Link
            href="/vezvision/newsletter/campaigns/new"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] bg-[#111111] px-3 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-[#262626]"
          >
            <Plus className="h-3.5 w-3.5" />
            Nowa kampania
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-[6px] border border-[#e7e8ee] bg-white shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
        {campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              Brak kampanii
            </p>
            <p className="mt-2 text-[12px] text-[#656b76]">
              Utwórz pierwszą kampanię, aby rozpocząć wysyłkę newslettera
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#ececf1]">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#fbfbfc]"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <StatusIcon status={campaign.status} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[13px] font-medium text-[#111111]">
                      {campaign.subject}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-[#8b9098]">
                      <StatusBadge status={campaign.status} />
                      {campaign.sent_at && (
                        <span>
                          {new Date(campaign.sent_at).toLocaleDateString('pl-PL')}
                        </span>
                      )}
                      {campaign.recipient_count > 0 && (
                        <span>{campaign.sent_count || 0}/{campaign.recipient_count} wysłanych</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {(campaign.status === 'draft' || campaign.status === 'scheduled') && canManage && (
                    <Link
                      href={`/vezvision/newsletter/campaigns/${campaign.id}/edit`}
                      className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDuplicate(campaign)}
                      disabled={loadingId === campaign.id}
                      className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111] disabled:opacity-40"
                      title="Duplikuj"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {(campaign.status === 'draft' || campaign.status === 'scheduled') && canManage && (
                    <button
                      type="button"
                      onClick={() => handleSend(campaign)}
                      disabled={loadingId === campaign.id}
                      className="rounded-[4px] p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-40"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDelete(campaign)}
                      disabled={loadingId === campaign.id}
                      className="rounded-[4px] p-1.5 text-[#656b76] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
