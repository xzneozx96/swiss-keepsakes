/**
 * With `VITE_API_ENABLED=true` the SPA signs guests in through the API on its own origin (Better
 * Auth at /api/auth/*). Unset or anything else, the prototype's demo sign-in runs, as on Vercel.
 * The flag is fixed at build time. The SPA does not probe the API.
 */
export const apiEnabled = import.meta.env.VITE_API_ENABLED === 'true'
