import type { Outcome } from '../hooks/use-keepsake-editor'
import type { OptionsDraftState, OptionsSnapshot } from '../hooks/use-options-draft'
import type { OptionDraft } from '../lib/option-rules'

import { Button } from '@heroui/react'
import { useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { Block } from '@/components/form-block'
import { ChevronRightIcon, OptionIcon, PlusIcon } from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { useIsWide } from '@/hooks/use-is-wide'
import { labelOf, optionsBody } from '../lib/option-rules'
import { problemMessageKey } from '../lib/problems'
import { NotesAt, QuietNote } from './option-bits'
import { OptionDetail } from './option-detail'
import { useDeleteOption } from './use-delete-option'

export type SaveOptions = (options: ReturnType<typeof optionsBody>, variantValues: { variantId: string, values: Record<string, string> }[]) => Promise<Outcome>

function needsLook(draft: OptionsDraftState, option: OptionDraft) {
  return [option.ref, `${option.ref}:assign`, ...option.values.map(value => value.ref)].some(at => draft.problemsAt(at).length > 0 || draft.refusalAt(at))
}

/** The options as a short list: the name, and the values as one grey line, or "Needs a look" when something is wrong in it. */
function OptionList({ draft, selected, onPick, onAdd }: { draft: OptionsDraftState, selected: string | undefined, onPick: (ref: string) => void, onAdd: () => void }) {
  const { t, language } = useLocale()

  return (
    <nav aria-label={t('keepsakes.options.title')} className="flex flex-col gap-1">
      <ul className="flex flex-col gap-1">
        {draft.options.map((option) => {
          const look = needsLook(draft, option)
          const values = option.values.filter(value => labelOf(value.label) !== '').map(value => labelOf(value.label, language)).join(', ')

          return (
            <li key={option.ref}>
              <button
                aria-current={option.ref === selected ? 'true' : undefined}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2 text-start outline-none transition-colors duration-150 hover:bg-default/50 focus-visible:focus-ring lg:aria-[current]:bg-default"
                type="button"
                onClick={() => onPick(option.ref)}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{labelOf(option.name, language) || t('keepsakes.options.unnamed')}</span>
                  <span className={`truncate text-sm ${look ? 'text-danger' : 'text-muted'}`}>
                    {look ? t('keepsakes.options.needsLook') : values || t('keepsakes.options.noValues')}
                  </span>
                </span>
                <ChevronRightIcon aria-hidden className="shrink-0 text-muted lg:hidden" size={18} />
              </button>
            </li>
          )
        })}
      </ul>
      <Button className="-ms-1 self-start max-lg:h-11" variant="ghost" onPress={onAdd}>
        <PlusIcon aria-hidden size={16} />
        {t('keepsakes.options.add')}
      </Button>
    </nav>
  )
}

/**
 * The foot of the block, one row of actions. A saved keepsake: Delete option at the start (laptop only: the phone deletes
 * from the sheet), Discard changes and Save at the end, both disabled until something changed, with Save the one filled
 * button (options never autosave and save whole, ADR-027). Discard undoes every unsaved option edit; it does not delete
 * the option. A new keepsake has nothing to save here, so the row holds Delete option alone and the line above says what
 * stops the step from going on.
 */
function ActionRow({ draft, onSave, isPending, failure, onDiscard, onDelete, option }: { draft: OptionsDraftState, onSave: (() => void) | undefined, isPending: boolean, failure: string | undefined, onDiscard: () => void, onDelete: (() => void) | undefined, option: OptionDraft | undefined }) {
  const { t } = useLocale()
  const count = draft.problems.length

  return (
    <div className="flex flex-col gap-3 pt-2 lg:ms-[calc(14rem+2.5rem)]" data-testid="save-line">
      {draft.tried && count > 0 && (
        <p className="text-sm text-pretty text-danger" role="alert">
          {t(onSave ? (count === 1 ? 'keepsakes.options.notSaved.one' : 'keepsakes.options.notSaved.other') : (count === 1 ? 'keepsakes.options.fix.one' : 'keepsakes.options.fix.other'), { count })}
        </p>
      )}
      {failure && <QuietNote>{failure}</QuietNote>}
      {option && onDelete && <NotesAt at={option.ref} draft={draft} only="refusal" />}
      {(onSave || onDelete) && (
        <div className="flex flex-wrap items-center gap-2">
          {onDelete && <Button className="me-auto max-lg:h-11" isDisabled={isPending} variant="danger-soft" onPress={onDelete}>{t('keepsakes.options.deleteOption')}</Button>}
          {onSave && (
            <>
              {/* Not shown, said: the buttons' disabled state is the visible cue. */}
              <p aria-live="polite" className="sr-only" role="status">{draft.dirty ? t('keepsakes.options.unsaved') : t('keepsakes.options.allSaved')}</p>
              <Button className="ms-auto max-lg:h-11" isDisabled={isPending || !draft.dirty} variant="ghost" onPress={onDiscard}>{t('keepsakes.options.discard')}</Button>
              <Button className="max-lg:h-11" isDisabled={!draft.dirty} isPending={isPending} onPress={onSave}>{t('keepsakes.options.save')}</Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** The phone's way to an option: the sheet. Save keeps the change (a saved keepsake sends it, a new one checks it); Cancel puts back what the sheet opened on. */
function OptionSheet({ draft, option, isAdd, isSaving, failure, saves, onSave, onCancel, onDelete }: {
  draft: OptionsDraftState
  option: OptionDraft
  /** Opened by Add option, not by a tap on an option. */
  isAdd: boolean
  isSaving: boolean
  failure: string | undefined
  /** A saved keepsake sends the options (Save); a new one only keeps them in the browser (Done). */
  saves: boolean
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
}) {
  const { t, language } = useLocale()
  const count = draft.problems.length

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth className="min-h-11" isPending={isSaving} onPress={onSave}>{t(saves ? 'keepsakes.options.save' : 'keepsakes.options.done')}</Button>
          <Button fullWidth className="min-h-11" isDisabled={isSaving} variant="tertiary" onPress={onCancel}>{t('keepsakes.variant.cancel')}</Button>
          <Button fullWidth className="min-h-11" isDisabled={isSaving} variant="danger-soft" onPress={onDelete}>{t('keepsakes.options.deleteOption')}</Button>
        </>
      )}
      title={isAdd ? t('keepsakes.optionsSheet.addTitle') : t('keepsakes.optionsSheet.editTitle', { option: labelOf(option.name, language) || t('keepsakes.options.thisOption') })}
      onClose={onCancel}
    >
      <OptionDetail autoFocusName={isAdd} draft={draft} option={option} />
      <NotesAt at={option.ref} draft={draft} only="refusal" />
      {draft.tried && count > 0 && (
        <p className="text-sm text-pretty text-danger" role="alert">
          {t(saves ? (count === 1 ? 'keepsakes.options.notSaved.one' : 'keepsakes.options.notSaved.other') : (count === 1 ? 'keepsakes.options.fix.one' : 'keepsakes.options.fix.other'), { count })}
        </p>
      )}
      {failure && <QuietNote>{failure}</QuietNote>}
    </SheetFrame>
  )
}

/**
 * The Options step, for a saved keepsake (`onSave`: the options go in one request) and for a new one (no `onSave`: they
 * stay in the browser until Create keepsake). From 1024 px a list of options on the left and the chosen one on the right;
 * below it the list alone, and an option opens in the shared sheet (owner, 30.10.2026).
 */
export function OptionsStep({ draft, onSave }: { draft: OptionsDraftState, onSave?: SaveOptions }) {
  const { t } = useLocale()
  const wide = useIsWide()
  const attention = draft.options.find(option => draft.isNew(option.ref) || needsLook(draft, option))
  const [selected, setSelected] = useState<string | undefined>(() => (attention ?? draft.options[0])?.ref)
  const [added, setAdded] = useState<string>()
  const [sheet, setSheet] = useState<{ ref: string, snapshot: OptionsSnapshot, isAdd: boolean }>()
  const [isSaving, setIsSaving] = useState(false)
  const [failure, setFailure] = useState<string>()
  const { remove, dialog } = useDeleteOption(draft)
  const option = draft.options.find(o => o.ref === selected) ?? draft.options[0]
  const sheetOption = sheet && draft.options.find(o => o.ref === sheet.ref)

  const add = () => {
    const snapshot = draft.snapshot()
    const ref = draft.addOption()

    setAdded(ref)
    if (wide)
      setSelected(ref)
    else
      setSheet({ ref, snapshot, isAdd: true })
  }
  const pick = (ref: string) => {
    setAdded(undefined)
    if (wide)
      setSelected(ref)
    else
      setSheet({ ref, snapshot: draft.snapshot(), isAdd: false })
  }

  /** The options of a saved keepsake in one request; true when they are saved. */
  const save = async () => {
    setFailure(undefined)
    if (!onSave || draft.check().length > 0)
      return false
    setIsSaving(true)
    const outcome = await onSave(optionsBody(draft.options), Object.entries(draft.assigned).map(([variantId, values]) => ({ variantId, values })))

    setIsSaving(false)
    if (outcome.ok) {
      draft.settle()

      return true
    }
    if (outcome.refusals && outcome.refusals.length > 0)
      draft.setServerProblems(outcome.refusals)
    else
      setFailure(t(problemMessageKey(outcome.type)))

    return false
  }
  const discard = () => {
    setFailure(undefined)
    draft.discard()
  }

  const finishSheet = async () => {
    if (onSave ? await save() : draft.check().length === 0)
      setSheet(undefined)
  }
  const cancelSheet = () => {
    if (sheet)
      draft.restore(sheet.snapshot)
    setFailure(undefined)
    setSheet(undefined)
  }

  return (
    <Block hint={t('keepsakes.options.hint')} icon={OptionIcon} id="options" title={t('keepsakes.options.title')}>
      {draft.options.length === 0 || !option
        ? (
            <EmptyState compact icon={OptionIcon} message={t('keepsakes.options.none')}>
              <Button className="max-lg:h-11" onPress={add}>
                <PlusIcon aria-hidden size={16} />
                {t('keepsakes.options.add')}
              </Button>
            </EmptyState>
          )
        : (
            <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
              <OptionList draft={draft} selected={wide ? option.ref : undefined} onAdd={add} onPick={pick} />
              {wide && <OptionDetail key={option.ref} autoFocusName={option.ref === added} draft={draft} option={option} />}
            </div>
          )}
      {draft.options.length > 0 && <ActionRow draft={draft} failure={sheet ? undefined : failure} isPending={isSaving} option={wide ? option : undefined} onDelete={wide && option ? () => void remove(option, () => setSelected(undefined)) : undefined} onDiscard={discard} onSave={onSave && (() => void save())} />}
      {sheet && sheetOption && (
        <OptionSheet
          draft={draft}
          failure={failure}
          isAdd={sheet.isAdd}
          saves={onSave !== undefined}
          isSaving={isSaving}
          option={sheetOption}
          onCancel={cancelSheet}
          onDelete={() => void remove(sheetOption, () => setSheet(undefined))}
          onSave={() => void finishSheet()}
        />
      )}
      {dialog}
    </Block>
  )
}
