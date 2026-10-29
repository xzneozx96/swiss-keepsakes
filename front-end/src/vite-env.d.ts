/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `true` signs guests in through the API on the same origin. Unset, the demo signs them in. */
  readonly VITE_API_ENABLED?: string
  /** The public origin, with no trailing slash. Unset: `http://localhost:3002`. */
  readonly VITE_SITE_URL?: string
  /** `production` lets search engines index the site. Unset, empty or any other value sends `X-Robots-Tag: noindex`. */
  readonly VITE_SITE_ENV?: string
}
