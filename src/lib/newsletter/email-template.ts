import type { NewsletterSettings } from '@/lib/actions/vezvision/newsletter/settings'

export type CampaignLanguage = 'pl' | 'en'

export const DEFAULT_UNSUBSCRIBE_URL = 'https://vezvision.com/unsubscribe?token={{TOKEN}}'
const VEZVISION_ASSET_URL = process.env.VEZVISION_PUBLIC_URL ?? 'https://vezvision.vezlabs.dev'

const defaultSettings: NewsletterSettings = {
  brand_name: 'VezVision',
  logo_url: `${VEZVISION_ASSET_URL}/logo-navbar.svg`,
  primary_color: '#04070d',
  background_color: '#f3f4f6',
  surface_color: '#ffffff',
  text_color: '#0f0f0f',
  footer_text: null,
  from_name: 'VezVision',
  from_email: 'newsletter@vezvision.com',
  reply_to: null,
}

const copyPl = {
  cta: 'Sprawdź nowości',
  tagline: 'Tworzymy cyfrowe doświadczenia, które inspirują.',
  privacy: 'Polityka prywatności',
  terms: 'Regulamin',
  rights: 'Wszystkie prawa zastrzeżone.',
  unsubscribe: 'Wypisz się z newslettera',
}

const copyEn = {
  cta: 'Explore updates',
  tagline: 'We create digital experiences that inspire.',
  privacy: 'Privacy Policy',
  terms: 'Terms',
  rights: 'All rights reserved.',
  unsubscribe: 'Unsubscribe from the newsletter',
}

export function generateEmailHtml(
  subject: string,
  content: string,
  settings: NewsletterSettings | null,
  unsubscribeUrl: string,
  language: CampaignLanguage
): string {
  const s = settings ?? defaultSettings
  const copy = language === 'en' ? copyEn : copyPl
  const logoUrl = s.logo_url || defaultSettings.logo_url!
  const year = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:${s.background_color};font-family:Inter,system-ui,-apple-system,sans-serif;color:${s.text_color};-webkit-font-smoothing:antialiased;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${s.background_color};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <a href="https://vezvision.com" style="display:inline-block;margin-bottom:24px;text-decoration:none;">
          <img src="${logoUrl}" alt="${s.brand_name}" height="28" style="display:block;height:28px;width:auto;" />
        </a>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:${s.surface_color};border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:20px 32px 0 32px;">
              <span style="display:inline-block;font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#6b7280;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:9999px;padding:4px 12px;">Newsletter</span>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0 32px;">
              <h1 style="margin:0;font-size:26px;line-height:1.2;color:${s.text_color};font-weight:700;letter-spacing:-0.02em;">${subject}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0 32px;">
              <div style="border-top:1px solid #e5e7eb;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;color:${s.text_color};font-size:15px;line-height:1.7;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px 32px;text-align:left;">
              <a href="https://vezvision.com" style="display:inline-block;background:${s.primary_color};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">${copy.cta}</a>
            </td>
          </tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin-top:24px;">
          <tr>
            <td align="center" style="padding:0 0 16px 0;">
              <a href="https://x.com/vezvision" style="display:inline-block;margin:0 6px;padding:8px;border:1px solid #e5e7eb;border-radius:6px;text-decoration:none;" target="_blank">
                <span style="font:600 12px/16px Arial,sans-serif;color:#111827;">X</span>
              </a>
              <a href="https://instagram.com/vezvision" style="display:inline-block;margin:0 6px;padding:8px;border:1px solid #e5e7eb;border-radius:6px;text-decoration:none;" target="_blank">
                <span style="font:600 11px/16px Arial,sans-serif;color:#111827;">IG</span>
              </a>
              <a href="https://linkedin.com/company/vezvision" style="display:inline-block;margin:0 6px;padding:8px;border:1px solid #e5e7eb;border-radius:6px;text-decoration:none;" target="_blank">
                <span style="font:600 11px/16px Arial,sans-serif;color:#111827;">in</span>
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 0 16px 0;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">${copy.tagline}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 0 8px 0;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                <a href="https://vezvision.com/privacy" style="color:#6b7280;text-decoration:underline;">${copy.privacy}</a>
                &nbsp;&bull;&nbsp;
                <a href="https://vezvision.com/terms" style="color:#6b7280;text-decoration:underline;">${copy.terms}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0;">
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
                ${s.brand_name} &copy; ${year}. ${copy.rights}<br/>
                <a href="${unsubscribeUrl}" style="color:#04070d;text-decoration:underline;font-weight:500;">${copy.unsubscribe}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
