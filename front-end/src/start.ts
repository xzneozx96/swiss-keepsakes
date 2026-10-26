import { createStart } from '@tanstack/react-start'

// Routes stay client-only until a route opts in with `ssr: true`; today only the root route does.
// (Start reads `defaultSsr` here, not from the router options.)
export const startInstance = createStart(() => ({
  defaultSsr: false,
}))
