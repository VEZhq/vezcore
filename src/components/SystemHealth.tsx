'use client'

import { useState } from 'react'
import {
  Activity,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  FlaskConical,
  Server,
} from 'lucide-react'

type AccessGroup = {
  name: string
  icon: typeof Server
  color: 'emerald' | 'blue' | 'cyan'
  description: string
  items: Array<{
    label: string
    href: string
    alias: string
  }>
}

const accessGroups: AccessGroup[] = [
  {
    name: 'Hetzner',
    icon: Server,
    color: 'emerald',
    description: 'Produkcja, API i tunel bazy',
    items: [
      { label: 'Hetzner Cloud', href: 'https://console.hetzner.cloud/projects', alias: 'ssh vez-prod' },
      { label: 'VEZvision', href: 'https://vezvision.com', alias: 'ssh vez-prod' },
      { label: 'API health', href: 'https://api.vezvision.com/healthz', alias: 'ssh vez-prod' },
      { label: 'DB tunnel', href: 'https://api.vezvision.com/healthz', alias: 'ssh -N vezvision-db-tunnel' },
    ],
  },
  {
    name: 'Labs',
    icon: FlaskConical,
    color: 'blue',
    description: 'VEZlabs, Proxmox i Coolify',
    items: [
      { label: 'VEZcore', href: 'https://vezcore.vezlabs.dev', alias: 'ssh vezlabs-coolify' },
      { label: 'VEZcore test', href: 'https://vezcoretest.vezlabs.dev', alias: 'ssh vezlabs-coolify' },
      { label: 'Proxmox', href: 'https://10.77.40.2:8006/', alias: 'ssh vezlabs-pve' },
      { label: 'Coolify', href: 'https://10.77.30.35:8000/', alias: 'ssh vezlabs-coolify' },
      { label: 'Router', href: 'https://192.168.2.1/', alias: 'ssh vezlabs-router' },
    ],
  },
  {
    name: 'Monitor',
    icon: Activity,
    color: 'cyan',
    description: 'Monitoring i healthchecki',
    items: [
      { label: 'Monitor', href: 'https://monitor.vezlabs.dev', alias: 'ssh vezlabs-coolify' },
      { label: 'Lab API health', href: 'https://api.vezlabs.dev/healthz', alias: 'ssh vezlabs-coolify' },
      { label: 'Prod API health', href: 'https://api.vezvision.com/healthz', alias: 'ssh vez-prod' },
    ],
  },
]

const colorClasses: Record<AccessGroup['color'], { text: string; border: string; bg: string }> = {
  emerald: {
    text: 'text-emerald-400 light:text-emerald-600',
    border: 'hover:border-emerald-400/30 light:hover:border-emerald-600/25',
    bg: 'hover:bg-emerald-500/[0.04]',
  },
  blue: {
    text: 'text-blue-400 light:text-blue-600',
    border: 'hover:border-blue-400/30 light:hover:border-blue-600/25',
    bg: 'hover:bg-blue-500/[0.04]',
  },
  cyan: {
    text: 'text-cyan-400 light:text-cyan-600',
    border: 'hover:border-cyan-400/30 light:hover:border-cyan-600/25',
    bg: 'hover:bg-cyan-500/[0.04]',
  },
}

export function SystemHealth() {
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [revealedAliases, setRevealedAliases] = useState<string[]>([])
  const [copiedAlias, setCopiedAlias] = useState<string | null>(null)

  async function handleAliasClick(key: string, alias: string) {
    if (!revealedAliases.includes(key)) {
      setRevealedAliases((current) => [...current, key])
      return
    }

    await navigator.clipboard.writeText(alias)
    setCopiedAlias(key)
    window.setTimeout(() => setCopiedAlias(null), 1400)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {accessGroups.map((group) => {
        const isOpen = openGroup === group.name
        const Icon = group.icon
        const colors = colorClasses[group.color]

        return (
        <div
          key={group.name}
          className={`border border-white/[0.06] light:border-black/[0.06] bg-[#0a0a0a]/70 light:bg-white/90 backdrop-blur-xl transition-all duration-300 ${colors.border} ${colors.bg}`}
        >
          <button
            type="button"
            onClick={() => setOpenGroup(isOpen ? null : group.name)}
            className="flex w-full items-center justify-between gap-4 p-4 text-left"
            aria-expanded={isOpen}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/[0.06] light:border-black/[0.06] bg-white/[0.03] light:bg-black/[0.03]">
                <Icon className={`h-5 w-5 ${colors.text}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white light:text-black">{group.name}</p>
                <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.18em] text-[#555555] light:text-[#999999]">
                  {group.description}
                </p>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 shrink-0 text-[#555555] light:text-[#999999] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="border-t border-white/[0.06] light:border-black/[0.06] p-3">
              <div className="space-y-2">
                {group.items.map((item) => {
                  const itemKey = `${group.name}-${item.label}`
                  const isRevealed = revealedAliases.includes(itemKey)
                  const isCopied = copiedAlias === itemKey

                  return (
                    <div
                      key={`${group.name}-${item.label}`}
                      className="flex flex-col gap-2 border border-white/[0.04] light:border-black/[0.04] bg-white/[0.02] light:bg-black/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-w-0 items-center gap-2 text-xs text-white light:text-black hover:text-emerald-400 light:hover:text-emerald-600 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleAliasClick(itemKey, item.alias)}
                        className="group/alias inline-flex h-8 items-center justify-center gap-2 rounded-md border border-white/[0.06] light:border-black/[0.08] bg-[#050505]/80 light:bg-white px-3 font-mono text-[11px] text-[#777777] light:text-[#777777] hover:text-white light:hover:text-black transition-colors"
                        title={isRevealed ? 'Kliknij, aby skopiować alias SSH' : 'Najedź lub kliknij, aby odsłonić alias SSH'}
                      >
                        {isCopied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400 light:text-emerald-600" />
                        ) : isRevealed ? (
                          <Copy className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                        <span className={isRevealed ? '' : 'group-hover/alias:hidden'}>ssh •••••••</span>
                        <span className={isRevealed ? '' : 'hidden group-hover/alias:inline'}>{item.alias}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        )
      })}
    </div>
  )
}
