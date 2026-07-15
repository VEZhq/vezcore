import { sanitizeSlug, calcReadingTime, sanitizeVezVisionHtml } from '@/lib/vezvision-security-utils'

export const slugify = sanitizeSlug

export { calcReadingTime }

function hasHtmlMarkup(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content)
}

export function normalizeEditorHtml(content: string): string {
  return sanitizeVezVisionHtml(content).replace(/\s+/g, ' ').trim()
}

export function normalizeLegacyContent(content: string): string {
  if (!content.trim()) return ''
  if (hasHtmlMarkup(content)) return content

  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return escaped
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return '<p><br /></p>'
      if (trimmed.startsWith('### ')) return `<h3>${trimmed.slice(4)}</h3>`
      if (trimmed.startsWith('## ')) return `<h2>${trimmed.slice(3)}</h2>`
      if (trimmed.startsWith('> ')) return `<blockquote>${trimmed.slice(2)}</blockquote>`
      if (trimmed.startsWith('- ')) return `<li>${trimmed.slice(2)}</li>`
      if (/^\d+\.\s/.test(trimmed)) return `<li>${trimmed.replace(/^\d+\.\s/, '')}</li>`
      return `<p>${trimmed}</p>`
    })
    .join('')
    .replace(/(<li>[\s\S]*?<\/li>)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}
