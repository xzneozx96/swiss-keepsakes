import type { MessageKey } from '@/i18n/en'

import { useEffect, useRef, useState } from 'react'

import { useLatest } from '@/hooks/use-latest'
import { usePhotoUpload } from './use-photo-upload'

/** A picked file on its way up, or one whose upload failed. It is not in the form until its media id is known. */
export interface PendingPhoto {
  key: string
  name: string
  /** A local address of the file, for the row's picture; revoked when the row goes. */
  previewUrl: string
  status: 'uploading' | 'failed'
  message?: MessageKey
}

/**
 * The photos picked but not yet part of the form. `add` makes a row for each file at once and uploads them side by
 * side; a finished upload hands its media id to `onUploaded` and the row goes; a failed one stays with its reason
 * until `retry` or `remove`. A row removed while it uploads never reaches the form.
 */
export function usePendingPhotos(storeId: string, onUploaded: (mediaId: string) => void) {
  const upload = usePhotoUpload(storeId)
  const latest = useLatest({ upload, onUploaded })
  const [pending, setPending] = useState<PendingPhoto[]>([])
  const filesRef = useRef(new Map<string, { file: File, previewUrl: string }>())
  const removedRef = useRef(new Set<string>())

  const drop = (key: string) => {
    const entry = filesRef.current.get(key)

    if (entry)
      URL.revokeObjectURL(entry.previewUrl)
    filesRef.current.delete(key)
    setPending(items => items.filter(item => item.key !== key))
  }

  const run = (key: string) => {
    const entry = filesRef.current.get(key)

    if (!entry)
      return
    setPending(items => items.map(item => (item.key === key ? { key, name: item.name, previewUrl: item.previewUrl, status: 'uploading' } : item)))
    void latest.current.upload(entry.file).then((result) => {
      // Removed while it uploaded: nothing to add.
      if (removedRef.current.has(key))
        return
      if ('id' in result) {
        latest.current.onUploaded(result.id)
        drop(key)
      }
      else {
        setPending(items => items.map(item => (item.key === key ? { ...item, status: 'failed', message: result.message } : item)))
      }
    })
  }

  const add = (picked: File[]) => {
    const added = picked.map(file => ({ key: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) }))

    for (const { key, file, previewUrl } of added)
      filesRef.current.set(key, { file, previewUrl })
    setPending(items => [...items, ...added.map(({ key, file, previewUrl }): PendingPhoto => ({ key, name: file.name, previewUrl, status: 'uploading' }))])
    for (const { key } of added)
      run(key)
  }

  // Leaving the step: the pictures are not needed any more, but an upload that is running still reaches the form.
  useEffect(() => {
    const kept = filesRef.current

    return () => {
      for (const { previewUrl } of kept.values())
        URL.revokeObjectURL(previewUrl)
    }
  }, [])

  const remove = (key: string) => {
    removedRef.current.add(key)
    drop(key)
  }

  return { pending, add, retry: run, remove }
}
