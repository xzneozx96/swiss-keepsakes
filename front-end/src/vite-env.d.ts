/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The branch's Neon Auth URL (`NEON_AUTH_BASE_URL`). Unset or empty, the demo signs guests in. */
  readonly VITE_NEON_AUTH_URL?: string
}
