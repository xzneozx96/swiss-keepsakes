import type { Product, PublishCheck } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { Outcome } from '../hooks/use-keepsake-editor'

import { Button } from '@heroui/react'

import { useConfirm } from '@/components/confirm-dialog'
import { StatusDangerIcon, StatusSuccessIcon, StatusWarningIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { checkText, fullLanguages, nameIn, textOf } from '../lib/keepsake-rules'
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

/** Unpublish a live keepsake. It asks first: guests lose the page. Publish is the step bar's red action. */
export function UnpublishButton({ actions }: { actions: PublishActions }) {
  const { t } = useLocale()
  const { confirm, dialog } = useConfirm()

  const unpublish = async () => {
    const confirmed = await confirm({
      title: t('keepsakes.unpublish.title'),
      body: t('keepsakes.unpublish.body'),
      confirmLabel: t('keepsakes.unpublish.confirm'),
    })

    if (!confirmed)
      return
    await actions.unpublish()
  }

  return (
    <>
      <Button className="self-start max-lg:min-h-11" isDisabled={actions.isPending} variant="danger-soft" onPress={() => void unpublish()}>{t('keepsakes.unpublish')}</Button>
      {dialog}
    </>
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
        <p className="text-xs text-muted [overflow-wrap:anywhere]">{address ? t('keepsakes.publish.address', { language, slug: address }) : t('keepsakes.publish.addressLater')}</p>
      </div>
    </div>
  )
}
