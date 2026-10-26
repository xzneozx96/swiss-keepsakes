import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useDemoSelector } from '@/features/demo'

export const Route = createFileRoute('/ssr-check')({
  // Proves that the real providers render on the server and hydrate. E3.3 turns the public routes on.
  ssr: true,
  component: SsrCheck,
})

function SsrCheck() {
  const { language } = useLocale()
  const signedIn = useDemoSelector(state => state.data.signedInGuestId !== null)
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    rootRef.current?.setAttribute('data-hydrated', 'true')
  }, [])

  return (
    <main className="p-4" data-language={language} data-ssr-check ref={rootRef}>
      <h1 className="font-serif text-2xl">SSR check</h1>
      <p>{`Language: ${language}`}</p>
      <p>{signedIn ? 'Signed in' : 'Signed out'}</p>
      <Link to="/ssr-check-b">Go to page B</Link>
    </main>
  )
}
