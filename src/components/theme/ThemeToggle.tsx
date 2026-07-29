'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex h-8 w-8 items-center justify-center rounded-[8px] border border-black/[0.07] bg-white/75 text-[#69706e] transition-colors hover:bg-white hover:text-[#202020] dark:border-white/[0.09] dark:bg-white/[0.05] dark:text-[#a7adaa] dark:hover:bg-white/[0.09] dark:hover:text-white ${className}`}
      aria-label={isDark ? 'Włącz jasny motyw' : 'Włącz czarny motyw'}
      title={isDark ? 'Jasny motyw' : 'Czarny motyw'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
