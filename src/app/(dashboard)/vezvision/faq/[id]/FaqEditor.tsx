'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { createFaqItem, updateFaqItem } from '@/lib/actions/vezvision/faq'
import type { VVFaqItem } from '@/lib/actions/vezvision/types'

interface FaqEditorProps {
  item: VVFaqItem | null
  canManage: boolean
}

const inputCls = 'w-full rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc] px-3 py-2 text-[13px] text-[#111111] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#d7d9e2] focus:bg-white'
const textareaCls = `${inputCls} resize-none`

export default function FaqEditor({ item, canManage }: FaqEditorProps) {
  const router = useRouter()
  const { token: csrfToken } = useCSRFToken()
  const isNew = !item

  const [saving, setSaving] = useState(false)
  const [orderIndex, setOrderIndex] = useState(item ? String(item.order_index) : '')
  const [orderIndexChanged, setOrderIndexChanged] = useState(false)
  const [isActive, setIsActive] = useState(item?.is_active ?? true)
  const [questionPl, setQuestionPl] = useState(item?.question_pl ?? '')
  const [questionEn, setQuestionEn] = useState(item?.question_en ?? '')
  const [answerPl, setAnswerPl] = useState(item?.answer_pl ?? '')
  const [answerEn, setAnswerEn] = useState(item?.answer_en ?? '')

  const handleSave = async () => {
    if (!canManage) return

    if (!questionPl.trim() || !answerPl.trim()) {
      toast.error('Pytanie i odpowiedź PL są wymagane')
      return
    }

    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    const parsedOrder = orderIndex.trim() === '' ? undefined : Number(orderIndex)
    const normalizedOrder = Number.isFinite(parsedOrder) ? parsedOrder : undefined

    const payload = {
      question_pl: questionPl,
      question_en: questionEn || null,
      answer_pl: answerPl,
      answer_en: answerEn || null,
      order_index: orderIndexChanged ? normalizedOrder : undefined,
      is_active: isActive,
    }

    setSaving(true)
    try {
      const result = isNew
        ? await createFaqItem(payload, csrfToken)
        : await updateFaqItem(item.id, payload, csrfToken)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(isNew ? 'Wpis FAQ utworzony' : 'Wpis FAQ zapisany')
      router.push('/vezvision/faq')
    } catch {
      toast.error('Wystąpił nieoczekiwany błąd')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="light w-full px-5 py-4 text-[#111111] xl:px-6">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/vezvision/faq"
          className="flex items-center gap-2 rounded-[4px] px-2 py-1.5 text-[12px] text-[#656b76] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]"
        >
          <ArrowLeft className="h-3 w-3" />
          FAQ
        </Link>
        <div className="h-4 w-px bg-[#e7e8ee]" />
        <h1 className="truncate text-[21px] font-medium tracking-[-0.04em] text-[#111111]">
          {isNew ? 'Nowy wpis FAQ' : 'Edycja wpisu FAQ'}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="space-y-4 rounded-[6px] border border-[#e7e8ee] bg-white p-4 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-[#555b66]">
                  Pytanie PL <span className="ml-1 text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={questionPl}
                  onChange={(e) => setQuestionPl(e.target.value)}
                  className={inputCls}
                  placeholder="Wprowadź pytanie po polsku"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-[#555b66]">
                  Pytanie EN
                </label>
                <input
                  type="text"
                  value={questionEn}
                  onChange={(e) => setQuestionEn(e.target.value)}
                  className={inputCls}
                  placeholder="Enter question in English"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-[#555b66]">
                  Odpowiedź PL <span className="ml-1 text-red-500">*</span>
                </label>
                <textarea
                  value={answerPl}
                  onChange={(e) => setAnswerPl(e.target.value)}
                  className={textareaCls}
                  rows={8}
                  placeholder="Wprowadź odpowiedź po polsku"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-[#555b66]">
                  Odpowiedź EN
                </label>
                <textarea
                  value={answerEn}
                  onChange={(e) => setAnswerEn(e.target.value)}
                  className={textareaCls}
                  rows={8}
                  placeholder="Enter answer in English"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-4 rounded-[6px] border border-[#e7e8ee] bg-white p-4 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-[#555b66]">
                Kolejność
              </label>
              <input
                type="number"
                value={orderIndex}
                onChange={(e) => { setOrderIndex(e.target.value); setOrderIndexChanged(true) }}
                className={inputCls}
                min="0"
                placeholder={isNew ? 'Automatycznie na końcu listy' : 'Numer pozycji'}
              />
              <p className="mt-1 text-[11px] text-[#8b9098]">
                Po zapisaniu kolejność pozostałych wpisów zostanie przeliczona automatycznie.
              </p>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-[11px] font-medium text-[#555b66]">Aktywne</span>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={`h-5 w-10 rounded-full transition-colors ${isActive ? 'bg-[#22a06b]' : 'bg-[#dfe1e7]'}`}
              >
                <span className={`mx-0.5 block h-4 w-4 rounded-full bg-white transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <div className="space-y-2 rounded-[6px] border border-[#e7e8ee] bg-white p-4 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-[4px] border border-[#e7e8ee] bg-white px-4 py-2.5 text-[12px] font-medium text-[#111111] transition-colors hover:bg-[#f0f0f4] disabled:opacity-40"
            >
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
