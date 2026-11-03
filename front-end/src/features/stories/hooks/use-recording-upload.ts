import { toast } from '@heroui/react'

import { useLocale } from '@/contexts/locale-context'
import { useCommand } from '@/features/data-client/use-command'
import { checkFile } from '@/features/media/lib/rules'

/**
 * Uploads a recording to the library through the media upload command and answers its id, or `null` after a toast: a file that is not
 * a recording is refused here with no request (the API checks again), and a failed upload says so. The library list reads again after it.
 */
export function useRecordingUpload(storeId: string) {
  const { t } = useLocale()
  const upload = useCommand('media', 'upload', { meta: { silent: true } })

  return async (file: File): Promise<{ id: string, name: string } | null> => {
    const check = checkFile(file)

    if (!check.ok || check.kind !== 'audio') {
      toast.warning(t('media.upload.refusedOne', { list: t('media.upload.reason', { name: file.name, reason: t('media.upload.reasonType') }) }))

      return null
    }
    try {
      const media = await upload.mutateAsync({ storeId, file, contentType: check.contentType })

      return { id: media.id, name: media.name }
    }
    catch {
      toast.danger(t('media.upload.failed', { list: file.name }))

      return null
    }
  }
}
