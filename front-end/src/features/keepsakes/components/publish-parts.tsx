import type { Product, PublishCheck } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { Outcome } from '../hooks/use-keepsake-editor'

import { Button, toast } from '@heroui/react'
import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { ChevronDownIcon, StatusDangerIcon, StatusSuccessIcon, StatusWarningIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { checkText, fullLanguages, nameIn, textOf } from '../lib/keepsake-rules'
import { problemMessageKey } from '../lib/problems'
import { KeepsakeLanguageSwitch } from './basics-fields'

export interface PublishActions {
  publish: () => Promise<Outcome>
  unpublish: () => Promise<Outcome>
  isPending: boolean
  /** A blocked attempt: the edit screen shows the errors at its fields. */
  onBlocked: () => void
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

/** Publish, publish the edits of a live keepsake, or unpublish it (asks first). `bar` is the phone's pinned bar. */
export function PublishButtons({ keepsake, actions, layout = 'stack' }: { keepsake: Product, actions: PublishActions, layout?: 'stack' | 'bar' }) {
  const { t } = useLocale()
  const { confirm, dialog } = useConfirm()
  const blocked = keepsake.blocking.length > 0
  const live = keepsake.status === 'published'

  const fail = (outcome: Extract<Outcome, { ok: false }>) => {
    if (outcome.type === 'publish-incomplete')
      actions.onBlocked()
    toast.danger(t(problemMessageKey(outcome.type)))
  }

  const publish = async () => {
    const outcome = await actions.publish()

    if (outcome.ok) {
      const languages = fullLanguages({ name: textOf(keepsake.name), text: textOf(keepsake.text) })

      toast.success(t('keepsakes.toast.published', { languages: languages.map(language => t(`keepsakes.language.${language}`)).join(` ${t('keepsakes.and')} `) }))
    }
    else {
      fail(outcome)
    }
  }
  const unpublish = async () => {
    const confirmed = await confirm({
      title: t('keepsakes.unpublish.title'),
      body: t('keepsakes.unpublish.body'),
      confirmLabel: t('keepsakes.unpublish.confirm'),
    })

    if (!confirmed)
      return
    const outcome = await actions.unpublish()

    if (outcome.ok)
      toast(t('keepsakes.toast.unpublished'))
    else
      fail(outcome)
  }

  return (
    <div className={`flex gap-2 ${layout === 'stack' ? 'flex-col' : 'shrink-0 flex-row items-center'}`}>
      {(!live || keepsake.hasUnpublishedEdits) && (
        <Button className={`max-lg:h-11 ${layout === 'stack' ? 'order-first' : ''}`} fullWidth={layout === 'stack'} isDisabled={blocked} isPending={actions.isPending} onPress={() => void publish()}>
          {t(live ? 'keepsakes.publishChanges' : 'keepsakes.publish')}
        </Button>
      )}
      {live && (layout === 'stack' || !keepsake.hasUnpublishedEdits) && (
        <Button className="max-lg:h-11" fullWidth={layout === 'stack'} isDisabled={actions.isPending} variant="danger-soft" onPress={() => void unpublish()}>{t('keepsakes.unpublish')}</Button>
      )}
      {blocked && layout === 'stack' && <p className="text-xs text-danger">{t('keepsakes.checks.fixFirst')}</p>}
      {dialog}
    </div>
  )
}

/** The head of the publish card: the language switch (it drives the preview), the name, and what goes live. */
export function PublishHead({ keepsake, language, onLanguage }: { keepsake: Product, language: Language, onLanguage: (language: Language) => void }) {
  const { t } = useLocale()
  const text = { name: textOf(keepsake.name), text: textOf(keepsake.text) }
  const full = fullLanguages(text)
  const other = (l: Language) => (l === 'en' ? 'de' : 'en')
  const address = keepsake.slug?.[language]

  return (
    <div className="flex flex-col gap-3" id="publish-card">
      <div className="flex flex-col gap-1.5">
        <KeepsakeLanguageSwitch selected={language} value={text} onChange={onLanguage} />
        <p className="text-xs text-muted">{t('keepsakes.publish.switchHint')}</p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-serif text-lg text-pretty" lang={language}>{nameIn(keepsake.name, language) || t('keepsakes.untitled')}</p>
        <p className="text-sm text-pretty text-muted">
          {full.length === 2
            ? t('keepsakes.publish.goesLive.both')
            : full.length === 1
              ? t('keepsakes.publish.goesLive.one', { language: t(`keepsakes.language.${full[0]!}`), other: t(`keepsakes.language.${other(full[0]!)}`) })
              : t('keepsakes.publish.needsLanguage')}
        </p>
        <p className="truncate text-xs text-muted">{address ? t('keepsakes.publish.address', { language, slug: address }) : t('keepsakes.publish.addressLater')}</p>
      </div>
    </div>
  )
}

/** Phones: the checks fold into one line above Publish, pinned over the tab bar. They open by themselves when something blocks. */
export function PhonePublishBar({ keepsake, actions, onFix }: { keepsake: Product, actions: PublishActions, onFix: (check: PublishCheck) => void }) {
  const { t } = useLocale()
  const { blocking, warnings } = keepsake
  const [expanded, setExpanded] = useState(blocking.length > 0)
  const summary = blocking.length
    ? t(blocking.length === 1 ? 'keepsakes.checks.blocking.one' : 'keepsakes.checks.blocking.other', { count: blocking.length })
    : warnings.length ? t('keepsakes.bar.readyWithWarnings', { count: warnings.length }) : t('keepsakes.checks.ready')
  const Icon = blocking.length ? StatusDangerIcon : warnings.length ? StatusWarningIcon : StatusSuccessIcon

  return (
    <div className="fixed inset-x-0 bottom-16 z-20 flex flex-col border-t border-separator bg-surface shadow-overlay">
      {expanded && (
        <div className="max-h-[42dvh] overflow-y-auto border-b border-separator px-4 py-3">
          <ChecksList
            keepsake={keepsake}
            onFix={(check) => {
              setExpanded(false)
              onFix(check)
            }}
          />
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-2">
        <button aria-expanded={expanded} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-1 text-start text-sm font-medium outline-none focus-visible:focus-ring" type="button" onClick={() => setExpanded(open => !open)}>
          <Icon aria-hidden className={`shrink-0 ${blocking.length ? 'text-danger' : warnings.length ? 'text-warning' : 'text-success'}`} size={18} />
          <span className="min-w-0 flex-1 truncate">{summary}</span>
          <ChevronDownIcon aria-hidden className={`shrink-0 text-muted transition-transform ${expanded ? '' : 'rotate-180'}`} size={16} />
        </button>
        <PublishButtons actions={actions} keepsake={keepsake} layout="bar" />
      </div>
    </div>
  )
}
