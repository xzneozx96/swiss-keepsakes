import type { Language } from '@sk/domain/shared'
import type { OptionsDraftState } from '../hooks/use-options-draft'
import type { OptionsFlow } from '../hooks/use-options-flow'
import type { OptionDraft } from '../lib/option-rules'

import { Button } from '@heroui/react'
import { MAX_OPTIONS } from '@sk/api-contract'
import { useRef, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { Block } from '@/components/form-block'
import { GripIcon, OptionIcon, PlusIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useStopDrag } from '@/hooks/use-stop-drag'
import { namedValues } from '../lib/combinations'
import { labelOf, moveItem } from '../lib/option-rules'
import { NotesAt } from './option-bits'
import { OptionEditor } from './option-editor'
import { StatusText } from './status-text'
import { useDeleteOption } from './use-delete-option'

/** A finished option as one row: the grip, the name, its values as chips and Edit. */
function OptionRow({ draft, option, grip, language, isLocked, onEdit }: { draft: OptionsDraftState, option: OptionDraft, grip: React.ReactNode, language: Language, isLocked: boolean, onEdit: () => void }) {
  const { t } = useLocale()
  const name = labelOf(option.name, language) || t('keepsakes.options.unnamed')
  // On the English side, a gap in the German texts would otherwise stay out of sight.
  const germanMissing = language === 'en' && (!option.name.de?.trim() || namedValues(option).some(value => !value.label.de?.trim()))

  return (
    <div className="flex min-w-0 flex-col" data-testid="option-row">
      <div className="flex min-h-14 min-w-0 items-center gap-1 rounded-2xl border border-separator ps-1 pe-3">
        {grip}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-2">
          <span className="flex min-w-0 items-center gap-3">
            <span className="truncate font-medium">{name}</span>
            {germanMissing && <StatusText tone="warning">{t('keepsakes.options.germanMissing')}</StatusText>}
          </span>
          <ul className="flex flex-wrap gap-1.5">
            {namedValues(option).map(value => (
              <li key={value.ref} className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-default px-2.5 text-xs font-medium">
                <span className="truncate">{labelOf(value.label, language)}</span>
              </li>
            ))}
          </ul>
        </div>
        <Button className="shrink-0 max-lg:h-11" isDisabled={isLocked} size="sm" variant="tertiary" onPress={onEdit}>{t('keepsakes.options.edit')}</Button>
      </div>
      <NotesAt at={option.ref} draft={draft} />
    </div>
  )
}

/**
 * The finished options in the order that groups the variants, a grip on each to change it: the arrow keys on the grip move
 * a row one step, a pointer drags it. Only the order moves; each option keeps its values.
 */
function OptionRows({ draft, language, flow, suggestions, onDelete }: { draft: OptionsDraftState, language: Language, flow: OptionsFlow, suggestions: { en?: string, de?: string }[], onDelete: (option: OptionDraft) => void }) {
  const { t } = useLocale()
  const listRef = useRef<HTMLOListElement>(null)
  const placeholderRef = useRef<HTMLDivElement>(null)
  const [announcement, setAnnouncement] = useState('')
  const nameOf = (option: OptionDraft) => labelOf(option.name, language) || t('keepsakes.options.unnamed')
  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= draft.options.length || to === from || flow.open)
      return
    void flow.saveList(moveItem(draft.options, from, to))
    setAnnouncement(t('keepsakes.options.moved', { name: nameOf(draft.options[from]!), position: to + 1, count: draft.options.length }))
  }
  const drag = useStopDrag({ listRef, placeholderRef, onStart: () => undefined, onDrop: moveTo })

  return (
    <div className="relative">
      <ol ref={listRef} aria-label={t('keepsakes.options.title')} className="flex flex-col gap-2">
        {draft.options.map((option, index) => (
          <li key={option.ref} className="group">
            {flow.open?.ref === option.ref && flow.openOption
              ? (
                  <OptionEditor
                    autoFocusName={flow.open.isNew}
                    canCancel
                    draft={draft}
                    failure={flow.failure}
                    isPending={flow.isPending}
                    language={language}
                    option={flow.openOption}
                    suggestions={suggestions.flatMap(name => name[language] ?? [])}
                    onCancel={flow.cancel}
                    onDelete={() => onDelete(option)}
                    onDone={() => void flow.done()}
                  />
                )
              : (
                  <OptionRow
                    draft={draft}
                    grip={(
                      <button
                        {...drag.handleProps(index)}
                        aria-label={t('keepsakes.options.moveOption', { name: nameOf(option), position: index + 1, count: draft.options.length })}
                        className="relative grid size-11 shrink-0 cursor-grab place-items-center rounded-full text-muted outline-none before:absolute before:-inset-1 before:content-[''] focus-visible:focus-ring active:cursor-grabbing lg:size-9"
                        style={{ touchAction: 'none' }}
                        type="button"
                        onKeyDown={(event) => {
                          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                            event.preventDefault()
                            moveTo(index, index + (event.key === 'ArrowUp' ? -1 : 1))
                          }
                          drag.handleProps(index).onKeyDown?.(event)
                        }}
                      >
                        <GripIcon aria-hidden size={18} />
                      </button>
                    )}
                    isLocked={flow.open !== undefined}
                    language={language}
                    option={option}
                    onEdit={() => flow.edit(option.ref)}
                  />
                )}
          </li>
        ))}
      </ol>
      <div ref={placeholderRef} aria-hidden hidden className="pointer-events-none absolute inset-x-0 rounded-2xl border-2 border-dashed border-accent bg-accent/10" />
      <p aria-live="polite" className="sr-only" role="status">{announcement}</p>
    </div>
  )
}

/**
 * The Options block of the merged step: what guests choose between, like size or colour. No option shows the empty state
 * with Add option. Each option is one row; the open one is the inline editor. Deleting an option asks first.
 */
export function OptionsBlock({ draft, language, flow, committed, suggestions }: { draft: OptionsDraftState, language: Language, flow: OptionsFlow, committed: ReadonlySet<string>, /** The option names that the shop's other keepsakes use. */ suggestions: { en?: string, de?: string }[] }) {
  const { t } = useLocale()
  const { remove, dialog } = useDeleteOption(draft)

  /** An option that was only just added goes without a question: nothing was saved. */
  const onDelete = (option: OptionDraft) => {
    if (!committed.has(option.ref)) {
      flow.cancel()

      return
    }
    void remove(option, () => void flow.saveList(draft.options.filter(other => other.ref !== option.ref)))
  }

  return (
    <Block hint={t('keepsakes.options.hint')} icon={OptionIcon} id="options" title={t('keepsakes.options.title')}>
      {draft.options.length === 0
        ? (
            <EmptyState compact icon={OptionIcon} message={t('keepsakes.options.none')}>
              <Button className="max-lg:h-11" onPress={() => void flow.add()}>
                <PlusIcon aria-hidden size={16} />
                {t('keepsakes.options.add')}
              </Button>
            </EmptyState>
          )
        : (
            <>
              <OptionRows draft={draft} flow={flow} language={language} suggestions={suggestions} onDelete={onDelete} />
              {draft.options.length < MAX_OPTIONS && (
                <Button className="-ms-1 self-start max-lg:h-11" isDisabled={flow.isPending} variant="ghost" onPress={() => void flow.add()}>
                  <PlusIcon aria-hidden size={16} />
                  {t('keepsakes.options.addAnother')}
                </Button>
              )}
            </>
          )}
      {dialog}
    </Block>
  )
}
