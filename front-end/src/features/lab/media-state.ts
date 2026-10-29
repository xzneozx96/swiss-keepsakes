import type { MediaAlt, MediaKind, MediaRef, MediaRow, UploadCheck } from './media-data'
import type { LabState } from './media-search-params'

import { toast } from '@heroui/react'
import { useState } from 'react'

import { mc } from './media-copy'
import { checkUpload, replaceImpact, seedRefs, seedRows } from './media-data'

/** The file whose retire is refused in the "retire refused" state, and the draft that took it meanwhile. */
export const RACE_ID = 'img-old-swiss-house'
const raceRef: MediaRef = {
  mediaId: RACE_ID,
  ownerKind: 'story',
  ownerId: 's1',
  ownerName: 'The dying lion of Lucerne',
  language: 'de',
  slot: 'draft',
  role: 'photo',
}

/** The "upload in progress" state: files just uploaded, at the top of their kind, building their sizes. */
const uploadedRows: MediaRow[] = [
  { id: 'up-1', kind: 'image', name: 'kapellbruecke-dawn.jpg', fileName: 'kapellbruecke-dawn.jpg', contentType: 'image/jpeg', byteSize: 4_100_000, width: null, height: null, durationSeconds: null, alt: {}, status: 'processing', createdAt: '2026-10-28', version: 1, preview: '' },
  { id: 'up-2', kind: 'image', name: 'hofkirche-organ.jpg', fileName: 'hofkirche-organ.jpg', contentType: 'image/jpeg', byteSize: 3_400_000, width: null, height: null, durationSeconds: null, alt: {}, status: 'processing', createdAt: '2026-10-28', version: 1, preview: '' },
  { id: 'up-3', kind: 'audio', name: 'zytturm-bell.m4a', fileName: 'zytturm-bell.m4a', contentType: 'audio/mp4', byteSize: 640_000, width: null, height: null, durationSeconds: null, alt: {}, status: 'processing', createdAt: '2026-10-28', version: 1, preview: '' },
  { id: 'up-4', kind: 'pdf', name: 'pilatus-guide-2027.pdf', fileName: 'pilatus-guide-2027.pdf', contentType: 'application/pdf', byteSize: 2_100_000, width: null, height: null, durationSeconds: null, alt: {}, status: 'processing', createdAt: '2026-10-28', version: 1, preview: '' },
]

const SETTLE_MS = 1800
let uploadSeed = 0

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader()

    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })
}

const kindWord: Record<MediaKind, string> = { image: 'Photos', audio: 'Recordings', pdf: 'PDFs' }

/** Why one file of a batch was refused, short enough to list several in one toast. */
export function refusalReason(check: UploadCheck) {
  if (check.ok)
    return ''
  if (check.reason === 'type')
    return mc('upload.reasonType')
  if (check.reason === 'kind')
    return mc('replace.kind', { kind: kindWord[check.kind].toLowerCase() })

  return mc('upload.reasonSize', { max: check.maxMb })
}

/** One toast per batch and outcome: "3 files uploaded", "1 file refused: x.png, too large (max 20 MB)". */
export function uploadToasts(accepted: number, refused: { name: string, reason: string }[]) {
  const list = refused.map(r => `${r.name}, ${r.reason}`).join('; ')

  return {
    success: accepted ? (accepted === 1 ? mc('upload.doneOne') : mc('upload.done', { count: accepted })) : null,
    danger: refused.length ? (refused.length === 1 ? mc('upload.refusedOne', { list }) : mc('upload.refused', { count: refused.length, list })) : null,
  }
}

/**
 * The library in memory for one lab frame: rows, uses, and the refusal shown
 * after a retire lost a race.
 */
export function useLibrary(state: LabState) {
  const isEmpty = state === 'empty'
  const [rows, setRows] = useState<MediaRow[]>(() => (isEmpty ? [] : state === 'upload' ? [...uploadedRows, ...structuredClone(seedRows)] : structuredClone(seedRows)))
  const [refs] = useState<MediaRef[]>(() => (isEmpty ? [] : state === 'refused' ? [...seedRefs, raceRef] : [...seedRefs]))
  const [refusedId, setRefusedId] = useState<string | null>(() => (state === 'refused' ? RACE_ID : null))

  const patchRow = (id: string, patch: Partial<MediaRow>) =>
    setRows(current => current.map(r => (r.id === id ? { ...r, ...patch } : r)))

  const saveDetails = (id: string, details: { name: string, alt: MediaAlt }) => {
    patchRow(id, details)
    toast.success(mc('details.saved'))
  }

  /** Accepted files join the list at once, processing, then turn ready; refused ones never appear. */
  const upload = async (files: File[]) => {
    const refused: { name: string, reason: string }[] = []
    let accepted = 0

    for (const file of files) {
      const check = checkUpload(file)

      if (!check.ok) {
        refused.push({ name: file.name, reason: refusalReason(check) })
        continue
      }
      uploadSeed += 1
      accepted += 1
      const id = `new-${uploadSeed}`
      const preview = check.kind === 'image' ? await readAsDataUrl(file) : ''

      setRows(current => [{
        id,
        kind: check.kind,
        name: file.name,
        fileName: file.name,
        contentType: file.type,
        byteSize: file.size,
        width: null,
        height: null,
        durationSeconds: null,
        alt: {},
        status: 'processing',
        createdAt: '2026-10-28',
        version: 1,
        preview,
      }, ...current])
      setTimeout(() => {
        patchRow(id, check.kind === 'image' ? { status: 'ready', width: 4032, height: 3024 } : { status: 'ready', durationSeconds: check.kind === 'audio' ? 95 : null })
      }, SETTLE_MS)
    }
    const messages = uploadToasts(accepted, refused)

    if (messages.success)
      toast.success(messages.success)
    if (messages.danger)
      toast.danger(messages.danger)
  }

  /** A new version of the same row; every page that uses it shows it (AC51). */
  const replace = async (row: MediaRow, file: File) => {
    const check = checkUpload(file, row.kind)

    if (!check.ok) {
      toast.danger(mc('replace.refused', { name: file.name, reason: refusalReason(check) }))

      return
    }
    const preview = row.kind === 'image' ? await readAsDataUrl(file) : row.preview
    const version = row.version + 1
    const { pages } = replaceImpact(row.id, refs, { countKeepsakes: true })

    patchRow(row.id, { status: 'processing', version, byteSize: file.size, fileName: file.name, preview })
    setTimeout(() => {
      patchRow(row.id, { status: 'ready' })
      toast.success(pages ? mc('replace.done', { n: version, pages }) : mc('replace.doneNone', { n: version }))
    }, SETTLE_MS)
  }

  const retire = (row: MediaRow) => {
    patchRow(row.id, { status: 'retired' })
    toast.success(mc('retire.done', { name: row.name }))
  }

  /** Option B's selection bar: the unused ones go, the ones in use stay; one message for all. */
  const retireMany = (chosen: MediaRow[], kept: number) => {
    const ids = new Set(chosen.map(r => r.id))

    setRows(current => current.map(r => (ids.has(r.id) ? { ...r, status: 'retired' } : r)))
    toast.success(mc('select.done', { count: chosen.length, kept }))
  }

  return {
    rows,
    refs,
    refusal: refusedId ? { mediaId: refusedId, ref: raceRef } : null,
    saveDetails,
    upload,
    replace,
    retire,
    retireMany,
    dismissRefusal: () => setRefusedId(null),
  }
}

export type Library = ReturnType<typeof useLibrary>
