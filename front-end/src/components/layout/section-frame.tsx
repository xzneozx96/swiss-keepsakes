import type { ReactNode } from 'react'
import type { SECTION_PAGES } from '@/components/layout/section-pages'

import { useNavigate } from '@tanstack/react-router'

import { SECTION_PAGES as PAGES } from '@/components/layout/section-pages'
import { PageTabs, TabPanel } from '@/components/page-tabs'
import { useLocale } from '@/contexts/locale-context'

type Section = keyof typeof SECTION_PAGES

/** Inquiries is one sidebar entry, so its pages stay tabs from 1024px as well. */
const TABS_ON_DESKTOP: readonly Section[] = ['requests']

/**
 * A section page with sub-pages (owner review 15.10.2026): on phones the section's pages as
 * underline tabs (from 1024px the sidebar lists them), then the page. A page without its own
 * visible title (the analytics pages) gets a hidden one.
 */
export function SectionFrame({
  section,
  page,
  title,
  hasOwnTitle = false,
  children,
}: {
  section: Section
  page: string
  /** The section's name, for the tabs' label and the hidden title. */
  title: string
  hasOwnTitle?: boolean
  children: ReactNode
}) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const pages: readonly { id: string, to: string, label: string }[]
    = PAGES[section]
  const label = (p: (typeof pages)[number]) =>
    t(p.label as Parameters<typeof t>[0])
  const current = pages.find(p => p.id === page) ?? pages[0]

  return (
    <div className="flex flex-col gap-6">
      {!hasOwnTitle && (
        <h1 className="sr-only">
          {title}: {label(current)}
        </h1>
      )}
      <PageTabs
        equal
        className={TABS_ON_DESKTOP.includes(section) ? undefined : 'lg:hidden'}
        dense={pages.length > 3}
        label={t('sectionPages.label', { section: title })}
        selected={page}
        tabs={pages.map(p => ({ id: p.id, label: label(p) }))}
        onSelect={id =>
          void navigate({
            to: (pages.find(p => p.id === id) ?? pages[0]).to as never,
          })}
      >
        <TabPanel className="pt-2 lg:pt-0" id={page}>
          {children}
        </TabPanel>
      </PageTabs>
    </div>
  )
}
