import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/ssr-check-b')({
  ssr: true,
  component: () => (
    <main className="p-4">
      <h1 className="font-serif text-2xl">SSR check B</h1>
    </main>
  ),
})
