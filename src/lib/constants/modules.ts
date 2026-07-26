import { Beaker, BriefcaseBusiness, Building2, Clapperboard, Globe, Layers3, Network, type LucideIcon } from 'lucide-react'

export type DashboardModuleName = 'vez' | 'vezVision' | 'vezLabs' | 'vezRent' | 'vezStudio' | 'vezWork' | 'nably'

export interface DashboardModuleDefinition {
  name: DashboardModuleName
  label: string
  description: string
  icon: LucideIcon
  color: 'emerald' | 'blue' | 'purple' | 'orange' | 'pink' | 'cyan'
  href?: string
}

export const DASHBOARD_MODULES: DashboardModuleDefinition[] = [
  { name: 'vez', label: 'VEZ', description: 'Główny ekosystem i centrum operacyjne', icon: Network, color: 'emerald' },
  { name: 'vezVision', label: 'VEZvision', description: 'Prywatny CMS dla Twojej firmy', icon: Globe, color: 'blue', href: '/vezvision' },
  { name: 'vezLabs', label: 'VEZlabs', description: 'Laboratorium nowych pomysłów', icon: Beaker, color: 'purple' },
  { name: 'vezRent', label: 'VEZrent', description: 'Najem, zasoby i operacje terenowe', icon: Building2, color: 'orange' },
  { name: 'vezStudio', label: 'VEZstudio', description: 'Studio kreacji i produkcji materiałów', icon: Clapperboard, color: 'pink' },
  { name: 'vezWork', label: 'VEZwork', description: 'Praca, zadania i procesy wewnętrzne', icon: BriefcaseBusiness, color: 'cyan' },
  { name: 'nably', label: 'Nably', description: 'Moduł usług i narzędzi partnerskich', icon: Layers3, color: 'emerald' },
] as const

export const DASHBOARD_MODULE_ICON_COLORS: Record<DashboardModuleDefinition['color'], { dark: string; light: string }> = {
  emerald: { dark: 'text-emerald-400', light: 'text-emerald-600' },
  blue: { dark: 'text-blue-400', light: 'text-blue-600' },
  purple: { dark: 'text-purple-400', light: 'text-purple-600' },
  orange: { dark: 'text-orange-400', light: 'text-orange-600' },
  pink: { dark: 'text-pink-400', light: 'text-pink-600' },
  cyan: { dark: 'text-cyan-400', light: 'text-cyan-600' },
}
