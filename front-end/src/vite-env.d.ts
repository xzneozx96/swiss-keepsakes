/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `true` signs guests in through the API on the same origin. Unset, the demo signs them in. */
  readonly VITE_API_ENABLED?: string
}
