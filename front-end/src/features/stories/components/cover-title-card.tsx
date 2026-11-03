import type { StoryFields } from '../lib/draft'
import type { StoryLanguage } from '../lib/search-params'

import { Description, FieldError, Input, Label, TextArea, TextField } from '@heroui/react'

import { StoryIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { EXCERPT_MAX, TITLE_MAX } from '../lib/draft'
import { CoverField } from './cover-field'
import { WriteCard } from './story-write-card'

type CoverFields = Pick<StoryFields, 'title' | 'excerpt' | 'coverMediaId'>

/**
 * Card one of Write: the cover, the title and the excerpt, all three needed to publish, and the byline. The card is
 * controlled and holds no draft. A field's error shows only with `showErrors` (Review was pressed with a blocking check).
 */
export function CoverTitleCard({ storeId, language, fields, onChange, showErrors, accountName }: {
  storeId: string
  language: StoryLanguage
  fields: CoverFields
  onChange: (patch: Partial<CoverFields>) => void
  showErrors: boolean
  accountName: string
}) {
  const { t } = useLocale()
  const noTitle = showErrors && fields.title.trim() === ''
  const noExcerpt = showErrors && fields.excerpt.trim() === ''

  return (
    <WriteCard icon={StoryIcon} title={t('storyEditor.card.cover')}>
      <CoverField invalid={showErrors && fields.coverMediaId === null} mediaId={fields.coverMediaId} storeId={storeId} onChange={coverMediaId => onChange({ coverMediaId })} />
      <TextField fullWidth isRequired id="write-title" isInvalid={noTitle} value={fields.title} onChange={title => onChange({ title })}>
        <Label>{t('storyEditor.title.label')}</Label>
        <Input lang={language} maxLength={TITLE_MAX} placeholder={t('storyEditor.title.placeholder')} />
        <span className="text-xs text-muted tabular-nums">{t('storyEditor.count', { count: fields.title.length, max: TITLE_MAX })}</span>
        <FieldError>{t('storyEditor.title.error')}</FieldError>
      </TextField>
      <TextField fullWidth isRequired id="write-excerpt" isInvalid={noExcerpt} value={fields.excerpt} onChange={excerpt => onChange({ excerpt })}>
        <Label>{t('storyEditor.excerpt.label')}</Label>
        <TextArea lang={language} maxLength={EXCERPT_MAX} rows={2} />
        <div className="flex items-start justify-between gap-3">
          <Description>{t('storyEditor.excerpt.help')}</Description>
          <span className="shrink-0 text-xs text-muted tabular-nums">{t('storyEditor.count', { count: fields.excerpt.length, max: EXCERPT_MAX })}</span>
        </div>
        <FieldError>{t('storyEditor.excerpt.error')}</FieldError>
      </TextField>
      {accountName !== '' && <p className="text-xs text-muted">{t('storyEditor.byline', { name: accountName })}</p>}
    </WriteCard>
  )
}
