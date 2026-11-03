import type { MediaMatch } from '@sk/api-contract'

/** A picked file whose bytes are already a ready file of the library. */
export interface Duplicate {
  file: File
  existing: MediaMatch
}

/** The SHA-256 of a file as 64 lower-case hex digits, or undefined when this browser or page cannot compute it. */
export async function sha256Hex(file: Blob): Promise<string | undefined> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())

    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  }
  catch {
    return undefined
  }
}

/**
 * Which of the picked files the library already holds, by content (a name proves nothing: IMG_0001.jpg is a different
 * photo on every phone). The files are hashed side by side and one lookup carries every hash. It fails open: a file
 * that cannot be hashed, or a lookup that fails, means "not a duplicate", so an upload is never blocked by the check.
 * When several library files share the bytes, the oldest is the one offered.
 */
export async function findDuplicates(files: File[], lookup: (sha256: string[]) => Promise<MediaMatch[]>): Promise<Duplicate[]> {
  const hashes = await Promise.all(files.map(file => sha256Hex(file)))
  const known = [...new Set(hashes.filter((hash): hash is string => hash !== undefined))]

  if (known.length === 0)
    return []
  const byHash = new Map<string, MediaMatch>()

  try {
    for (const match of await lookup(known)) {
      if (!byHash.has(match.sha256))
        byHash.set(match.sha256, match)
    }
  }
  catch {
    return []
  }

  return files.flatMap((file, index) => {
    const hash = hashes[index]
    const existing = hash === undefined ? undefined : byHash.get(hash)

    return existing ? [{ file, existing }] : []
  })
}
