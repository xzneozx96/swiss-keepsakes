import type { MediaMatch } from '@sk/api-contract'
import type { DuplicateChoice } from '../components/duplicate-dialog'
import type { Duplicate } from '../lib/duplicates'

import { useRef, useState } from 'react'

import { useDataClient } from '@/features/data-client'
import { DuplicateDialog } from '../components/duplicate-dialog'
import { findDuplicates } from '../lib/duplicates'

/** What to do with a pick once the merchant has answered: upload `upload`, and treat `reuse` as already there. */
export interface DuplicateDecision {
  upload: File[]
  reuse: MediaMatch[]
}

/**
 * Asks before uploading a file the store's library already holds (owner decision, 1.11.2026: by content, ask first).
 * `resolve(files, accepts)` hashes the files that `accepts` (a file the upload refuses is not looked up, and goes on to
 * be refused), makes one lookup, and answers with every file to upload when none is a duplicate. Otherwise it opens
 * `dialog` (render it once) and waits: the files that are new go up as they are, a duplicate goes up only when the
 * merchant chose "Upload a copy", and one they chose to reuse comes back in `reuse` (once per library file). `null` means the merchant cancelled the pick. A second pick while the dialog is open
 * cancels the first.
 */
export function useDuplicateCheck(storeId: string) {
  const client = useDataClient()
  const [asking, setAsking] = useState<{ duplicates: Duplicate[] } | null>(null)
  const answerRef = useRef<((choices: DuplicateChoice[] | null) => void) | null>(null)

  const finish = (choices: DuplicateChoice[] | null) => {
    answerRef.current?.(choices)
    answerRef.current = null
    setAsking(null)
  }

  const resolve = async (files: File[], accepts: (file: File) => boolean): Promise<DuplicateDecision | null> => {
    const duplicates = await findDuplicates(files.filter(accepts), sha256 => client.media.lookup({ storeId, sha256 }))

    if (duplicates.length === 0)
      return { upload: files, reuse: [] }
    answerRef.current?.(null)
    const choices = await new Promise<DuplicateChoice[] | null>((done) => {
      answerRef.current = done
      setAsking({ duplicates })
    })

    if (!choices)
      return null
    const duplicated = new Set(duplicates.map(({ file }) => file))
    const copied = new Set(duplicates.filter((_, index) => choices[index] === 'copy').map(({ file }) => file))
    const reuse = new Map(duplicates.filter((_, index) => choices[index] === 'use').map(({ existing }) => [existing.id, existing]))

    return { upload: files.filter(file => !duplicated.has(file) || copied.has(file)), reuse: [...reuse.values()] }
  }

  const dialog = asking && <DuplicateDialog duplicates={asking.duplicates} onCancel={() => finish(null)} onDone={finish} />

  return { resolve, dialog }
}
