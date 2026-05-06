const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
const XSS_PATTERN = /<script|javascript:|on\w+=|data:text\/html|<iframe|<object|<embed|<form|expression\(|url\(|@import/i

interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email jest wymagany' }
  }

  const trimmed = email.trim()
  
  if (trimmed.length > 255) {
    return { valid: false, error: 'Email jest za długi' }
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Nieprawidłowy format email' }
  }

  const [, domain] = trimmed.split('@')
  if (!domain || domain.length > 253) {
    return { valid: false, error: 'Nieprawidłowa domena email' }
  }

  return { valid: true }
}

export function validatePassword(password: string): ValidationResult {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Hasło jest wymagane' }
  }

  if (password.length < 8) {
    return { valid: false, error: 'Hasło musi mieć minimum 8 znaków' }
  }

  if (password.length > 128) {
    return { valid: false, error: 'Hasło jest za długie' }
  }

  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

  const errors: string[] = []
  if (!hasUppercase) errors.push('wielką literę')
  if (!hasLowercase) errors.push('małą literę')
  if (!hasNumber) errors.push('cyfrę')
  if (!hasSpecial) errors.push('znak specjalny')

  if (errors.length > 0) {
    return { valid: false, error: `Hasło musi zawierać: ${errors.join(', ')}` }
  }

  if (XSS_PATTERN.test(password)) {
    return { valid: false, error: 'Hasło zawiera niedozwolone znaki' }
  }

  return { valid: true }
}

export function validateName(name: string | undefined | null): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { valid: true }
  }

  const trimmed = name.trim()

  if (trimmed.length > 100) {
    return { valid: false, error: 'Imię jest za długie' }
  }

  if (trimmed.length > 0 && trimmed.length < 2) {
    return { valid: false, error: 'Imię jest za krótkie' }
  }

  if (XSS_PATTERN.test(trimmed)) {
    return { valid: false, error: 'Imię zawiera niedozwolone znaki' }
  }

  return { valid: true }
}

export function sanitizeString(str: string): string {
  if (!str || typeof str !== 'string') {
    return ''
  }

  return str
    .trim()
    .replace(/[<>]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

export function validateUUID(str: string): ValidationResult {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  
  if (!str || typeof str !== 'string') {
    return { valid: false, error: 'UUID jest wymagane' }
  }

  if (!uuidRegex.test(str)) {
    return { valid: false, error: 'Nieprawidłowy format UUID' }
  }

  return { valid: true }
}
