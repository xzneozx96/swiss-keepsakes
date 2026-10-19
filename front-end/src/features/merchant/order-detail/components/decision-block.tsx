import type { CalendarDate, DateValue } from '@internationalized/date'
import type {
  AcceptConfirmation,
  DeclineReason,
  MerchantOrderActions,
  MerchantOrderView,
} from '../hooks/use-merchant-order-detail'
import type { ShownLabel } from '@/features/orders/hooks/use-orders'

import {
  Alert,
  Button,
  Calendar,
  Description,
  FieldError,
  Label,
  Radio,
  RadioGroup,
  TextArea,
  TextField,
} from '@heroui/react'
import { parseDate } from '@internationalized/date'
import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'

import {
  GiftIcon,
  InfoIcon,
  PickupDateIcon,
  PickupIcon,
  ProductsIcon,
  RequestsIcon,
  StatusDangerIcon,
  StatusSuccessIcon,
} from '@/components/icons'

import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { isPickupClosed, zurichDate } from '@/features/catalog/lib/pickup'
import { useDemoNow, useDemoSelector } from '@/features/demo'
import { pickText } from '@/lib/localized'
import { declineReasons } from '../hooks/use-merchant-order-detail'
import { ActionPanel } from './detail-card'

type Sheet = 'accept' | 'change' | 'decline' | null

/** Radio as a choice card in the sheets: hairline frame, ink frame when selected. */
const choiceCard
  = 'rounded-2xl border border-separator p-3 data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground'

/**
 * M04 decision block for a requested order (spec §4.6): stock per line, then accept
 * (confirmed in a sheet with the amount and deadline), change date or place (required
 * note, logged) or decline (reason, then the shared confirm dialog).
 */
export function DecisionBlock({
  view,
  actions,
  orderDate,
  orderPlaceId,
}: {
  view: MerchantOrderView
  actions: MerchantOrderActions
  /** Requested pickup as YYYY-MM-DD and place id: the change sheet starts from them. */
  orderDate: string
  orderPlaceId: string
}) {
  const { t } = useLocale()
  const [sheet, setSheet] = useState<Sheet>(null)
  const [confirmation, setConfirmation] = useState<AcceptConfirmation>()
  const [result, setResult] = useState<ShownLabel | null>(null)

  // Known short already: say so instead of asking to confirm a promise that can't be kept.
  // The confirm button re-checks, for stock that changes while the sheet is open.
  const openAccept = () => {
    const blocked = actions.acceptCheck()

    setResult(blocked)
    if (blocked)
      return
    setConfirmation(actions.acceptConfirmation())
    setSheet('accept')
  }

  const accept = () => {
    setSheet(null)
    setResult(actions.accept())
  }

  return (
    <ActionPanel
      eyebrow={t('merchantOrder.panel.eyebrow')}
      icon={RequestsIcon}
      title={t('merchantOrder.decision.title')}
      tone={view.progress.tone}
    >
      <p className="text-sm text-muted">{t('merchantOrder.decision.body')}</p>

      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3 rounded-2xl bg-surface-secondary p-3">
          <PickupDateIcon aria-hidden className="mt-0.5 shrink-0" size={18} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs text-muted">
              {t('merchantOrder.decision.requestedPickup')}
            </span>
            <span className="font-medium tabular-nums">
              {view.pickup.date} · {view.pickup.place}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl bg-surface-secondary p-3">
          <span className="flex items-center gap-3 text-xs text-muted">
            <ProductsIcon aria-hidden className="shrink-0" size={18} />
            {t('merchantOrder.stock.title')}
          </span>
          <ul className="flex flex-col gap-2 ps-[30px]">
            {view.stock.map(row => (
              <li key={row.id} className="flex flex-col items-start gap-1">
                <span className="min-w-0 font-medium">{row.name}</span>
                <span
                  className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm tabular-nums ${row.isShort ? 'bg-danger-soft text-danger-soft-foreground' : 'bg-success-soft text-success-soft-foreground'}`}
                >
                  {row.isShort
                    ? (
                        <StatusDangerIcon
                          aria-hidden
                          className="shrink-0"
                          size={14}
                        />
                      )
                    : (
                        <StatusSuccessIcon
                          aria-hidden
                          className="shrink-0"
                          size={14}
                        />
                      )}
                  {t(
                    row.isShort
                      ? 'merchantOrder.stock.short'
                      : 'merchantOrder.stock.enough',
                    { available: row.available, needed: row.needed },
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="ps-[30px] text-xs text-muted">
            {t('merchantOrder.stock.note')}
          </p>
        </div>
      </div>

      {result && (
        <Alert role="alert" status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('merchantOrder.accept.failed')}</Alert.Title>
            <Alert.Description>
              {result.text}. {t('merchantOrder.accept.failedBody')}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Button
          fullWidth
          className="h-12 text-base"
          size="lg"
          onPress={openAccept}
        >
          {t('merchantOrder.action.accept')}
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            fullWidth
            className="sm:flex-1"
            size="lg"
            variant="secondary"
            onPress={() => setSheet('change')}
          >
            {t('merchantOrder.action.change')}
          </Button>
          <Button
            fullWidth
            className="sm:w-auto sm:px-6"
            size="lg"
            variant="tertiary"
            onPress={() => setSheet('decline')}
          >
            {t('merchantOrder.action.decline')}
          </Button>
        </div>
      </div>

      <AcceptSheet
        confirmation={confirmation}
        isOpen={sheet === 'accept'}
        pickup={`${view.pickup.date} · ${view.pickup.place}`}
        refText={view.ref}
        onAccept={accept}
        onClose={() => setSheet(null)}
      />
      {sheet === 'change' && (
        <ChangeSheet
          actions={actions}
          current={`${view.pickup.date} · ${view.pickup.place}`}
          initialDate={orderDate}
          initialPlaceId={orderPlaceId}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'decline' && (
        <DeclineSheet
          actions={actions}
          guestName={view.guest.name}
          refText={view.ref}
          onClose={() => setSheet(null)}
        />
      )}
    </ActionPanel>
  )
}

/** Money action confirmed in a sheet (spec §5.5): what is promised, how much, by when. */
function AcceptSheet({
  isOpen,
  confirmation,
  pickup,
  refText,
  onAccept,
  onClose,
}: {
  isOpen: boolean
  confirmation?: AcceptConfirmation
  pickup: string
  refText: string
  onAccept: () => void
  onClose: () => void
}) {
  const { t } = useLocale()

  return (
    <SheetFrame
      footer={(
        <>
          <Button fullWidth className="h-14 text-base" onPress={onAccept}>
            {confirmation?.confirmLabel}
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>
            {t('merchantOrder.sheet.back')}
          </Button>
        </>
      )}
      isOpen={isOpen}
      title={t('merchantOrder.accept.title', { ref: refText })}
      onClose={onClose}
    >
      {confirmation && (
        <div className="flex flex-col overflow-hidden rounded-3xl bg-surface-secondary">
          <div className="flex flex-col gap-1 p-4">
            <span className="text-sm text-muted">
              {t(
                confirmation.amountKind === 'now'
                  ? 'merchantOrder.accept.summaryNow'
                  : 'merchantOrder.accept.summaryLater',
              )}
            </span>
            <span className="text-display text-foreground tabular-nums">
              {confirmation.amount}
            </span>
            {confirmation.due && (
              <span className="text-sm tabular-nums">
                {t('merchantOrder.accept.summaryDue', {
                  due: confirmation.due,
                })}
              </span>
            )}
          </div>
          <dl className="flex flex-col gap-2 border-t border-dashed border-separator p-4 text-sm">
            <div className="flex items-start gap-3">
              <PickupIcon
                aria-hidden
                className="mt-0.5 shrink-0 text-muted"
                size={16}
              />
              <dt className="sr-only">{t('merchantOrder.pickup.requested')}</dt>
              <dd className="font-medium tabular-nums">{pickup}</dd>
            </div>
            <div className="flex items-start gap-3">
              <GiftIcon
                aria-hidden
                className="mt-0.5 shrink-0 text-muted"
                size={16}
              />
              <dt className="sr-only">{t('merchantOrder.items.title')}</dt>
              <dd className="font-medium">{confirmation.units}</dd>
            </div>
          </dl>
        </div>
      )}
      <p className="text-base">{confirmation?.sentence}</p>
      <p className="flex items-start gap-2 text-sm text-muted">
        <InfoIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
        {t('merchantOrder.accept.hold')}
      </p>
    </SheetFrame>
  )
}

function ChangeSheet({
  actions,
  current,
  initialDate,
  initialPlaceId,
  onClose,
}: {
  actions: MerchantOrderActions
  /** The pickup as it stands, shown on top so staff see what they change. */
  current: string
  initialDate: string
  initialPlaceId: string
  onClose: () => void
}) {
  const { t, language } = useLocale()
  const pickupPlaces = useDemoSelector(s => s.data.pickupPlaces)
  const now = useDemoNow()
  const [date, setDate] = useState<CalendarDate>(() => parseDate(initialDate))
  const [placeId, setPlaceId] = useState(initialPlaceId)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  const today = parseDate(zurichDate(now))

  const save = () => {
    const failed = actions.changePickup({
      date: date.toString(),
      placeId,
      note,
    })

    if (failed)
      setError(failed)
    else onClose()
  }

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth className="h-14 text-base" onPress={save}>
            {t('merchantOrder.change.save')}
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>
            {t('merchantOrder.sheet.back')}
          </Button>
        </>
      )}
      title={t('merchantOrder.change.title')}
      onClose={onClose}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3 rounded-2xl bg-surface-secondary p-3">
          <PickupDateIcon aria-hidden className="mt-0.5 shrink-0" size={18} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs text-muted">
              {t('merchantOrder.change.current')}
            </span>
            <span className="font-medium tabular-nums">{current}</span>
          </div>
        </div>
        <p className="text-sm text-muted">{t('merchantOrder.change.body')}</p>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-heading font-medium" id="change-date-label">
          {t('merchantOrder.change.date')}
        </span>
        <Calendar
          aria-labelledby="change-date-label"
          className="calendar--fluid"
          isDateUnavailable={(d: DateValue) => isPickupClosed(d.toString())}
          minValue={today}
          value={date}
          onChange={(v) => {
            setDate(v)
            setError(undefined)
          }}
        >
          <Calendar.Header>
            <Calendar.Heading />
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {day => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>
              {d => (
                <Calendar.Cell
                  className={
                    d.compare(today) === 0 ? 'calendar__cell--demo-today' : ''
                  }
                  date={d}
                />
              )}
            </Calendar.GridBody>
          </Calendar.Grid>
        </Calendar>
        <p className="text-xs text-muted">{t('merchantOrder.change.closed')}</p>
      </div>

      <RadioGroup
        value={placeId}
        onChange={(v) => {
          setPlaceId(v)
          setError(undefined)
        }}
      >
        <Label className="text-heading">
          {t('merchantOrder.change.place')}
        </Label>
        {pickupPlaces.map(p => (
          <Radio key={p.id} className={choiceCard} value={p.id}>
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {pickText(p.name, language).text}
            </Radio.Content>
            <Description>
              {p.address} · {pickText(p.openingHours, language).text}
            </Description>
          </Radio>
        ))}
      </RadioGroup>

      <TextField
        fullWidth
        isRequired
        isInvalid={error !== undefined}
        value={note}
        onChange={(v) => {
          setNote(v)
          setError(undefined)
        }}
      >
        <Label className="text-heading">{t('merchantOrder.change.note')}</Label>
        <TextArea rows={3} />
        <Description>{t('merchantOrder.change.noteHelp')}</Description>
        <FieldError>{error}</FieldError>
      </TextField>
    </SheetFrame>
  )
}

function DeclineSheet({
  actions,
  refText,
  guestName,
  onClose,
}: {
  actions: MerchantOrderActions
  refText: string
  guestName: string
  onClose: () => void
}) {
  const { t } = useLocale()
  const { confirm, dialog } = useConfirm()
  const [reason, setReason] = useState<DeclineReason>('outOfStock')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()

  const submit = async () => {
    const failed = actions.declineError(reason, note)

    if (failed) {
      setError(failed)

      return
    }

    const ok = await confirm({
      title: t('merchantOrder.decline.confirmTitle', { ref: refText }),
      body: t('merchantOrder.decline.confirmBody', { guest: guestName }),
      confirmLabel: t('merchantOrder.decline.confirm'),
      cancelLabel: t('merchantOrder.decline.keep'),
    })

    if (!ok)
      return
    actions.decline(reason, note)
    onClose()
  }

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button
            fullWidth
            className="h-14 text-base"
            variant="danger"
            onPress={() => void submit()}
          >
            {t('merchantOrder.decline.submit')}
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>
            {t('merchantOrder.sheet.back')}
          </Button>
        </>
      )}
      title={t('merchantOrder.decline.title', { ref: refText })}
      onClose={onClose}
    >
      <RadioGroup
        value={reason}
        onChange={(v) => {
          setReason(v as DeclineReason)
          setError(undefined)
        }}
      >
        <Label className="text-heading">
          {t('merchantOrder.decline.reason')}
        </Label>
        {declineReasons.map(r => (
          <Radio key={r} className={choiceCard} value={r}>
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {t(`merchantOrder.decline.reason.${r}`)}
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>

      <TextField
        fullWidth
        isInvalid={error !== undefined}
        isRequired={reason === 'other'}
        value={note}
        onChange={(v) => {
          setNote(v)
          setError(undefined)
        }}
      >
        <Label className="text-heading">
          {t(
            reason === 'other'
              ? 'merchantOrder.decline.note'
              : 'merchantOrder.decline.noteOptional',
          )}
        </Label>
        <TextArea rows={3} />
        <Description>{t('merchantOrder.decline.noteHelp')}</Description>
        <FieldError>{error}</FieldError>
      </TextField>
      {dialog}
    </SheetFrame>
  )
}
