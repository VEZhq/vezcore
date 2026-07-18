import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = [
	'p', 'br', 'strong', 'em', 'u', 's', 'blockquote',
	'ul', 'ol', 'li', 'code', 'pre', 'a', 'h2', 'h3',
	'figure', 'figcaption', 'img', 'span',
]

const ALLOWED_ATTR = [
	'href', 'target', 'rel', 'src', 'alt', 'title',
	'style', 'data-vv-image-id',
]

function sanitizeStyleString(tag: string, raw: string): string {
	const declarations = raw.split(';').filter(Boolean)
	const safe: string[] = []

	for (const decl of declarations) {
		const colonIndex = decl.indexOf(':')
		if (colonIndex === -1) continue

		const property = decl.slice(0, colonIndex).trim().toLowerCase()
		const value = decl.slice(colonIndex + 1).trim()

		if (tag === 'figure' && property === 'text-align') {
			if (['left', 'center', 'right'].includes(value)) {
				safe.push(`${property}: ${value}`)
			}
		} else if (tag === 'span' && property === 'color') {
			if (/^#[0-9a-f]{3,8}$/i.test(value)) {
				safe.push(`${property}: ${value}`)
			}
		}
	}

	return safe.join('; ')
}

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
	const elementCtor = node.ownerDocument?.defaultView?.Element
	if (!elementCtor || !(node instanceof elementCtor)) return

	if (node.hasAttribute('style')) {
		const tag = node.tagName.toLowerCase()
		const raw = node.getAttribute('style') ?? ''
		const safe = sanitizeStyleString(tag, raw)
		if (safe) {
			node.setAttribute('style', safe)
		} else {
			node.removeAttribute('style')
		}
	}

	if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
		const existingRel = node.getAttribute('rel') ?? ''
		const relParts = new Set(existingRel.split(/\s+/).filter(Boolean))
		relParts.add('noopener')
		relParts.add('noreferrer')
		node.setAttribute('rel', [...relParts].join(' '))
	}
})

export function sanitizeVezVisionHtml(input: string): string {
	if (!input) return ''

	return DOMPurify.sanitize(input, {
		ALLOWED_TAGS,
		ALLOWED_ATTR,
		ALLOW_DATA_ATTR: false,
	}).replace(/\s+/g, ' ').trim()
}

export function sanitizeSearchTerm(input: string): string {
	return input
		.trim()
		.replace(/[,%()_\\]/g, ' ')
		.replace(/\s+/g, ' ')
		.slice(0, 80)
}

export function sanitizeSlug(slug: string): string {
	return slug
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
}

export function calcReadingTime(content: string): number {
	const plain = content.replace(/<[^>]+>/g, ' ')
	return Math.max(1, Math.round(plain.trim().split(/\s+/).length / 200))
}
