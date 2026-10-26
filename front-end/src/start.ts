import { createStart } from '@tanstack/react-start'

// Routes stay client-only until a route opts in with `ssr: true`; the root and the public routes do.
// (Start reads `defaultSsr` here, not from the router options.)
export const startInstance = createStart(() => ({
  defaultSsr: false,
}))
