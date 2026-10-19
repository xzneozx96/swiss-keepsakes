import type { CalendarDate } from '@internationalized/date'
import type { OfflineMethod } from '@/features/orders/lib/transitions'

import {
  Alert,
  Button,
  Calendar,
  DateField,
  DatePicker,
  Description,
  FieldError,
  Label,
  NumberField,
  Radio,
  RadioGroup,
  TextArea,
  TextField,
  toast,
} from '@heroui/react'
import { parseDate } from '@internationalized/date'
import { zurichDate } from '@sk/domain/catalog'

import { formatMoney } from '@sk/domain/shared'
import { useState } from 'react'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { useDemoNow } from '@/features/demo'
import {
  methodLabelKeys,
  offlineMethods,
} from '@/features/merchant/record-payment/hooks/use-record-payment'
import { usePartnerActions } from '@/features/partners/hooks/use-partner-actions'

/** Same choice card as M08: ink frame when selected. */
const choiceCard
  = 'rounded-2xl border border-separator p-3 data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground'

/**
 * M16 "Record as paid" (step 5.4, AC13) in the M08 sheet frame: money the shop paid the
 * partner outside the app. The amount starts at what is still to pay after offsets; paying
 * more is allowed but needs a note (D6). An offset is never recorded here. Mount only while open.
 */
export function PayoutSheet({
  partnerId,
  partnerName,
  toPay,
  onClose,
}: {
  partnerId: string
  partnerName: string
  /** Still to pay after offsets, in Rappen. */
  toPay: number
  onClose: () => void
}) {
  const { t, intlLocale } = useLocale()
  const now = useDemoNow()
  const actions = usePartnerActions()
  const today = parseDate(zurichDate(now))
  const [amount, setAmount] = useState(toPay / 100)
  const [method, setMethod] = useState<OfflineMethod>('bank-transfer')
  const [paidOn, setPaidOn] = useState<CalendarDate>(today)
  const [reference, setReference] = useState('')
  const [tried, setTried] = useState(false)

  const rappen = Number.isNaN(amount) ? 0 : Math.round(amount * 100)
  const money = (r: number) => formatMoney(r / 100, intlLocale)
  const isAbove = rappen > toPay
  const errors = {
    amount: rappen <= 0 ? t('payout.amountError') : undefined,
    reference:
      isAbove && !reference.trim() ? t('payout.noteRequired') : undefined,
  }
  const isFuture = paidOn.compare(today) > 0
  const isValid = !errors.amount && !errors.reference && !isFuture

  const save = () => {
    setTried(true)
    if (!isValid)
      return
    actions.recordPayout({
      partnerId,
      amount: rappen,
      method,
      paidOn: paidOn.toString(),
      reference: reference.trim() || undefined,
    })
    toast.success(
      t('payout.recorded', { amount: money(rappen), name: partnerName }),
    )
    onClose()
  }

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button
            fullWidth
            className="h-auto min-h-14 py-3 text-base whitespace-normal"
            onPress={save}
          >
            {t('payout.confirm', { amount: money(rappen), name: partnerName })}
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>
            {t('merchantOrder.sheet.back')}
          </Button>
        </>
      )}
      title={t('payout.title', { name: partnerName })}
      onClose={onClose}
    >
      <div className="flex items-center justify-between gap-4 rounded-3xl bg-surface-secondary px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs text-muted">{t('payout.owed')}</span>
          <span className="text-title text-foreground tabular-nums">
            {money(toPay)}
          </span>
        </div>
        <span className="max-w-40 text-end text-xs text-muted">
          {t('payout.owedHint')}
        </span>
      </div>

      <NumberField
        fullWidth
        formatOptions={{ style: 'currency', currency: 'CHF' }}
        isInvalid={tried && !!errors.amount}
        minValue={0}
        value={amount}
        onChange={setAmount}
      >
        <Label className="text-heading">{t('payout.amount')}</Label>
        <NumberField.Group>
          <NumberField.Input className="tabular-nums" />
        </NumberField.Group>
        <FieldError>{errors.amount}</FieldError>
      </NumberField>

      {isAbove && (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('payout.above.title')}</Alert.Title>
            <Alert.Description>
              {t('payout.above', { amount: money(rappen - toPay) })}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <RadioGroup
        value={method}
        onChange={v => setMethod(v as OfflineMethod)}
      >
        <Label className="text-heading">{t('payout.method')}</Label>
        {offlineMethods.map(m => (
          <Radio key={m} className={choiceCard} value={m}>
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {t(methodLabelKeys[m])}
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>

      <DatePicker
        className="w-full"
        isInvalid={isFuture}
        maxValue={today}
        value={paidOn}
        onChange={v => v && setPaidOn(v)}
      >
        <Label className="text-heading">{t('payout.date')}</Label>
        <DateField.Group fullWidth>
          <DateField.Input>
            {segment => <DateField.Segment segment={segment} />}
          </DateField.Input>
          <DateField.Suffix>
            <DatePicker.Trigger aria-label={t('payout.datePick')}>
              <DatePicker.TriggerIndicator />
            </DatePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <FieldError>{t('payout.dateFuture')}</FieldError>
        <DatePicker.Popover>
          {/* Same calendar header as M04's change-date sheet and C03. */}
          {/* maxValue again: the picker's limit does not reach the calendar's cells. */}
          <Calendar aria-label={t('payout.date')} maxValue={today}>
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
                {date => <Calendar.Cell date={date} />}
              </Calendar.GridBody>
            </Calendar.Grid>
          </Calendar>
        </DatePicker.Popover>
      </DatePicker>

      <TextField
        fullWidth
        isInvalid={tried && !!errors.reference}
        value={reference}
        onChange={setReference}
      >
        <Label className="text-heading">{t('payout.reference')}</Label>
        <TextArea rows={2} />
        <Description>{t('payout.referenceHelp')}</Description>
        <FieldError>{errors.reference}</FieldError>
      </TextField>
    </SheetFrame>
  )
}
