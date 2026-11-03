import type { Issue, MissingText } from '@sk/domain/catalog'
import type { StepBar } from '@/components/step-bar'
import type { StepView } from '@/components/step-layout'
import type { Language } from '@/contexts/locale-context'

import { Alert, Button } from '@heroui/react'
import { LANGUAGES } from '@sk/domain/catalog'

import { EditIcon, RestoreIcon } from '@/components/icons'

import { StepMark } from '@/components/step-marks'
import { useLocale } from '@/contexts/locale-context'
import { ToneLine } from '@/features/tours/merchant/shared'
import { LanguageTabs, useFieldList } from './editor-parts'

/**
 * One step's body. A step with text gets the EN | DE switch (fit-content tabs, a dot on a
 * language that misses this step's required text); the fields render for that language.
 */
export function StepBody({
  step,
  language,
  onLanguage,
  render,
}: {
  step: StepView
  language: Language
  onLanguage: (language: Language) => void
  render: (language: Language) => React.ReactNode
}) {
  return (
    <section
      aria-labelledby="step-title"
      className="flex min-w-0 flex-col gap-5 lg:max-w-3xl lg:gap-6"
    >
      {step.missing
        ? (
            <LanguageTabs
              stepAlerts
              missing={step.missing}
              selected={language}
              onChange={onLanguage}
            >
              {lang => (
                <div className="flex flex-col gap-5 lg:gap-6">{render(lang)}</div>
              )}
            </LanguageTabs>
          )
        : (
            render(language)
          )}
    </section>
  )
}

/** "This gift is archived …" with "Restore as draft", instead of publishing (coordinator, rev. 2). */
export function ArchivedNotice({
  text,
  onRestore,
}: {
  text: string
  onRestore: () => void
}) {
  const { t } = useLocale()

  return (
    <Alert status="warning">
      <Alert.Indicator />
      <Alert.Content className="flex flex-col items-start gap-2">
        <Alert.Description>{text}</Alert.Description>
        <Button size="sm" variant="tertiary" onPress={onRestore}>
          <RestoreIcon aria-hidden size={16} />
          {t('products.action.restore')}
        </Button>
      </Alert.Content>
    </Alert>
  )
}

/** One step on the Review step: its facts, what it still needs, and "Edit". */
export function ReviewSection({
  index,
  step,
  issues,
  onEdit,
  children,
}: {
  index: number
  step: StepView
  issues: Issue[]
  onEdit: () => void
  children: React.ReactNode
}) {
  const { t } = useLocale()
  const titleId = `review-${step.id}`

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface lg:p-5"
    >
      <div className="flex items-center gap-3">
        <StepMark index={index} isCurrent={false} status={step.status} />
        <h3 className="min-w-0 flex-1 font-semibold" id={titleId}>
          {step.label}
        </h3>
        <Button
          aria-label={t('products.review.edit', { step: step.label })}
          size="sm"
          variant="tertiary"
          onPress={onEdit}
        >
          <EditIcon aria-hidden size={16} />
          {t('products.action.edit')}
        </Button>
      </div>
      <dl className="flex flex-col gap-2 text-sm">{children}</dl>
      {issues.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-separator pt-3">
          {issues.map(issue => (
            <li key={issue.text}>
              <ToneLine tone={issue.tone}>{issue.text}</ToneLine>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** One fact in a review section. */
export function ReviewRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-end break-words">{children}</dd>
    </div>
  )
}

/** The Review step's opening card: what publishing means, and each language's state (R02). */
export function ReviewOverview({
  description,
  missing,
}: {
  description: string
  missing: MissingText
}) {
  const { t } = useLocale()
  const fieldList = useFieldList()

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface lg:p-5">
      <p className="text-sm text-pretty">{description}</p>
      <div className="flex flex-col gap-2 border-t border-separator pt-3">
        {LANGUAGES.map(language => (
          <ToneLine
            key={language}
            tone={missing[language].length ? 'warning' : 'success'}
          >
            {missing[language].length
              ? t('products.lang.line.missing', {
                  language: t(`products.lang.${language}`),
                  fields: fieldList(missing[language]),
                })
              : t('products.lang.line.complete', {
                  language: t(`products.lang.${language}`),
                })}
          </ToneLine>
        ))}
        <p className="text-xs text-pretty text-muted">
          {t('products.lang.rule')}
        </p>
      </div>
    </section>
  )
}

/** What the bar shows for the stepper editors' common state. */
export function useStepBar({
  isNew,
  isReview,
  isFirst,
  live,
  archived,
  isDirty,
  hasErrors,
  publishRefused,
  storageFull,
  justSaved,
  isSaving,
  actions,
}: {
  isNew: boolean
  isReview: boolean
  isFirst: boolean
  live: boolean
  archived: boolean
  isDirty: boolean
  hasErrors: boolean
  publishRefused: boolean
  storageFull: boolean
  justSaved: boolean
  isSaving: boolean
  actions: {
    back: () => void
    next: () => void
    saveDraft: () => void
    saveChanges: () => void
    publish: () => void
    unpublish: () => void
  }
}): React.ComponentProps<typeof StepBar> {
  const { t } = useLocale()
  const status: Pick<
    React.ComponentProps<typeof StepBar>,
    'status' | 'tone'
  > = storageFull
    ? { status: t('products.storageFull'), tone: 'danger' }
    : hasErrors
      ? {
          status: t(
            publishRefused ? 'products.review.refused' : 'products.fixErrors',
          ),
          tone: 'danger',
        }
      : justSaved && !isDirty
        ? {
            status: t(live ? 'products.saved' : 'products.savedDraft'),
            tone: 'success',
          }
        : {
            status: t(
              isNew
                ? 'steps.notSaved'
                : isDirty
                  ? 'products.unsaved'
                  : 'products.noChanges',
            ),
            tone: 'muted',
          }
  const back = isFirst ? undefined : actions.back
  const shown = { ...status, isSaving }

  if (isNew) {
    return {
      ...shown,
      onBack: back,
      secondary: { label: t('products.saveDraft'), onPress: actions.saveDraft },
      primary: isReview
        ? { label: t('products.publish'), onPress: actions.publish }
        : { label: t('steps.next'), onPress: actions.next },
    }
  }
  if (!isReview) {
    return {
      ...shown,
      onBack: back,
      onForward: actions.next,
      primary: { label: t('products.save'), onPress: actions.saveChanges },
    }
  }
  if (archived || live) {
    return {
      ...shown,
      onBack: back,
      secondary: archived
        ? undefined
        : { label: t('products.unpublish'), onPress: actions.unpublish },
      primary: { label: t('products.save'), onPress: actions.saveChanges },
    }
  }

  return {
    ...shown,
    onBack: back,
    secondary: { label: t('products.saveDraft'), onPress: actions.saveDraft },
    primary: { label: t('products.publish'), onPress: actions.publish },
  }
}
