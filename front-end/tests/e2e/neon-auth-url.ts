/**
 * A fake Neon Auth URL for the `webkit-*` projects. The app on that dev server talks to it, and the
 * stub in neon-auth-stub.ts answers every request inside the browser, so nothing leaves the machine.
 */
export const NEON_AUTH_URL = 'https://auth.e2e.test/neondb/auth'
