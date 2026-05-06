import { Beaker, Brain, Globe, Home, Mic2, Users, type LucideIcon } from 'lucide-react'

export type DashboardModuleName = 'vezVision' | 'vezCRM' | 'vezBrain' | 'vezAI' | 'vezHome' | 'vezLab'

export interface DashboardModuleDefinition {
  name: DashboardModuleName
  description: string
  icon: LucideIcon
  color: 'emerald' | 'blue' | 'purple' | 'orange' | 'pink' | 'cyan'
  href?: string
}

export const DASHBOARD_MODULES: DashboardModuleDefinition[] = [
  { name: 'vezVision', description: 'Prywatny CMS dla Twojej firmy', icon: Globe, color: 'emerald', href: '/vezvision' },
  { name: 'vezCRM', description: 'System CRM dla klientów', icon: Users, color: 'blue' },
  { name: 'vezBrain', description: 'Silnik AI agentów', icon: Brain, color: 'purple' },
  { name: 'vezAI', description: 'Twój personalny asystent', icon: Mic2, color: 'orange' },
  { name: 'vezHome', description: 'Smart home dashboard', icon: Home, color: 'pink' },
  { name: 'vezLab', description: 'Laboratorium nowych pomysłów', icon: Beaker, color: 'cyan' },
] as const

export const DASHBOARD_MODULE_ICON_COLORS: Record<DashboardModuleDefinition['color'], { dark: string; light: string }> = {
  emerald: { dark: 'text-emerald-400', light: 'text-emerald-600' },
  blue: { dark: 'text-blue-400', light: 'text-blue-600' },
  purple: { dark: 'text-purple-400', light: 'text-purple-600' },
  orange: { dark: 'text-orange-400', light: 'text-orange-600' },
  pink: { dark: 'text-pink-400', light: 'text-pink-600' },
  cyan: { dark: 'text-cyan-400', light: 'text-cyan-600' },
}
