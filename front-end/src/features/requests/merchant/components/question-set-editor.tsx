import type { AdviceQuestion } from '@sk/domain/requests'

import {
  Alert,
  Button,
  Description,
  FieldError,
  Input,
  Label,
  TextField,
  toast,
} from '@heroui/react'
import { formatOrderDateTime } from '@sk/domain/orders'

import { looksLikeEmail } from '@sk/domain/requests'
import { useState } from 'react'
import {
  ChevronDownIcon,
  EmailIcon,
  MessageIcon,
  PlusIcon,
} from '@/components/icons'

import { InfoNote } from '@/components/info-note'

import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { DetailCard } from '@/features/merchant/order-detail/components/detail-card'
import { useQuestionSet } from '../hooks/use-question-set'
import { isChoice, missingLanguages } from '../lib/question-set'
import { QuestionSheet } from './question-sheet'

/** The sheet's subject: an existing question, or a new one. */
type Editing = { question: AdviceQuestion } | { question: null } | null

/**
 * M19 Questions tab (spec M19, outline step 15): where requests go, then the trip
 * assistant's questions in the order it asks them. Each row shows the EN and DE text with a
 * warning where one is missing, the answer type and whether it is required; arrows reorder,
 * and a tap opens the edit sheet. Every change applies to new requests only (AC18).
 */
export function QuestionSetEditor() {
  const { t, intlLocale } = useLocale()
  const editor = useQuestionSet()
  const { set, incomplete } = editor
  const [editing, setEditing] = useState<Editing>(null)
  const plural = (count: number) =>
    new Intl.PluralRules(intlLocale).select(count) === 'one' ? 'one' : 'other'
  const last = set.questions.length - 1

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <InfoNote text={t('adviceQuestions.note')} />

      {/* Keyed on the saved address, so Reset or a save restarts the field. */}
      <RecipientCard
        key={set.recipientEmail}
        email={set.recipientEmail}
        onSave={(email) => {
          editor.setRecipient(email)
          toast.success(t('adviceQuestions.recipient.saved'))
        }}
      />

      <DetailCard
        icon={MessageIcon}
        id="m19-questions"
        title={t('adviceQuestions.list.title')}
        trailing={(
          <Button
            className="shrink-0"
            size="sm"
            variant="secondary"
            onPress={() => setEditing({ question: null })}
          >
            <PlusIcon aria-hidden size={16} />
            {t('adviceQuestions.add')}
          </Button>
        )}
      >
        <p className="-mt-2 text-sm text-muted tabular-nums">
          {t('adviceQuestions.list.order', {
            at: formatOrderDateTime(set.updatedAt, intlLocale),
          })}
        </p>
        {incomplete > 0 && (
          <Alert className="alert--soft w-full" status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>
                {t(`adviceQuestions.missing.${plural(incomplete)}`, {
                  count: incomplete,
                })}
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}
        <ol className="flex flex-col divide-y divide-separator">
          {set.questions.map((q, i) => {
            const missing = missingLanguages(q)
            const name = q.text.en || q.text.de || ''
            const meta = [
              t(`adviceQuestions.type.${q.type}`),
              t(
                q.required
                  ? 'adviceQuestions.required'
                  : 'adviceQuestions.optional',
              ),
              ...(isChoice(q)
                ? [
                    t(
                      `adviceQuestions.options.${plural(q.options?.length ?? 0)}`,
                      { count: q.options?.length ?? 0 },
                    ),
                  ]
                : []),
            ].join(' · ')

            return (
              <li
                key={q.id}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-surface-secondary text-sm font-semibold tabular-nums">
                  {i + 1}
                </span>
                <button
                  aria-label={t('adviceQuestions.edit', { question: name })}
                  className="-my-1 flex min-w-0 flex-1 flex-col gap-1 rounded-xl py-1 text-start outline-none hover:bg-surface-secondary focus-visible:focus-ring"
                  type="button"
                  onClick={() => setEditing({ question: q })}
                >
                  {(['en', 'de'] as const).map(l => (
                    <span key={l} className="flex items-start gap-2">
                      <span className="mt-0.5 w-6 shrink-0 font-mono text-[11px] text-muted uppercase">
                        {l}
                      </span>
                      {q.text[l]?.trim()
                        ? (
                            <span
                              className={l === 'en' ? 'font-medium' : 'text-sm'}
                              lang={l}
                            >
                              {q.text[l]}
                            </span>
                          )
                        : (
                            <span className="text-sm text-muted">—</span>
                          )}
                    </span>
                  ))}
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5 ps-8 pt-1">
                    <span className="text-xs text-muted">{meta}</span>
                    {missing.map(l => (
                      <StatusChip key={l} tone="warning">
                        {t(`adviceQuestions.missingChip.${l}`)}
                      </StatusChip>
                    ))}
                  </span>
                </button>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    isIconOnly
                    aria-label={t('adviceQuestions.moveUp', { question: name })}
                    isDisabled={i === 0}
                    size="sm"
                    variant="ghost"
                    onPress={() => editor.move(q.id, -1)}
                  >
                    <ChevronDownIcon
                      aria-hidden
                      className="rotate-180"
                      size={18}
                    />
                  </Button>
                  <Button
                    isIconOnly
                    aria-label={t('adviceQuestions.moveDown', {
                      question: name,
                    })}
                    isDisabled={i === last}
                    size="sm"
                    variant="ghost"
                    onPress={() => editor.move(q.id, 1)}
                  >
                    <ChevronDownIcon aria-hidden size={18} />
                  </Button>
                </div>
              </li>
            )
          })}
        </ol>
      </DetailCard>

      {editing && (
        <QuestionSheet
          canDelete={set.questions.length > 1}
          question={editing.question}
          onClose={() => setEditing(null)}
          onDelete={(id) => {
            editor.removeQuestion(id)
            setEditing(null)
            toast.success(t('adviceQuestions.deleted'))
          }}
          onSave={(question) => {
            editor.saveQuestion(question)
            setEditing(null)
            toast.success(t('adviceQuestions.saved'))
          }}
        />
      )}
    </div>
  )
}

/** Where N16 goes: one field, saved on its own. */
function RecipientCard({
  email,
  onSave,
}: {
  email: string
  onSave: (email: string) => void
}) {
  const { t } = useLocale()
  const [value, setValue] = useState(email)
  const [error, setError] = useState<string | null>(null)
  const changed = value.trim() !== email

  return (
    <DetailCard
      icon={EmailIcon}
      id="m19-recipient"
      title={t('adviceQuestions.recipient.title')}
    >
      <form
        noValidate
        className="flex flex-col gap-3 sm:flex-row sm:items-start"
        onSubmit={(e) => {
          e.preventDefault()
          const next = value.trim()

          if (!looksLikeEmail(next)) {
            setError(t('adviceQuestions.recipient.error'))

            return
          }
          onSave(next)
        }}
      >
        <TextField
          fullWidth
          isRequired
          className="flex-1"
          isInvalid={error !== null}
          name="recipient"
          type="email"
          value={value}
          onChange={(v) => {
            setValue(v)
            setError(null)
          }}
        >
          <Label>{t('adviceQuestions.recipient.label')}</Label>
          <Input autoComplete="off" inputMode="email" />
          <Description>{t('adviceQuestions.recipient.help')}</Description>
          <FieldError>{error}</FieldError>
        </TextField>
        <Button
          className="sm:mt-6"
          isDisabled={!changed}
          type="submit"
          variant="tertiary"
        >
          {t('adviceQuestions.recipient.save')}
        </Button>
      </form>
    </DetailCard>
  )
}
