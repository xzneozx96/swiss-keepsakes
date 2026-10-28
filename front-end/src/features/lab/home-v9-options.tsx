/**
 * Lab, home V9: the open section options as data, so `/lab/home` lays them out. Every V9
 * section is decided (revision 9), so the list is empty. Shape kept for `/lab/home`.
 */
import type { Language } from '@/features/lab/home-data'

export interface V9OptionSet {
  id: 'routes' | 'food' | 'events'
  title: string
  chosen?: string
  options: {
    id: string
    title: string
    note: string
    recommended?: boolean
    Component: (props: { language: Language }) => React.ReactNode
  }[]
}

export const v9OptionSets: V9OptionSet[] = []
