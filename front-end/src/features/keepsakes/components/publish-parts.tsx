import type { Product, PublishCheck } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { Outcome } from '../hooks/use-keepsake-editor'

import { Button } from '@heroui/react'

import { useConfirm } from '@/components/confirm-dialog'
import { StatusDangerIcon, StatusSuccessIcon, StatusWarningIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { checkText, descriptionsOf, nameIn, textOf } from '../lib/keepsake-rules'
import { problemMessageKey } from '../lib/problems'
import { KeepsakeLanguageSwitch } from './basics-fields'

export interface PublishActions {
  unpublish: () => Promise<Outcome>
  isPending: boolean
}

/** The checks: blocking ones first, each with Edit that jumps to its card; then the warnings with Show. */
export function ChecksList({ keepsake, onFix }: { keepsake: Product, onFix: (check: PublishCheck) => void }) {
  const { t } = useLocale()
  const { blocking, warnings } = keepsake

  return (
    <div className="flex flex-col gap-3" data-testid="publish-checks">
      <h3 className="text-sm font-semibold">
        {blocking.length ? t(blocking.length === 1 ? 'keepsakes.checks.blocking.one' : 'keepsakes.checks.blocking.other', { count: blocking.length }) : t('keepsakes.checks.ready')}
      </h3>
      <ul className="flex flex-col gap-2">
        {blocking.map(check => (
          <li key={check.code} className="flex items-start gap-2 text-sm font-medium" data-check={check.code}>
            <StatusDangerIcon aria-hidden className="mt-0.5 shrink-0 text-danger" size={16} />
            <span className="min-w-0 flex-1 text-pretty">{checkText(t, check)}</span>
            <button className="min-h-11 min-w-11 shrink-0 text-sm text-foreground underline underline-offset-4 lg:min-h-0 lg:min-w-0" type="button" onClick={() => onFix(check)}>{t('keepsakes.checks.edit')}</button>
          </li>
        ))}
        {!blocking.length && (
          <li className="flex items-start gap-2 text-sm">
            <StatusSuccessIcon aria-hidden className="mt-0.5 shrink-0 text-success" size={16} />
            <span>{t('keepsakes.checks.allSet')}</span>
          </li>
        )}
      </ul>
      {warnings.length > 0 && (
        <>
          <h3 className="pt-1 text-sm font-semibold">{t('keepsakes.checks.warnings', { count: warnings.length })}</h3>
          <ul className="flex flex-col gap-2">
            {warnings.map(check => (
              <li key={check.code} className="flex items-start gap-2 text-sm" data-check={check.code}>
                <StatusWarningIcon aria-hidden className="mt-0.5 shrink-0 text-warning" size={16} />
                <span className="min-w-0 flex-1 text-pretty">{checkText(t, check)}</span>
                <button className="min-h-11 min-w-11 shrink-0 text-sm text-muted underline underline-offset-4 lg:min-h-0 lg:min-w-0" type="button" onClick={() => onFix(check)}>{t('keepsakes.checks.show')}</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/** What the card's main action does: the saved editor publishes the live edits, the new one makes the keepsake first. */
export interface PublishCardActions extends PublishActions {
  publish: () => void
  /** The new keepsake only: make it and stop at a draft. */
  saveDraft?: () => void
  /** A request is on its way: the buttons are off. */
  isBusy?: boolean
}

/**
 * The card's actions under the name, one main button full width. Draft: Publish (and Save as draft for a new keepsake).
 * Live with edits: Publish changes, then Unpublish. Live and nothing pending: Unpublish alone. Unpublish takes the whole
 * keepsake off sale, so it asks first and says both languages; a refusal stays inside the dialog.
 */
export function PublishButtons({ keepsake, actions }: { keepsake: Product, actions: PublishCardActions }) {
  const { t } = useLocale()
  const { confirm, dialog } = useConfirm()
  const live = keepsake.status === 'published'
  const off = actions.isPending || actions.isBusy

  const unpublish = () => confirm({
    title: t('keepsakes.unpublish.title'),
    body: t('keepsakes.unpublish.body'),
    confirmLabel: t('keepsakes.unpublish.confirm'),
    // The dialog waits for the answer and keeps a refusal inside itself.
    run: async () => {
      const outcome = await actions.unpublish()

      if (!outcome.ok)
        throw new Error(t(problemMessageKey(outcome.type)))
    },
    problem: error => (error instanceof Error ? error.message : t(problemMessageKey('unknown'))),
  })

  return (
    <div className="flex flex-col gap-2">
      {(!live || keepsake.hasUnpublishedEdits) && (
        <Button fullWidth className="max-lg:min-h-11" isDisabled={off || keepsake.blocking.length > 0} onPress={actions.publish}>
          {t(live ? 'keepsakes.publishChanges' : 'keepsakes.publish')}
        </Button>
      )}
      {actions.saveDraft && (
        <Button fullWidth className="max-lg:min-h-11" isDisabled={off} variant="secondary" onPress={actions.saveDraft}>{t('keepsakes.review.saveDraft')}</Button>
      )}
      {live && (
        <Button fullWidth className="max-lg:min-h-11" isDisabled={off} variant="danger-soft" onPress={() => void unpublish()}>{t('keepsakes.unpublish')}</Button>
      )}
      {dialog}
    </div>
  )
}

/** The head of the publish card: the language switch (it drives the preview) and the name. */
export function PublishHead({ keepsake, language, onLanguage }: { keepsake: Product, language: Language, onLanguage: (language: Language) => void }) {
  const { t } = useLocale()
  const text = { name: textOf(keepsake.name), text: descriptionsOf(keepsake.text) }

  return (
    <div className="flex flex-col gap-3" id="publish-card">
      <KeepsakeLanguageSwitch selected={language} value={text} onChange={onLanguage} />
      <p className="font-serif text-lg text-pretty" lang={language}>{nameIn(keepsake.name, language) || t('keepsakes.untitled')}</p>
    </div>
  )
}
