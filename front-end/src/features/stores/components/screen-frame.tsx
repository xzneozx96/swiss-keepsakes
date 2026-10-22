import type { ReactNode } from 'react'

/** The plain page of A01 and A02: no shop navigation, because the Super Admin and an invited Owner have no store to navigate yet. */
export function ScreenFrame({ title, intro, children }: { title: string, intro?: string, children: ReactNode }) {
  return (
    <main className="flex flex-1 justify-center bg-default/60 lg:bg-background">
      <div className="flex w-full max-w-[560px] flex-col gap-6 bg-background px-4 pt-8 pb-[calc(env(safe-area-inset-bottom,0px)+32px)] sm:shadow-overlay lg:shadow-none">
        <header className="flex flex-col gap-2">
          <h1 className="font-serif text-display text-balance">{title}</h1>
          {intro && <p className="text-body text-pretty text-muted">{intro}</p>}
        </header>
        {children}
      </div>
    </main>
  )
}
