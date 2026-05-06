import { VVLocalizedLinkItem } from '@/lib/actions/vezvision/types'

export function cloneLink(link?: Partial<VVLocalizedLinkItem>): VVLocalizedLinkItem {
  return {
    id: link?.id ?? crypto.randomUUID(),
    href: link?.href ?? '',
    labelPl: link?.labelPl ?? '',
    labelEn: link?.labelEn ?? '',
    enabled: link?.enabled ?? true,
  }
}

export function stringifyJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}
