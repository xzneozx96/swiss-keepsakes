import type { ReactNode } from 'react'

import { BrandMark } from '@/components/layout/brand-mark'

/**
 * The page of Open your store: a top bar with the shop's mark and the store's name, and no merchant menu, because
 * the menu shows from the moment the store opens and never before. With `showTitle` the page's heading is drawn
 * above the steps, on the plain page background with the page width and padding of the merchant shell's content;
 * without it the heading is for screen readers and the content (the opened message) sets its own layout.
 */
export function SetupFrame({ title, storeName, showTitle = false, children }: { title: string, storeName?: string, showTitle?: boolean, children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="flex h-14 items-center justify-between gap-3 border-b border-separator bg-surface px-4 lg:px-8">
        <span className="flex items-center gap-2">
          <BrandMark />
          <span className="font-serif text-lg font-semibold">Swiss Keepsakes</span>
        </span>
        {storeName && <span className="min-w-0 truncate text-sm text-muted">{storeName}</span>}
      </header>
      <main className="flex flex-1 flex-col">
        {showTitle
          ? (
              <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-5 px-4 pt-4 pb-6 lg:px-8 lg:pt-8 lg:pb-8">
                <h1 className="min-w-0 text-title text-pretty">{title}</h1>
                {children}
              </div>
            )
          : (
              <>
                <h1 className="sr-only">{title}</h1>
                {children}
              </>
            )}
      </main>
    </div>
  )
}
