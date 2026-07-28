import { Beaker, BriefcaseBusiness, Building2, Clapperboard, Globe, Layers3, Network, type LucideIcon } from 'lucide-react'

export type DashboardModuleName = 'vez' | 'vezVision' | 'vezLabs' | 'vezRent' | 'vezStudio' | 'vezWork' | 'nably'

export interface DashboardModuleDefinition {
  name: DashboardModuleName
  label: string
  description: string
  icon: LucideIcon
  color: 'sage' | 'sand' | 'mauve' | 'peach' | 'rose' | 'mint' | 'linen'
  href?: string
}

export const DASHBOARD_MODULES: DashboardModuleDefinition[] = [
  { name: 'vez', label: 'VEZ', description: 'Główny ekosystem i centrum operacyjne', icon: Network, color: 'sage' },
  { name: 'vezVision', label: 'VEZvision', description: 'Prywatny CMS dla Twojej firmy', icon: Globe, color: 'sand', href: '/vezvision' },
  { name: 'vezLabs', label: 'VEZlabs', description: 'Laboratorium nowych pomysłów', icon: Beaker, color: 'mauve' },
  { name: 'vezRent', label: 'VEZrent', description: 'Najem, zasoby i operacje terenowe', icon: Building2, color: 'peach' },
  { name: 'vezStudio', label: 'VEZstudio', description: 'Studio kreacji i produkcji materiałów', icon: Clapperboard, color: 'rose' },
  { name: 'vezWork', label: 'VEZwork', description: 'Praca, zadania i procesy wewnętrzne', icon: BriefcaseBusiness, color: 'mint' },
  { name: 'nably', label: 'Nably', description: 'Moduł usług i narzędzi partnerskich', icon: Layers3, color: 'linen' },
] as const

export const DASHBOARD_MODULE_ICON_COLORS: Record<DashboardModuleDefinition['color'], { dark: string; light: string }> = {
  sage: { dark: 'text-[#bdd9c6]', light: 'light:text-[#52705b]' },
  sand: { dark: 'text-[#ead4b7]', light: 'light:text-[#7d5a38]' },
  mauve: { dark: 'text-[#d7bfd8]', light: 'light:text-[#735671]' },
  peach: { dark: 'text-[#ecc8a6]', light: 'light:text-[#8a5a32]' },
  rose: { dark: 'text-[#e8bfd0]', light: 'light:text-[#84576a]' },
  mint: { dark: 'text-[#c9d8c5]', light: 'light:text-[#5f7358]' },
  linen: { dark: 'text-[#e6dcc9]', light: 'light:text-[#6f6250]' },
}

export const DASHBOARD_MODULE_CARD_COLORS: Record<DashboardModuleDefinition['color'], {
  title: string
  description: string
  iconBox: string
  accent: string
}> = {
  sage: {
    title: 'text-[#d7eadc] light:text-[#3f5f49]',
    description: 'text-[#a9bcae] light:text-[#637265]',
    iconBox: 'border-[#bdd9c6]/[0.18] bg-[#bdd9c6]/[0.07] light:border-[#52705b]/[0.18] light:bg-[#52705b]/[0.07]',
    accent: 'bg-[#bdd9c6]',
  },
  sand: {
    title: 'text-[#f0dabe] light:text-[#6e4d2c]',
    description: 'text-[#c7b49a] light:text-[#776756]',
    iconBox: 'border-[#ead4b7]/[0.20] bg-[#ead4b7]/[0.08] light:border-[#7d5a38]/[0.18] light:bg-[#7d5a38]/[0.07]',
    accent: 'bg-[#ead4b7]',
  },
  mauve: {
    title: 'text-[#ead4ea] light:text-[#654865]',
    description: 'text-[#c2abc3] light:text-[#716173]',
    iconBox: 'border-[#d7bfd8]/[0.18] bg-[#d7bfd8]/[0.07] light:border-[#735671]/[0.18] light:bg-[#735671]/[0.07]',
    accent: 'bg-[#d7bfd8]',
  },
  peach: {
    title: 'text-[#f1d0b1] light:text-[#744a26]',
    description: 'text-[#c8ad93] light:text-[#776252]',
    iconBox: 'border-[#ecc8a6]/[0.20] bg-[#ecc8a6]/[0.08] light:border-[#8a5a32]/[0.18] light:bg-[#8a5a32]/[0.07]',
    accent: 'bg-[#ecc8a6]',
  },
  rose: {
    title: 'text-[#edcedb] light:text-[#74485c]',
    description: 'text-[#c9aeb9] light:text-[#755f68]',
    iconBox: 'border-[#e8bfd0]/[0.18] bg-[#e8bfd0]/[0.07] light:border-[#84576a]/[0.18] light:bg-[#84576a]/[0.07]',
    accent: 'bg-[#e8bfd0]',
  },
  mint: {
    title: 'text-[#d9ead4] light:text-[#50694a]',
    description: 'text-[#b5c3b1] light:text-[#647160]',
    iconBox: 'border-[#c9d8c5]/[0.18] bg-[#c9d8c5]/[0.07] light:border-[#5f7358]/[0.18] light:bg-[#5f7358]/[0.07]',
    accent: 'bg-[#c9d8c5]',
  },
  linen: {
    title: 'text-[#eee2d0] light:text-[#655947]',
    description: 'text-[#c9bdac] light:text-[#746b5e]',
    iconBox: 'border-[#e6dcc9]/[0.18] bg-[#e6dcc9]/[0.07] light:border-[#6f6250]/[0.18] light:bg-[#6f6250]/[0.07]',
    accent: 'bg-[#e6dcc9]',
  },
}
