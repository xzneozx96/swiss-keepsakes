import type { Editor } from '@tiptap/react'

import { Button, FieldError, Input, Label, TextField } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { linkHref } from '../lib/link-input'

/**
 * The link tool: one address field under the bar, Apply, Remove (only on a link) and Cancel; Enter applies. The address is
 * checked with `linkHref`, the same rule the server applies, so an unsafe one is refused here with a message.
 */
export function LinkForm({ editor, current, onDone }: { editor: Editor, current: string, onDone: () => void }) {
  const { t } = useLocale()
  const [value, setValue] = useState(current === '' ? 'https://' : current)
  const [tried, setTried] = useState(false)
  const href = linkHref(value)
  const fieldRef = useRef<HTMLInputElement>(null)

  // The field has focus when the form opens, so the address can be typed at once.
  useEffect(() => fieldRef.current?.focus(), [])

  const apply = () => {
    if (href === undefined) {
      setTried(true)

      return
    }
    const chain = editor.chain().focus()

    if (editor.state.selection.empty && !editor.isActive('link'))
      chain.insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }).run()
    else
      chain.extendMarkRange('link').setLink({ href }).run()
    onDone()
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface-secondary p-3">
      <TextField
        fullWidth
        isInvalid={tried && href === undefined}
        type="url"
        value={value}
        onChange={setValue}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            apply()
          }
        }}
      >
        <Label>{t('storyEditor.link.label')}</Label>
        <Input ref={fieldRef} />
        <FieldError>{t('storyEditor.link.error')}</FieldError>
      </TextField>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onPress={apply}>{t('storyEditor.link.apply')}</Button>
        {current !== '' && (
          <Button
            size="sm"
            variant="tertiary"
            onPress={() => {
              editor.chain().focus().extendMarkRange('link').unsetLink().run()
              onDone()
            }}
          >
            {t('storyEditor.link.remove')}
          </Button>
        )}
        <Button size="sm" variant="tertiary" onPress={onDone}>{t('storyEditor.link.cancel')}</Button>
      </div>
    </div>
  )
}
