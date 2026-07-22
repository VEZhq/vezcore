import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  getVezVisionPlainText,
  hasMeaningfulVezVisionHtml,
  sanitizeSearchTerm,
  sanitizeVezVisionHtml,
} from '../src/lib/vezvision-security-utils.ts'

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function testHtmlSanitizer(): void {
  const payload = `<p onclick="alert(1)">safe</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="javascript:alert(2)" onerror="x" />`
  const sanitized = sanitizeVezVisionHtml(payload)

  assert(!sanitized.includes('<script'), 'Sanitizer failed: script tag remains')
  assert(!sanitized.includes('onclick='), 'Sanitizer failed: event handler remains')
  assert(!sanitized.toLowerCase().includes('javascript:'), 'Sanitizer failed: javascript protocol remains')
  assert(sanitized.includes('<p>safe</p>'), 'Sanitizer failed: safe paragraph removed')
}

function testSearchSanitizer(): void {
  const raw = '  ,%abc())   test   '
  const sanitized = sanitizeSearchTerm(raw)

  assert(!sanitized.includes(','), 'Search sanitizer failed: comma remains')
  assert(!sanitized.includes('%'), 'Search sanitizer failed: percent remains')
  assert(!sanitized.includes('(') && !sanitized.includes(')'), 'Search sanitizer failed: parentheses remain')
  assert(sanitized.length <= 80, 'Search sanitizer failed: exceeds max length')
}

function testPlainTextExtraction(): void {
  assert(
    getVezVisionPlainText('<p>Hello <strong>world</strong></p><script>alert(1)</script>') === 'Hello world',
    'Plain-text extraction must keep text and remove executable markup'
  )
  assert(!hasMeaningfulVezVisionHtml('<p><br></p>'), 'Empty editor markup must not count as content')
  assert(hasMeaningfulVezVisionHtml('<p>Treść</p>'), 'Visible editor text must count as content')
}

function testGuardPresence(): void {
  const root = process.cwd()
  const files = [
    'src/lib/actions/vezvision/blog.ts',
    'src/lib/actions/vezvision/portfolio.ts',
    'src/lib/actions/vezvision/services.ts',
    'src/lib/actions/vezvision/upload.ts',
    'src/lib/actions/vezvision/files.ts',
  ]

  for (const relative of files) {
    const content = readFileSync(join(root, relative), 'utf-8')
    assert(
      content.includes('guardVezVisionMutation('),
      `Security guard missing in ${relative}`
    )
  }
}

function testFilesUploadRouteHardening(): void {
  const root = process.cwd()
  const content = readFileSync(join(root, 'src/app/api/vezvision/upload-image/route.ts'), 'utf-8')

  assert(content.includes('sanitizeUploadPath('), 'Files upload hardening missing: sanitizeUploadPath helper not found')
  assert(content.includes("reportApiFailure('Rejected invalid upload path'"), 'Files upload hardening missing: invalid path monitoring not found')
}

function testFilesAclGuardPresence(): void {
  const root = process.cwd()
  const content = readFileSync(join(root, 'src/lib/actions/vezvision/files-acl.ts'), 'utf-8')

  assert(content.includes("action: 'files.folder.acl.upsert'"), 'ACL hardening missing: upsert guard action not found')
  assert(content.includes("action: 'files.folder.acl.remove'"), 'ACL hardening missing: remove guard action not found')
}

function testDashboardPageGuardsBeforeStats(): void {
  const root = process.cwd()
  const content = readFileSync(join(root, 'src/app/(dashboard)/dashboard/page.tsx'), 'utf-8')
  const guardPosition = content.indexOf('getAuthenticatedUserPermissionState()')
  const statsPosition = content.indexOf('getDashboardStats(')

  assert(guardPosition >= 0, 'Dashboard hardening missing: page-level auth guard not found')
  assert(statsPosition >= 0, 'Dashboard hardening check invalid: stats query not found')
  assert(guardPosition < statsPosition, 'Dashboard auth guard must run before querying stats')
}

function run(): void {
  testHtmlSanitizer()
  testSearchSanitizer()
  testPlainTextExtraction()
  testGuardPresence()
  testFilesUploadRouteHardening()
  testFilesAclGuardPresence()
  testDashboardPageGuardsBeforeStats()
  console.log('security-hardening-checks: OK')
}

run()
