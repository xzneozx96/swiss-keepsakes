// The last public page (address with its language prefix) the guest saw. The Profile language change
// reads it to return there. A plain variable: it is written from an effect and read only in an event
// handler, so no render depends on it.
let path: string | null = null

export function rememberPublicPath(next: string): void {
  path = next
}

export function forgetPublicPath(): void {
  path = null
}

export function lastPublicPath(): string | null {
  return path
}
