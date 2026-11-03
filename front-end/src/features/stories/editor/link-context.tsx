import type { Editor } from '@tiptap/react'
import type { PinOption } from '../lib/pins'

import { Button } from '@heroui/react'
import { getMarkRange } from '@tiptap/react'

import { StatusWarningIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { hostOf, pinForHost } from '../lib/pins'
import { convertLinksToPin, removePinLink } from './pin-commands'

/** The words of the link at the cursor: the selection, else the whole link. */
function linkedText(editor: Editor): string {
  const { selection, doc, schema } = editor.state
  const type = schema.marks.link
  const range = selection.empty && type ? getMarkRange(selection.$from, type) : undefined

  return doc.textBetween(range?.from ?? selection.from, range?.to ?? selection.to)
}

/** A press must not take focus from the text, so the selection and the link stay. */
const keepSelection = (event: React.MouseEvent) => event.preventDefault()

/**
 * The line under the bar for the link at the cursor. On a pin link: its pin, with Change and Remove. On a plain link to the
 * website of one of the store's published pins: the yellow note with "Link the pin instead" and "Keep" (ADR-011). The note
 * never blocks saving. Nothing shows for any other cursor position.
 */
export function LinkContext({ editor, link, pinId, pins, dismissed, onKeep, onChangePin }: {
  editor: Editor
  /** The address of the plain link at the cursor, or ''. */
  link: string
  /** The pin id of the pin link at the cursor, or ''. */
  pinId: string
  pins: PinOption[]
  /** The hosts the writer chose to Keep. */
  dismissed: string[]
  onKeep: (host: string) => void
  onChangePin: () => void
}) {
  const { t } = useLocale()

  if (pinId !== '') {
    const pin = pins.find(candidate => candidate.id === pinId)

    return (
      <div className="flex flex-wrap items-center gap-2 text-sm" role="status">
        <span className="min-w-0 flex-1">
          <span className="font-medium">{t('storyMedia.pin.context', { name: pin?.name ?? t('storyMedia.pin.unknown') })}</span>
          {pin && pin.status !== 'published' && <span className="text-muted">{` ${t('storyMedia.pin.notPublished')}`}</span>}
        </span>
        <Button className="max-lg:min-h-11" size="sm" variant="tertiary" onMouseDown={keepSelection} onPress={onChangePin}>{t('storyMedia.pin.change')}</Button>
        <Button className="max-lg:min-h-11" size="sm" variant="tertiary" onMouseDown={keepSelection} onPress={() => removePinLink(editor)}>{t('storyMedia.pin.remove')}</Button>
      </div>
    )
  }
  const pin = link === '' ? undefined : pinForHost(pins, link)
  const host = hostOf(link)

  if (!pin || dismissed.includes(host))
    return null

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning-soft-foreground" role="status">
      <p className="flex items-start gap-2">
        <StatusWarningIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
        <span>{t('storyMedia.host.note', { text: linkedText(editor), host, name: pin.name })}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button className="max-lg:min-h-11" size="sm" variant="secondary" onMouseDown={keepSelection} onPress={() => convertLinksToPin(editor, link, pin.id)}>{t('storyMedia.host.switch')}</Button>
        <Button className="max-lg:min-h-11" size="sm" variant="tertiary" onMouseDown={keepSelection} onPress={() => onKeep(host)}>{t('storyMedia.host.keep')}</Button>
      </div>
    </div>
  )
}
