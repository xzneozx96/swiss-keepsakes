import type { OptionsDraftState } from '../hooks/use-options-draft'
import type { OptionDraft } from '../lib/option-rules'

import { Input, Label, TextField } from '@heroui/react'
import { useId, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { OPTION_NAME_MAX, VALUE_LABEL_MAX } from '../lib/option-rules'
import { RevealLink } from './option-bits'

/**
 * German names are optional, so they are a closed section at the foot of the option: a small translation list with the
 * English on the left and a German field on the right, the option's name first. Left empty, German readers see the English.
 */
export function GermanNames({ draft, option }: { draft: OptionsDraftState, option: OptionDraft }) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const id = useId()
  const rows = [
    { ref: option.ref, text: option.name, isName: true },
    ...option.values.filter(value => value.label.en.trim() || value.label.de.trim()).map(value => ({ ref: value.ref, text: value.label, isName: false })),
  ]
  const missing = rows.filter(row => !row.text.de.trim()).length

  return (
    <div className="flex flex-col gap-2">
      <RevealLink controls={id} expanded={open} onToggle={() => setOpen(current => !current)}>
        {missing > 0 ? t('keepsakes.options.german.missing', { count: missing }) : t('keepsakes.options.german.set')}
      </RevealLink>
      {open && (
        <div className="flex flex-col gap-2" id={id}>
          <p className="text-xs text-pretty text-muted">{t('keepsakes.options.german.hint')}</p>
          {rows.map(row => (
            <TextField
              fullWidth
              key={row.ref}
              className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-3"
              value={row.text.de}
              onChange={de => (row.isName
                ? draft.patchName(option.ref, { ...option.name, de })
                : draft.patchValue(option.ref, row.ref, { label: { ...row.text, de } }))}
            >
              <Label className={`truncate text-sm ${row.isName ? 'font-medium' : 'font-normal text-muted'}`}>{row.text.en || '—'}</Label>
              <Input lang="de" maxLength={row.isName ? OPTION_NAME_MAX : VALUE_LABEL_MAX} placeholder={t('keepsakes.options.german.placeholder')} variant="secondary" />
            </TextField>
          ))}
        </div>
      )}
    </div>
  )
}
