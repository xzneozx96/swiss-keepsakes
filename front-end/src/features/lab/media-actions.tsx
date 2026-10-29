import type { MediaRow, UseOptions } from './media-data'
import type { Library } from './media-state'

import { useRef, useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { mc } from './media-copy'
import { ACCEPT, retireCheck } from './media-data'
import { ReplaceDialog } from './media-parts'

/** Replace (count of pages first, then the file dialog) and Retire (confirm, refused while used). */
export function useFileActions(lib: Library, rules: UseOptions) {
  const { confirm, dialog } = useConfirm()
  const [replacing, setReplacing] = useState<MediaRow | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const targetRef = useRef<MediaRow | null>(null)

  const askRetire = async (row: MediaRow) => {
    const check = retireCheck(row, lib.refs, rules)

    if (!check.ok)
      return
    const ok = await confirm({ title: mc('retire.title', { name: row.name }), body: mc('retire.body'), confirmLabel: mc('retire.confirm'), cancelLabel: mc('retire.cancel') })

    if (ok)
      lib.retire(row)
  }

  return {
    askReplace: (row: MediaRow) => setReplacing(row),
    askRetire,
    elements: (
      <>
        {dialog}
        <ReplaceDialog
          refs={lib.refs}
          row={replacing}
          rules={rules}
          onCancel={() => setReplacing(null)}
          onConfirm={() => {
            targetRef.current = replacing
            setReplacing(null)
            inputRef.current?.click()
          }}
        />
        <input
          ref={inputRef}
          hidden
          accept={ACCEPT}
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0]
            const target = targetRef.current

            event.target.value = ''
            if (file && target)
              void lib.replace(target, file)
          }}
        />
      </>
    ),
  }
}

export type FileActions = ReturnType<typeof useFileActions>
