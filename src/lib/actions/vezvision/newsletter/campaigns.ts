'use server'
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, MIN_PAGE_LIMIT, MAX_TITLE_LENGTH, MAX_SLUG_LENGTH, MAX_EXCERPT_LENGTH, MAX_CONTENT_LENGTH_KB, MAX_QUESTION_LENGTH, MAX_ANSWER_LENGTH_KB, MAX_CATEGORY_LENGTH, MAX_SUBJECT_LENGTH, MAX_EVENT_TITLE_LENGTH } from '@/lib/constants/pagination'
import { ONE_MINUTE } from '@/lib/constants/time'

import { revalidatePath } from 'next/cache'
import { requireVezVisionPermission } from '@/lib/auth/vezvision'
import { getVezVisionPrivilegedClient } from '@/lib/supabase/vezvision'
import { VEZVISION_PERMISSIONS } from '@/lib/vezvision-permissions'
import { guardVezVisionMutation } from '@/lib/actions/vezvision/security'
import { sanitizeVezVisionHtml } from '@/lib/vezvision-security-utils'
import { logError } from '@/lib/logger'
import type { Json, TablesInsert, TablesUpdate } from '@/types/vezvision-db'
import type { ActionResult, VVNewsletterCampaign } from '../types'
import { generateEmailHtml } from '@/lib/newsletter/email-template'
import { getNewsletterSettings } from './settings'

type NewsletterCampaignInsert = TablesInsert<'vv_newsletter_campaigns'> & {
  subject_en?: string | null
  content_html_en?: string | null
  template_config?: Json | null
  scheduled_for?: string | null
  segment_tags?: string[] | null
  segment_language?: string | null
}

type NewsletterCampaignUpdate = TablesUpdate<'vv_newsletter_campaigns'> & {
  subject_en?: string | null
  content_html_en?: string | null
  template_config?: Json | null
  scheduled_for?: string | null
  segment_tags?: string[] | null
  segment_language?: string | null
}

function injectUnsubscribeFooter(html: string): string {
  if (html.includes('{{UNSUBSCRIBE_URL}}')) return html
  return `${html}\n<div style="margin-top:40px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);font-size:12px;color:#6b7280;text-align:center;">Otrzymujesz tę wiadomość, ponieważ jesteś na naszej liście. <a href="{{UNSUBSCRIBE_URL}}" style="color:#22c55e;">Wypisz się</a></div>`
}

function normalizeOptionalSubject(subject?: string | null): string | null {
  const value = subject?.trim()
  return value ? value : null
}

function normalizeOptionalContent(content?: string | null): string | null {
  const value = content?.trim()
  if (!value || value === '<p></p>') return null
  return injectUnsubscribeFooter(sanitizeVezVisionHtml(value))
}

export async function getNewsletterCampaigns(): Promise<ActionResult<VVNewsletterCampaign[]>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_newsletter_campaigns')
    .select('id, subject, subject_en, content_html, content_html_en, template_config, status, recipient_count, sent_count, scheduled_for, segment_tags, segment_language, sent_at, created_by, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) {
    logError('newsletter.getNewsletterCampaigns', error)
    return { success: false, error: 'Błąd podczas pobierania kampanii' }
  }

  return { success: true, data: (data ?? []) as VVNewsletterCampaign[] }
}

export async function getNewsletterCampaign(id: string): Promise<ActionResult<VVNewsletterCampaign>> {
  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_VIEW)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data, error } = await vv
    .from('vv_newsletter_campaigns')
    .select('id, subject, subject_en, content_html, content_html_en, template_config, status, recipient_count, sent_count, scheduled_for, segment_tags, segment_language, sent_at, created_by, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error || !data) {
    logError('newsletter.getNewsletterCampaign', error)
    return { success: false, error: 'Kampania nie została znaleziona' }
  }

  return { success: true, data: data as VVNewsletterCampaign }
}

export async function createNewsletterCampaign(
  input: {
    subject: string
    content_html: string
    subject_en?: string | null
    content_html_en?: string | null
    template_config?: Record<string, unknown> | null
    status?: string
    scheduled_for?: string | null
    segment_tags?: string[] | null
    segment_language?: string | null
  },
  csrfToken: string
): Promise<ActionResult<VVNewsletterCampaign>> {
  const guard = await guardVezVisionMutation({ action: 'newsletter.campaign.create', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const subject = input.subject.trim()
  if (subject.length < 2 || subject.length > MAX_SUBJECT_LENGTH) {
    return { success: false, error: 'Temat musi mieć od 2 do 200 znaków' }
  }

  const content = input.content_html.trim()
  if (content.length < 10) {
    return { success: false, error: 'Treść kampanii jest wymagana' }
  }

  const allowedStatuses = new Set(['draft', 'scheduled'])
  const status = input.status ?? 'draft'
  if (!allowedStatuses.has(status)) {
    return { success: false, error: 'Nieprawidłowy status kampanii' }
  }

  const subjectEn = normalizeOptionalSubject(input.subject_en)
  if (subjectEn && (subjectEn.length < 2 || subjectEn.length > MAX_SUBJECT_LENGTH)) {
    return { success: false, error: 'Temat EN musi mieć od 2 do 200 znaków' }
  }

  const contentEn = normalizeOptionalContent(input.content_html_en)
  if (contentEn && input.content_html_en && input.content_html_en.trim().length < 10) {
    return { success: false, error: 'Treść EN jest za krótka' }
  }

  const vv = getVezVisionPrivilegedClient()
  const insertData: NewsletterCampaignInsert = {
    subject,
    content_html: injectUnsubscribeFooter(sanitizeVezVisionHtml(content)),
    subject_en: subjectEn,
    content_html_en: contentEn,
    template_config: (input.template_config ?? null) as Json | null,
    status,
    scheduled_for: input.scheduled_for ?? null,
    segment_tags: input.segment_tags ?? null,
    segment_language: input.segment_language ?? null,
    recipient_count: 0,
    sent_count: 0,
    created_by: auth.userId,
  }

  const { data, error } = await vv
    .from('vv_newsletter_campaigns')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    logError('newsletter.createNewsletterCampaign', error)
    return { success: false, error: 'Błąd podczas tworzenia kampanii' }
  }

  revalidatePath('/vezvision/newsletter/campaigns')
  return { success: true, data: data as VVNewsletterCampaign }
}

export async function duplicateNewsletterCampaign(id: string, csrfToken: string): Promise<ActionResult<VVNewsletterCampaign>> {
  const guard = await guardVezVisionMutation({ action: 'newsletter.campaign.duplicate', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data: original, error: fetchError } = await vv
    .from('vv_newsletter_campaigns')
    .select('id, subject, subject_en, content_html, content_html_en, template_config, status, recipient_count, sent_count, scheduled_for, segment_tags, segment_language, sent_at, created_by, created_at, updated_at')
    .eq('id', id)
    .single()

  if (fetchError || !original) {
    logError('newsletter.duplicateNewsletterCampaign.fetch', fetchError)
    return { success: false, error: 'Kampania nie istnieje' }
  }

  const { id: _id, created_at, updated_at, sent_at, sent_count, recipient_count, ...campaignData } = original as typeof original

  const { data: newCampaign, error: insertError } = await vv
    .from('vv_newsletter_campaigns')
    .insert({
      ...campaignData,
      subject: `${campaignData.subject} (kopia)`,
      status: 'draft',
      recipient_count: 0,
      sent_count: 0,
      sent_at: null,
    })
    .select()
    .single()

  if (insertError || !newCampaign) {
    logError('newsletter.duplicateNewsletterCampaign.insert', insertError)
    return { success: false, error: 'Błąd podczas duplikowania kampanii' }
  }

  revalidatePath('/vezvision/newsletter/campaigns')
  return { success: true, data: newCampaign as VVNewsletterCampaign }
}

export async function updateNewsletterCampaign(
  id: string,
  input: {
    subject?: string
    content_html?: string
    subject_en?: string | null
    content_html_en?: string | null
    template_config?: Record<string, unknown> | null
    status?: string
    scheduled_for?: string | null
    segment_tags?: string[] | null
    segment_language?: string | null
  },
  csrfToken: string
): Promise<ActionResult<VVNewsletterCampaign>> {
  const guard = await guardVezVisionMutation({ action: 'newsletter.campaign.update', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const allowedStatuses = new Set(['draft', 'scheduled', 'sending', 'sent', 'failed'])
  if (input.status && !allowedStatuses.has(input.status)) {
    return { success: false, error: 'Nieprawidłowy status kampanii' }
  }

  const updateData: NewsletterCampaignUpdate = {}
  if (input.subject !== undefined) {
    const subject = input.subject.trim()
    if (subject.length < 2 || subject.length > MAX_SUBJECT_LENGTH) {
      return { success: false, error: 'Temat musi mieć od 2 do 200 znaków' }
    }
    updateData.subject = subject
  }
  if (input.content_html !== undefined) {
    const content = input.content_html.trim()
    if (content.length < 10) {
      return { success: false, error: 'Treść kampanii jest wymagana' }
    }
    updateData.content_html = injectUnsubscribeFooter(sanitizeVezVisionHtml(content))
  }
  if (input.subject_en !== undefined) {
    const subjectEn = normalizeOptionalSubject(input.subject_en)
    if (subjectEn && (subjectEn.length < 2 || subjectEn.length > MAX_SUBJECT_LENGTH)) {
      return { success: false, error: 'Temat EN musi mieć od 2 do 200 znaków' }
    }
    updateData.subject_en = subjectEn
  }
  if (input.content_html_en !== undefined) {
    const contentEn = normalizeOptionalContent(input.content_html_en)
    if (contentEn && (input.content_html_en?.trim() ?? '').length < 10) {
      return { success: false, error: 'Treść EN jest za krótka' }
    }
    updateData.content_html_en = contentEn
  }
  if (input.template_config !== undefined) updateData.template_config = input.template_config as Json | null
  if (input.status !== undefined) updateData.status = input.status
  if (input.scheduled_for !== undefined) updateData.scheduled_for = input.scheduled_for
  if (input.segment_tags !== undefined) updateData.segment_tags = input.segment_tags
  if (input.segment_language !== undefined) updateData.segment_language = input.segment_language

  const vv = getVezVisionPrivilegedClient()
  const { data: existing } = await vv.from('vv_newsletter_campaigns').select('created_by').eq('id', id).single()
  if (existing && existing.created_by && existing.created_by !== auth.userId) {
    return { success: false, error: 'Brak uprawnień do edycji tej kampanii' }
  }

  const { data, error } = await vv
    .from('vv_newsletter_campaigns')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logError('newsletter.updateNewsletterCampaign', error)
    return { success: false, error: 'Błąd podczas aktualizacji kampanii' }
  }

  revalidatePath('/vezvision/newsletter/campaigns')
  revalidatePath(`/vezvision/newsletter/campaigns/${id}`)
  return { success: true, data: data as VVNewsletterCampaign }
}

export async function deleteNewsletterCampaign(id: string, csrfToken: string): Promise<ActionResult> {
  const guard = await guardVezVisionMutation({ action: 'newsletter.campaign.delete', csrfToken, maxRequests: 10, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const vv = getVezVisionPrivilegedClient()
  const { data: existing } = await vv.from('vv_newsletter_campaigns').select('created_by').eq('id', id).single()
  if (existing && existing.created_by && existing.created_by !== auth.userId) {
    return { success: false, error: 'Brak uprawnień do usunięcia tej kampanii' }
  }

  const { error } = await vv.from('vv_newsletter_campaigns').delete().eq('id', id)
  if (error) {
    logError('newsletter.deleteNewsletterCampaign', error)
    return { success: false, error: 'Błąd podczas usuwania kampanii' }
  }

  revalidatePath('/vezvision/newsletter/campaigns')
  return { success: true, data: undefined }
}

export async function sendNewsletterCampaign(
  campaignId: string,
  csrfToken: string
): Promise<ActionResult<{ sentCount: number; errorCount: number }>> {
  const guard = await guardVezVisionMutation({ action: 'newsletter.campaign.send', csrfToken, maxRequests: 5, windowMs: ONE_MINUTE })
  if (!guard.ok) return { success: false, error: guard.error }

  const auth = await requireVezVisionPermission(VEZVISION_PERMISSIONS.NEWSLETTER_MANAGE)
  if ('error' in auth) return { success: false, error: auth.error }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) return { success: false, error: 'Brak konfiguracji RESEND_API_KEY' }

  const vv = getVezVisionPrivilegedClient()
  const { data: campaign, error: campaignError } = await vv
    .from('vv_newsletter_campaigns')
    .select('id,subject,subject_en,content_html,content_html_en,status,segment_language,segment_tags')
    .eq('id', campaignId)
    .single()
  if (campaignError || !campaign) return { success: false, error: 'Kampania nie istnieje' }
  if (!['draft', 'scheduled', 'failed'].includes(campaign.status)) return { success: false, error: 'Kampania nie może zostać wysłana w tym stanie' }

  let subscribersQuery = vv
    .from('vv_newsletter_subscribers')
    .select('id,email,language,tags,token')
    .eq('is_active', true)
    .limit(1000)
  if (campaign.segment_language) subscribersQuery = subscribersQuery.eq('language', campaign.segment_language)
  if (campaign.segment_tags?.length) subscribersQuery = subscribersQuery.overlaps('tags', campaign.segment_tags)
  const { data: subscribers, error: subscribersError } = await subscribersQuery
  if (subscribersError) return { success: false, error: 'Nie udało się pobrać odbiorców' }

  const settingsResult = await getNewsletterSettings()
  if (!settingsResult.success) return { success: false, error: settingsResult.error }
  const settings = settingsResult.data
  const publicUrl = (process.env.VEZVISION_PUBLIC_URL ?? 'https://vezvision.vezlabs.dev').replace(/\/$/, '')

  await vv.from('vv_newsletter_campaigns').update({
    status: 'sending',
    recipient_count: subscribers?.length ?? 0,
    sent_count: 0,
  }).eq('id', campaignId)

  let sentCount = 0
  let errorCount = 0
  for (const subscriber of subscribers ?? []) {
    const language = subscriber.language === 'en' ? 'en' : 'pl'
    const subject = language === 'en' && campaign.subject_en ? campaign.subject_en : campaign.subject
    const content = language === 'en' && campaign.content_html_en ? campaign.content_html_en : campaign.content_html
    const unsubscribeUrl = `${publicUrl}/unsubscribe?token=${encodeURIComponent(subscriber.token)}`
    const html = generateEmailHtml(subject, content.replaceAll('{{UNSUBSCRIBE_URL}}', unsubscribeUrl), settings, unsubscribeUrl, language)

    let status = 'sent'
    let providerMessageId: string | null = null
    let errorMessage: string | null = null
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${settings.from_name} <${settings.from_email}>`,
          to: [subscriber.email],
          reply_to: settings.reply_to || undefined,
          subject,
          html,
        }),
        cache: 'no-store',
      })
      const responseBody = await response.json().catch(() => null) as { id?: string; message?: string } | null
      if (!response.ok) throw new Error(responseBody?.message || `Resend HTTP ${response.status}`)
      providerMessageId = responseBody?.id ?? null
      sentCount += 1
    } catch (error) {
      status = 'failed'
      errorMessage = error instanceof Error ? error.message.slice(0, 500) : 'Unknown send error'
      errorCount += 1
    }

    await vv.from('vv_newsletter_send_logs').insert({
      campaign_id: campaignId,
      subscriber_id: subscriber.id,
      subscriber_email: subscriber.email,
      status,
      provider: 'resend',
      provider_message_id: providerMessageId,
      error_message: errorMessage,
    })
  }

  await vv.from('vv_newsletter_campaigns').update({
    status: errorCount > 0 && sentCount === 0 ? 'failed' : 'sent',
    sent_count: sentCount,
    sent_at: new Date().toISOString(),
  }).eq('id', campaignId)

  revalidatePath('/vezvision/newsletter/campaigns')
  return { success: true, data: { sentCount, errorCount } }
}
