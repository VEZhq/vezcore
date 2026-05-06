export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function calcReadingTime(content: string): number {
  const plain = content.replace(/<[^>]+>/g, ' ')
  return Math.max(1, Math.round(plain.trim().split(/\s+/).length / 200))
}

function hasHtmlMarkup(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content)
}

import { sanitizeVezVisionHtml } from '@/lib/vezvision-security-utils'

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
