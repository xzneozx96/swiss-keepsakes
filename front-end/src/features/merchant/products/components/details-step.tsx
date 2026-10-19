import type { LocalizedText } from '@sk/domain/catalog'
import type { useTourEditor } from '../hooks/use-tour-editor'
import type { IconComponent } from '@/components/icons'
import type { Language } from '@/contexts/locale-context'

import { Button } from '@heroui/react'
import { hasText } from '@sk/domain/catalog'

import { pickText } from '@sk/domain/shared'

import { useState } from 'react'
import {
  BookingsIcon,
  ContentIcon,
  PickupIcon,
  PlusIcon,
  TrashIcon,
} from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

import { LocalizedField } from './editor-parts'
import { ItineraryCard } from './itinerary/itinerary-editor'
import { Group, NavRow, TextSheet } from './settings-rows'

type Editor = ReturnType<typeof useTourEditor>
type Sheet = 'meeting' | 'itinerary' | 'included' | 'excluded' | 'conditions'

/**
 * Step 2 as a settings-style list (the account screen's pattern): the meeting point, the
 * itinerary, what is included, what is not and the conditions, each a row that opens its own
 * sheet, so the step stays short on a phone.
 */
export function DetailsStep({
  editor,
  language,
}: {
  editor: Editor
  language: Language
}) {
  const { t, language: interfaceLanguage, intlLocale } = useLocale()
  const { edit, change } = editor
  const [open, setOpen] = useState<Sheet | null>(null)
  const plural = new Intl.PluralRules(intlLocale)
  const pick = (text: LocalizedText) => pickText(text, interfaceLanguage).text
  const close = () => setOpen(null)

  const items = edit.included
  const filled = items.filter(
    item => hasText(item.text, 'en') || hasText(item.text, 'de'),
  )
  const includedError = items
    .filter(item => hasText(item.text, 'en') || hasText(item.text, 'de'))
    .map(item => editor.textError('included', language, item.text))
    .find(Boolean)
  const stops = edit.itinerary
  const stopError = stops
    .flatMap(stop => [
      editor.textError('itinerary', language, stop.name),
      editor.textError('itinerary', language, stop.description),
    ])
    .find(Boolean)

  const row = (
    sheet: Sheet,
    icon: IconComponent,
    title: string,
    value: LocalizedText,
    id: 'meetingPoint' | 'excluded' | 'conditions',
  ) => {
    const error = editor.textError(id, language, value)

    return (
      <NavRow
        description={error ?? (pick(value) || t('products.details.notSet'))}
        icon={icon}
        isInvalid={!!error}
        title={title}
        onPress={() => setOpen(sheet)}
      />
    )
  }

  return (
    <>
      <Group title={t('products.details.groupMeeting')}>
        {row(
          'meeting',
          PickupIcon,
          t('products.field.meetingPoint'),
          edit.meetingPoint,
          'meetingPoint',
        )}
      </Group>
      <Group title={t('products.details.groupRoute')}>
        <NavRow
          description={
            stopError
            ?? (stops.length
              ? `${t(
                plural.select(stops.length) === 'one'
                  ? 'products.details.stops.one'
                  : 'products.details.stops.other',
                { count: stops.length },
              )} · ${stops
                .slice(0, 2)
                .map(s => pick(s.name))
                .filter(Boolean)
                .join(' → ')}`
              : t('products.itinerary.empty'))
          }
          icon={BookingsIcon}
          isInvalid={!!stopError}
          title={t('products.field.itinerary')}
          onPress={() => setOpen('itinerary')}
        />
      </Group>
      <Group title={t('products.details.groupInfo')}>
        <NavRow
          description={
            includedError
            ?? (filled.length
              ? t(
                  plural.select(filled.length) === 'one'
                    ? 'products.details.items.one'
                    : 'products.details.items.other',
                  { count: filled.length },
                )
              : t('products.details.notSet'))
          }
          icon={ContentIcon}
          isInvalid={!!includedError}
          title={t('products.field.included')}
          onPress={() => setOpen('included')}
        />
        {row(
          'excluded',
          ContentIcon,
          t('products.field.excluded'),
          edit.excluded,
          'excluded',
        )}
        {row(
          'conditions',
          ContentIcon,
          t('products.field.conditions'),
          edit.conditions,
          'conditions',
        )}
      </Group>

      {open === 'meeting' && (
        <TextSheet
          language={language}
          title={t('products.field.meetingPoint')}
          onClose={close}
        >
          {lang => (
            <LocalizedField
              error={editor.textError('meetingPoint', lang, edit.meetingPoint)}
              label={t('products.field.meetingPoint')}
              language={lang}
              value={edit.meetingPoint}
              onChange={meetingPoint => change({ meetingPoint })}
            />
          )}
        </TextSheet>
      )}
      {open === 'itinerary' && (
        <TextSheet
          language={language}
          title={t('products.field.itinerary')}
          onClose={close}
        >
          {lang => <ItineraryCard bare editor={editor} language={lang} />}
        </TextSheet>
      )}
      {open === 'included' && (
        <TextSheet
          language={language}
          title={t('products.field.included')}
          onClose={close}
        >
          {lang => (
            <>
              <p className="text-sm text-pretty text-muted">
                {t('products.included.hint')}
              </p>
              {items.map((item, index) => (
                <div key={item.key} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <LocalizedField
                      error={
                        hasText(item.text, 'en') || hasText(item.text, 'de')
                          ? editor.textError('included', lang, item.text)
                          : undefined
                      }
                      label={t('products.field.includedItem', {
                        n: index + 1,
                      })}
                      language={lang}
                      value={item.text}
                      onChange={text =>
                        change({
                          included: items.map(i =>
                            i.key === item.key ? { ...i, text } : i,
                          ),
                        })}
                    />
                  </div>
                  <Button
                    isIconOnly
                    aria-label={t('products.details.itemRemove', {
                      n: index + 1,
                    })}
                    className="mt-6 shrink-0 text-danger"
                    size="sm"
                    variant="tertiary"
                    onPress={() =>
                      change({
                        included: items.filter(i => i.key !== item.key),
                      })}
                  >
                    <TrashIcon aria-hidden size={16} />
                  </Button>
                </div>
              ))}
              <Button
                className="w-fit"
                size="sm"
                variant="tertiary"
                onPress={() =>
                  change({
                    included: [
                      ...items,
                      { key: `new-${Date.now().toString(36)}`, text: {} },
                    ],
                  })}
              >
                <PlusIcon aria-hidden size={16} />
                {t('products.included.add')}
              </Button>
            </>
          )}
        </TextSheet>
      )}
      {open === 'excluded' && (
        <TextSheet
          language={language}
          title={t('products.field.excluded')}
          onClose={close}
        >
          {lang => (
            <LocalizedField
              error={editor.textError('excluded', lang, edit.excluded)}
              label={t('products.field.excluded')}
              language={lang}
              rows={3}
              value={edit.excluded}
              onChange={excluded => change({ excluded })}
            />
          )}
        </TextSheet>
      )}
      {open === 'conditions' && (
        <TextSheet
          language={language}
          title={t('products.field.conditions')}
          onClose={close}
        >
          {lang => (
            <LocalizedField
              error={editor.textError('conditions', lang, edit.conditions)}
              label={t('products.field.conditions')}
              language={lang}
              rows={5}
              value={edit.conditions}
              onChange={conditions => change({ conditions })}
            />
          )}
        </TextSheet>
      )}
    </>
  )
}
