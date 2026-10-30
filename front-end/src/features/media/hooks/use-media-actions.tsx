import type { MediaItem } from '@sk/api-contract'
import type { MessageKey } from '@/i18n/en'

import { toast } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem, queryKeys, useCommand } from '@/features/data-client'
import { ReplaceDialog } from '../components/replace-dialog'
import { ACCEPT, checkFile, retireCheck } from '../lib/rules'

const PROBLEM_KEYS: Record<string, MessageKey> = {
  'storage-unavailable': 'media.problem.storage',
  'forbidden': 'media.problem.forbidden',
  'not-found': 'media.problem.notFound',
  'media-already-retired': 'media.problem.retired',
  'validation-failed': 'media.problem.invalid',
  'media-content-mismatch': 'media.problem.content',
  'precondition-failed': 'media.problem.changed',
  'media-not-ready': 'media.problem.notReady',
}

export const problemKey = (error: unknown): MessageKey => (error instanceof ApiProblem ? PROBLEM_KEYS[error.type] : undefined) ?? 'media.problem.generic'

export type RetireOutcome = 'retired' | 'refused' | 'failed' | 'cancelled'

/**
 * The library's commands: upload (one toast for the accepted files, one for the refused), Replace (the page count
 * first, then the file dialog), Retire (confirm, refused while used) and the name and description. `elements` holds
 * the confirm dialog and the hidden file input of Replace.
 *
 * A single command says its result through its `meta` (`api-feedback.md`). Upload and Retire selected run one command
 * per file and tell the whole batch in one toast, which the cache cannot do (it toasts per command), so those two are
 * `silent` and their summary and per-file refusals stay local. The refusals of a file before any request (type, size)
 * are client-side checks and stay local too.
 */
export function useMediaActions(storeId: string) {
  const { t } = useLocale()
  const queryClient = useQueryClient()
  const { confirm, dialog } = useConfirm()
  // Written once a tap sends its command, read when the answer comes: what the success text names about the file.
  const pagesRef = useRef<Record<string, number>>({})
  const namesRef = useRef<Record<string, string>>({})
  const uploadFiles = useCommand('media', 'upload', { meta: { silent: true } })
  const replaceFile = useCommand('media', 'replace', {
    meta: {
      success: (replaced, input) => {
        const pages = pagesRef.current[input.id] ?? 0

        return pages === 0 ? t('media.replace.doneNone', { n: replaced.version }) : t(pages === 1 ? 'media.replace.doneOne' : 'media.replace.done', { n: replaced.version, pages })
      },
      error: PROBLEM_KEYS,
    },
  })
  // A file a page took while the merchant decided is shown by the sheet (`refused`); the toast says the same in short.
  const retireFile = useCommand('media', 'retire', {
    meta: { success: (_, input) => t('media.retire.done', { name: namesRef.current[input.id] ?? '' }), error: { ...PROBLEM_KEYS, 'media-in-use': 'media.retire.refusedBody' } },
  })
  const retireEach = useCommand('media', 'retire', { meta: { silent: true } })
  const describeFile = useCommand('media', 'describe', { meta: { success: 'media.details.saved', error: PROBLEM_KEYS } })
  const [replacing, setReplacing] = useState<MediaItem | null>(null)
  const [busyIds, setBusyIds] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const targetRef = useRef<MediaItem | null>(null)

  const refreshUse = () => Promise.all([queryKeys.media.list, queryKeys.media.uses].map(queryKey => queryClient.invalidateQueries({ queryKey, refetchType: 'all' })))
  const reasonText = (name: string, reason: ReturnType<typeof checkFile>) =>
    t('media.upload.reason', { name, reason: reason.ok ? '' : reason.reason === 'type' ? t('media.upload.reasonType') : t('media.upload.reasonSize', { max: reason.maxMb }) })

  const upload = async (files: File[]) => {
    const checked = files.map(file => ({ file, check: checkFile(file) }))
    const refused = checked.filter(entry => !entry.check.ok)
    const accepted = checked.filter(entry => entry.check.ok)

    if (refused.length) {
      const list = refused.map(entry => reasonText(entry.file.name, entry.check)).join('; ')
      toast.warning(t(refused.length === 1 ? 'media.upload.refusedOne' : 'media.upload.refused', { count: refused.length, list }))
    }
    if (!accepted.length)
      return
    setIsUploading(true)
    const results = await Promise.allSettled(accepted.map(({ file, check }) => uploadFiles.mutateAsync({ storeId, file, contentType: check.ok ? check.contentType : file.type })))
    setIsUploading(false)
    const done = results.filter(result => result.status === 'fulfilled').length
    const failed = accepted.filter((_, index) => results[index]!.status === 'rejected').map(entry => entry.file.name)

    if (done)
      toast.success(t(done === 1 ? 'media.upload.doneOne' : 'media.upload.done', { count: done }))
    if (failed.length)
      toast.danger(t('media.upload.failed', { list: failed.join(', ') }))
  }

  const replaceWith = async (item: MediaItem, file: File) => {
    const check = checkFile(file)

    if (check.ok && check.kind !== item.kind) {
      toast.warning(t('media.replace.refused', { name: file.name, reason: t('media.replace.kind', { kind: t(`media.kind.${item.kind}`) }) }))

      return
    }
    if (!check.ok) {
      toast.warning(t('media.replace.refused', { name: file.name, reason: check.reason === 'type' ? t('media.upload.reasonType') : t('media.upload.reasonSize', { max: check.maxMb }) }))

      return
    }
    setBusyIds(ids => [...ids, item.id])
    pagesRef.current[item.id] = item.usage?.pages ?? 0
    try {
      await replaceFile.mutateAsync({ storeId, id: item.id, file, contentType: check.contentType })
    }
    catch {
      // The cache shows the refusal.
    }
    finally {
      setBusyIds(ids => ids.filter(id => id !== item.id))
    }
  }

  const retire = async (item: MediaItem): Promise<RetireOutcome> => {
    if (!retireCheck(item).ok)
      return 'refused'
    const ok = await confirm({ title: t('media.retire.title', { name: item.name }), body: t('media.retire.body'), confirmLabel: t('media.retire.confirm'), cancelLabel: t('media.retire.cancel') })

    if (!ok)
      return 'cancelled'
    namesRef.current[item.id] = item.name
    try {
      await retireFile.mutateAsync({ storeId, id: item.id, idempotencyKey: crypto.randomUUID() })

      return 'retired'
    }
    catch (error) {
      if (error instanceof ApiProblem && error.type === 'media-in-use') {
        // A page took the file while the merchant decided: read its use again, so the sheet says so.
        await refreshUse()

        return 'refused'
      }

      return 'failed'
    }
  }

  /** Retires only the files nothing uses and keeps the others. */
  const retireMany = async (items: MediaItem[], kept: number): Promise<boolean> => {
    const ok = await confirm({
      title: t('media.select.retireTitle', { count: items.length }),
      body: `${t('media.retire.body')}${kept ? ` ${t('media.select.blockedSentence', { count: kept })}` : ''}`,
      confirmLabel: t('media.retire.confirm'),
      cancelLabel: t('media.retire.cancel'),
    })

    if (!ok)
      return false
    let retired = 0
    let refused = 0

    for (const item of items) {
      try {
        await retireEach.mutateAsync({ storeId, id: item.id, idempotencyKey: crypto.randomUUID() })
        retired++
      }
      catch (error) {
        if (error instanceof ApiProblem && error.type === 'media-in-use')
          refused++
        else
          toast.danger(t('media.retire.failed'), { description: t(problemKey(error)) })
      }
    }
    if (refused)
      await refreshUse()
    toast.success(t(retired === 1 ? 'media.select.doneOne' : 'media.select.done', { count: retired, kept: kept + refused }))

    return true
  }

  const save = async (item: MediaItem, details: { name: string, alt: { en: string, de: string } }) => {
    try {
      await describeFile.mutateAsync({ storeId, id: item.id, idempotencyKey: crypto.randomUUID(), name: details.name, alt: details.alt })
    }
    catch {
      // The cache shows the refusal.
    }
  }

  return {
    upload,
    isUploading,
    busyIds,
    askReplace: (item: MediaItem) => setReplacing(item),
    retire,
    retireMany,
    save,
    elements: (
      <>
        {dialog}
        <ReplaceDialog
          item={replacing}
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
          data-testid="replace-input"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0]
            const target = targetRef.current

            event.target.value = ''
            if (file && target)
              void replaceWith(target, file)
          }}
        />
      </>
    ),
  }
}
