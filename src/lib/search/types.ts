export interface SearchResult {
  type: 'user' | 'log' | 'navigation'
  id: string
  title: string
  subtitle: string
  href: string
}
