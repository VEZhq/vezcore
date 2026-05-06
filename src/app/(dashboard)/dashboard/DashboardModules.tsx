'use client'

import { useState } from 'react'
import Link from 'next/link'
import { EyeOff, Eye, Settings2 } from 'lucide-react'
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider'
import { DASHBOARD_MODULES, DASHBOARD_MODULE_ICON_COLORS } from '@/lib/constants/modules'

export function DashboardModules({ canAccessVezVision }: { canAccessVezVision: boolean }) {
  const { preferences, updatePreferences } = useUserPreferences()
  const [editMode, setEditMode] = useState(false)

  const toggleModule = (name: string) => {
    const next = preferences.hiddenModules.includes(name)
      ? preferences.hiddenModules.filter((m) => m !== name)
      : [...preferences.hiddenModules, name]
    updatePreferences({ hiddenModules: next })
  }

  const permissionFilteredModules = DASHBOARD_MODULES.filter((m) => m.name !== 'vezVision' || canAccessVezVision)

  const visibleModules = editMode
    ? permissionFilteredModules
    : permissionFilteredModules.filter((m) => !preferences.hiddenModules.includes(m.name))

  return (
    <div className="w-full max-w-5xl mb-8">
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setEditMode((v) => !v)}
          className={`flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] transition-colors duration-200 ${
            editMode
              ? 'text-emerald-400 light:text-emerald-600'
              : 'text-[#444444] light:text-[#888888] hover:text-[#888888] light:hover:text-[#555555]'
          }`}
        >
          <Settings2 className="h-3 w-3" />
          {editMode ? 'Zapisz' : 'Dostosuj'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleModules.map((mod) => {
          const isHidden = preferences.hiddenModules.includes(mod.name)

          const cardContent = (
            <div
              className={`relative tile-${mod.color} tile-hover group bg-[#111111]/80 light:bg-white/90 backdrop-blur-xl border border-white/[0.06] light:border-black/[0.08] p-6 transition-all duration-300 ${
                editMode ? 'cursor-default' : mod.href ? 'cursor-pointer' : 'cursor-default'
              } ${isHidden ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-md bg-white/[0.03] light:bg-black/[0.03] border border-white/[0.06] light:border-black/[0.06] flex items-center justify-center transition-colors duration-300">
                  <mod.icon
                    className={`h-6 w-6 ${DASHBOARD_MODULE_ICON_COLORS[mod.color].dark} light:${DASHBOARD_MODULE_ICON_COLORS[mod.color].light} transition-colors duration-300`}
                  />
                </div>

                {editMode && (
                  <button
                    onClick={() => toggleModule(mod.name)}
                    className={`p-1.5 rounded transition-colors duration-200 ${
                      isHidden
                        ? 'text-[#666666] hover:text-white light:text-[#aaaaaa] light:hover:text-black'
                        : 'text-[#444444] hover:text-red-400 light:text-[#888888] light:hover:text-red-500'
                    }`}
                    title={isHidden ? 'Pokaż kafelek' : 'Ukryj kafelek'}
                  >
                    {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                )}
              </div>

              <h3 className="text-base font-medium text-white light:text-black mb-1 transition-colors duration-300">
                {mod.name}
              </h3>
              <p className="text-xs text-[#666666] light:text-[#999999] transition-colors duration-300">
                {mod.description}
              </p>

              {editMode && isHidden && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[9px] uppercase tracking-[0.3em] text-[#555555] light:text-[#aaaaaa]">
                    Ukryty
                  </span>
                </div>
              )}
            </div>
          )

          return (
            <div key={mod.name}>
              {!editMode && mod.href ? (
                <Link href={mod.href} className="block">
                  {cardContent}
                </Link>
              ) : (
                cardContent
              )}
            </div>
          )
        })}

        {!editMode && visibleModules.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <p className="text-xs text-[#555555] light:text-[#aaaaaa] uppercase tracking-[0.25em] mb-3">
              Wszystkie moduły ukryte
            </p>
            <button
              onClick={() => setEditMode(true)}
              className="text-[10px] uppercase tracking-[0.25em] text-emerald-500 hover:text-emerald-400 transition-colors duration-200"
            >
              Przywróć widżety
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
