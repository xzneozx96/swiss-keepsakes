import type { Category } from './types'

/**
 * The two product categories (PRD §7.0), in the order the guest rail shows them. Fixed:
 * no merchant screen edits them. Stays and experiences were dropped from the plan on
 * 16.10.2026.
 */
export const categories: Category[] = [
  {
    id: 'keepsakes',
    name: { en: 'Keepsakes', de: 'Andenken' },
    photo: 'gift-box',
  },
  {
    id: 'tours',
    name: { en: 'Tours', de: 'Touren' },
    photo: 'lucerne-old-town',
  },
]
