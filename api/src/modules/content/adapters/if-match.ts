const versionForms = /^(?:W\/"(\d+)"|"(\d+)"|(\d+))$/

export type IfMatch = { kind: 'missing' } | { kind: 'invalid' } | { kind: 'version', version: number }

// `3`, `"3"` and `W/"3"` name version 3. `*` and anything else are invalid: a save needs one known version.
export function parseIfMatch(header: string | undefined): IfMatch {
  if (header === undefined)
    return { kind: 'missing' }
  const match = versionForms.exec(header.trim())
  const digits = match?.[1] ?? match?.[2] ?? match?.[3]
  const version = digits === undefined ? 0 : Number(digits)
  return Number.isSafeInteger(version) && version > 0 ? { kind: 'version', version } : { kind: 'invalid' }
}
