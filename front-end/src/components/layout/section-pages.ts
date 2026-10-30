import type { LinkProps } from '@tanstack/react-router'
import type { MessageKey } from '@/i18n/en'

/** A page listed under its section in the sidebar, and as a tab on phones. */
export interface SectionPage {
  id: string
  to: LinkProps['to']
  label: MessageKey
}

/**
 * The sections with sub-pages (owner review 15.10.2026): a list page and Analytics, or the
 * four Reports pages. Phones show them as tabs; the sidebar groups them (merchant-shell.tsx),
 * and Inquiries keeps them as tabs on desktop too.
 */
export const SECTION_PAGES = {
  partners: [
    { id: 'partners', to: '/store/partners', label: 'sectionPages.partners' },
    {
      id: 'analytics',
      to: '/store/partners/analytics',
      label: 'sectionPages.analytics',
    },
  ],
  content: [
    {
      id: 'articles',
      to: '/store/content',
      label: 'merchantContent.tab.articles',
    },
    {
      id: 'places',
      to: '/store/content/places',
      label: 'merchantContent.tab.places',
    },
    {
      id: 'comments',
      to: '/store/content/comments',
      label: 'merchantContent.tab.comments',
    },
    {
      id: 'reviews',
      to: '/store/content/reviews',
      label: 'merchantContent.tab.reviews',
    },
    {
      id: 'categories',
      to: '/store/content/categories',
      label: 'merchantContent.tab.categories',
    },
    {
      id: 'media',
      to: '/store/content/media',
      label: 'merchantContent.tab.media',
    },
    {
      id: 'analytics',
      to: '/store/content/analytics',
      label: 'sectionPages.analytics',
    },
  ],
  requests: [
    {
      id: 'advice',
      to: '/store/requests',
      label: 'merchantRequests.tab.advice',
    },
    {
      id: 'questions',
      to: '/store/requests/questions',
      label: 'merchantRequests.tab.questions',
    },
    {
      id: 'analytics',
      to: '/store/requests/analytics',
      label: 'sectionPages.analytics',
    },
  ],
  reports: [
    { id: 'money', to: '/store/reports', label: 'sectionPages.money' },
    { id: 'sales', to: '/store/reports/sales', label: 'sectionPages.sales' },
    { id: 'guests', to: '/store/reports/guests', label: 'sectionPages.guests' },
    { id: 'margin', to: '/store/reports/margin', label: 'sectionPages.margin' },
  ],
} as const satisfies Record<string, readonly SectionPage[]>

export type ReportPageId = (typeof SECTION_PAGES.reports)[number]['id']
