import type { StoryGroupDetail, StoryVersion } from '@sk/api-contract'
import type { Outcome } from '../hooks/use-story-publish'
import type { StoryLanguage } from '../lib/search-params'

import { Button, Description, FieldError, Input, Label, TextField } from '@heroui/react'
import { useRef, useState } from 'react'

import { LinkIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { linkPath, normalizeSlug, slugSuggestion } from '../lib/link'
import { CollapsibleCard } from './story-details-panel'

/**
 * The link of this language version (the owner's note of 30.10.2026: each language has its own, the other's is offered).
 * The typed text is kept raw and normalised when the field is left, so "musegg-" can be typed on the way to "musegg-wall".
 * The slug is saved alone, never with the draft, so a refused link cannot stop the title and body from saving.
 */
export function StoryLinkCard({ language, group, version, title, onSave }: {
  language: StoryLanguage
  group: StoryGroupDetail
  version: StoryVersion
  /** The title typed now: the suggestion when the other language has no link. */
  title: string
  onSave: (slug: string | null) => Promise<Outcome>
}) {
  const { t } = useLocale()
  const other = group.versions[language === 'en' ? 'de' : 'en']
  const saved = version.slug ?? ''
  // The text being typed; undefined shows the saved link.
  const [typed, setTyped] = useState<string>()
  const [error, setError] = useState<string>()
  const savingRef = useRef(false)
  const suggestion = slugSuggestion({ otherSlug: other?.slug ?? null, title, current: version.slug })

  async function save(raw: string) {
    const slug = normalizeSlug(raw)

    if (savingRef.current)
      return
    if (slug === saved) {
      setTyped(undefined)

      return
    }
    savingRef.current = true
    const outcome = await onSave(slug === '' ? null : slug)

    savingRef.current = false
    // The saved link comes back through the group query; a refusal restores the old one.
    setTyped(undefined)
    if (outcome.ok)
      return
    setError(t(outcome.type === 'content-slug-taken' ? 'storyPublish.link.taken' : outcome.type === 'publish-incomplete' ? 'storyPublish.link.needLive' : 'storyPublish.link.failed'))
  }

  const note = saved === ''
    ? t('storyPublish.link.needed')
    : other?.slug === version.slug
      ? t('storyPublish.link.shared')
      : t('storyPublish.link.own', { language: t(`storyEditor.language.${language}`) })

  return (
    <CollapsibleCard icon={LinkIcon} id="link" summary={version.slug ? linkPath(language, version.slug) : t('storyPublish.link.unset')} title={t('storyPublish.link.title')}>
      <TextField
        fullWidth
        isRequired
        isInvalid={error !== undefined}
        value={typed ?? saved}
        onBlur={() => void save(typed ?? saved)}
        onChange={(value) => {
          setError(undefined)
          setTyped(value)
        }}
      >
        <Label>{t('storyPublish.link.title')}</Label>
        <div className="flex items-center gap-1">
          <span className="shrink-0 text-sm text-muted">{`/${language}/stories/`}</span>
          <Input
            className="min-w-0 flex-1 max-lg:h-11"
            placeholder="musegg-morning"
            onKeyDown={(event) => {
              if (event.key === 'Enter')
                void save(typed ?? saved)
            }}
          />
        </div>
        <Description>{note}</Description>
        <FieldError>{error}</FieldError>
      </TextField>
      {version.status === 'published' && <p className="text-sm text-muted">{t('storyPublish.link.live')}</p>}
      {suggestion !== null && (
        <Button className="min-h-11 self-start" variant="secondary" onPress={() => void save(suggestion)}>{t('storyPublish.link.use', { slug: suggestion })}</Button>
      )}
    </CollapsibleCard>
  )
}
