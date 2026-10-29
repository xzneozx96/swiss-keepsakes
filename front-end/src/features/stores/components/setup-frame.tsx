import type { ReactNode } from 'react'

import { BrandMark } from '@/components/layout/brand-mark'

/**
 * The page of Open your store: a top bar with the shop's mark and the store's name, and no merchant menu, because
 * the menu shows from the moment the store opens and never before. The page's own heading is for screen readers;
 * the step names the screen.
 */
export function SetupFrame({ title, storeName, children }: { title: string, storeName?: string, children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-default/60">
      <header className="flex h-14 items-center justify-between gap-3 border-b border-separator bg-surface px-4 lg:px-8">
        <span className="flex items-center gap-2">
          <BrandMark />
          <span className="font-serif text-lg font-semibold">Swiss Keepsakes</span>
        </span>
        {storeName && <span className="min-w-0 truncate text-sm text-muted">{storeName}</span>}
      </header>
      <main className="flex flex-1 flex-col">
        <h1 className="sr-only">{title}</h1>
        {children}
      </main>
    </div>
  )
}
