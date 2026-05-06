import {
  File,
  FileArchive,
  FileImage,
  FileText,
} from 'lucide-react'
import type { VVFile, VVFolder } from '@/lib/actions/vezvision/types'

export interface FolderTreeNode {
  folder: VVFolder
  children: FolderTreeNode[]
}

export interface DragItemState {
  type: 'file' | 'folder'
  id: string
}

export const ROOT_FOLDER_ID = '00000000-0000-0000-0000-000000000001'

export const inputCls =
  'h-9 w-full rounded-[4px] border border-[#e7e8ee] bg-[#fbfbfc] px-3 text-[13px] text-[#111111] placeholder:text-[#9ca3af] outline-none transition-colors focus:border-[#d7d9e2] focus:bg-white'
export const mutedLabelCls = 'text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b9098]'
export const subtleBtnCls =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-[4px] border border-[#e7e8ee] bg-white px-3 text-[11px] text-[#656b76] transition-colors hover:border-[#d7d9e2] hover:text-[#111111] disabled:opacity-50'
export const primaryBtnCls =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-[4px] bg-[#111111] px-3 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-[#262626] disabled:opacity-50'
export const dangerBtnCls =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-[4px] border border-red-200 bg-red-50 px-3 text-[11px] text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50'

export function normalizeFolderPath(path: string | null | undefined): string {
  if (!path) return '/'
  if (path === '/root') return '/'
  if (path.startsWith('/root/')) return path.slice('/root'.length)
  return path
}

export function isRootFolder(folder: VVFolder): boolean {
  return folder.parent_id === null && normalizeFolderPath(folder.full_path) === '/'
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

export function updateSearchParams(currentParams: URLSearchParams, patch: Record<string, string | null | undefined>): string {
  const next = new URLSearchParams(currentParams)
  Object.entries(patch).forEach(([key, value]) => {
    if (!value) {
      next.delete(key)
      return
    }
    next.set(key, value)
  })

  const query = next.toString()
  return query ? `?${query}` : ''
}

export function buildFolderTree(allFolders: VVFolder[]): FolderTreeNode[] {
  const childrenMap = new Map<string, VVFolder[]>()

  for (const folder of allFolders) {
    const parentId = folder.parent_id ?? 'root'
    const current = childrenMap.get(parentId) ?? []
    current.push(folder)
    childrenMap.set(parentId, current)
  }

  const build = (parentId: string): FolderTreeNode[] => {
    const items = [...(childrenMap.get(parentId) ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pl'))
    return items.map((folder) => ({ folder, children: build(folder.id) }))
  }

  return build(ROOT_FOLDER_ID)
}

export function canPreviewFile(file: VVFile): boolean {
  return file.mime_type.startsWith('image/') || file.mime_type === 'application/pdf' || file.mime_type.startsWith('text/')
}

export function getFileIcon(file: VVFile) {
  if (file.mime_type.startsWith('image/')) return FileImage
  if (file.mime_type.startsWith('text/') || file.mime_type === 'application/pdf' || file.mime_type.includes('json')) return FileText
  if (file.mime_type.includes('zip') || file.mime_type.includes('officedocument')) return FileArchive
  return File
}
