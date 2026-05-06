'use client'

import { useState } from 'react'
import { Save, Palette, Mail, Type } from 'lucide-react'
import { toast } from 'sonner'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { updateNewsletterSettings } from '@/lib/actions/vezvision/newsletter/settings'
import type { NewsletterSettings } from '@/lib/actions/vezvision/newsletter/settings'

interface SettingsClientProps {
  initialSettings: NewsletterSettings | null
  canManage: boolean
}

const inputCls = 'h-9 w-full rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc] px-3 text-[13px] text-[#111111] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#d7d9e2] focus:bg-white disabled:opacity-50'

export default function SettingsClient({ initialSettings, canManage }: SettingsClientProps) {
  const { token: csrfToken } = useCSRFToken()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<NewsletterSettings>(
    initialSettings ?? {
      brand_name: 'VezVision',
      logo_url: null,
      primary_color: '#04070d',
      background_color: '#f3f4f6',
      surface_color: '#ffffff',
      text_color: '#0f0f0f',
      footer_text: null,
      from_name: 'VezVision',
      from_email: 'newsletter@vezvision.com',
      reply_to: null,
    }
  )

  const handleSave = async () => {
    if (!canManage || !csrfToken) return
    setLoading(true)
    const result = await updateNewsletterSettings(settings, csrfToken)
    if (result.success) {
      toast.success('Ustawienia zapisane')
    } else {
      toast.error(result.error)
    }
    setLoading(false)
  }

  const update = (key: keyof NewsletterSettings, value: string | null) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[18px] font-medium text-[#111111]">Ustawienia</h2>
        <p className="text-[12px] text-[#656b76]">
          Globalny branding i konfiguracja newslettera
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-[6px] border border-[#e7e8ee] bg-white p-5 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-[#656b76]" />
            <h3 className="text-[13px] font-medium text-[#111111]">Branding</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#555b66]">
                Nazwa marki
              </label>
              <input
                type="text"
                value={settings.brand_name}
                onChange={(e) => update('brand_name', e.target.value)}
                disabled={!canManage}
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#555b66]">
                Logo URL
              </label>
              <input
                type="url"
                value={settings.logo_url ?? ''}
                onChange={(e) => update('logo_url', e.target.value || null)}
                disabled={!canManage}
                placeholder="https://..."
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#555b66]">
                Tekst w stopce
              </label>
              <input
                type="text"
                value={settings.footer_text ?? ''}
                onChange={(e) => update('footer_text', e.target.value || null)}
                disabled={!canManage}
                placeholder="Dodatkowy tekst w stopce maila..."
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-[6px] border border-[#e7e8ee] bg-white p-5 shadow-[0_8px_26px_rgba(25,29,42,0.04)]">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-[#656b76]" />
            <h3 className="text-[13px] font-medium text-[#111111]">Kolory</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'primary_color', label: 'Akcent' },
              { key: 'background_color', label: 'Tło' },
              { key: 'surface_color', label: 'Surface' },
              { key: 'text_color', label: 'Tekst' },
            ].map((color) => (
              <div key={color.key}>
                <label className="mb-1 block text-[11px] font-medium text-[#555b66]">
                  {color.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings[color.key as keyof NewsletterSettings] as string}
                    onChange={(e) => update(color.key as keyof NewsletterSettings, e.target.value)}
                    disabled={!canManage}
                    className="h-9 w-14 rounded-[4px] border border-[#e7e8ee] bg-transparent disabled:opacity-50"
                  />
                  <input
                    type="text"
                    value={settings[color.key as keyof NewsletterSettings] as string}
                    onChange={(e) => update(color.key as keyof NewsletterSettings, e.target.value)}
                    disabled={!canManage}
                    className={inputCls}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-[6px] border border-[#e7e8ee] bg-white p-5 shadow-[0_8px_26px_rgba(25,29,42,0.04)] lg:col-span-2">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#656b76]" />
            <h3 className="text-[13px] font-medium text-[#111111]">Nadawca</h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#555b66]">
                Nazwa nadawcy
              </label>
              <input
                type="text"
                value={settings.from_name}
                onChange={(e) => update('from_name', e.target.value)}
                disabled={!canManage}
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#555b66]">
                Email nadawcy
              </label>
              <input
                type="email"
                value={settings.from_email}
                onChange={(e) => update('from_email', e.target.value)}
                disabled={!canManage}
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#555b66]">
                Reply-to
              </label>
              <input
                type="email"
                value={settings.reply_to ?? ''}
                onChange={(e) => update('reply_to', e.target.value || null)}
                disabled={!canManage}
                placeholder="Opcjonalnie"
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </div>

      {canManage && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[4px] bg-[#111111] px-4 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-[#262626] disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            {loading ? 'Zapisywanie...' : 'Zapisz ustawienia'}
          </button>
        </div>
      )}
    </div>
  )
}
