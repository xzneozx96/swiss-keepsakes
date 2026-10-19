import type { OfflineMethod } from "@/features/orders/lib/transitions";
import type { Order } from "@/features/orders/types";

import {
  Alert,
  Button,
  Description,
  FieldError,
  Label,
  NumberField,
  Radio,
  RadioGroup,
  TextArea,
  TextField,
  TimeField,
  toast,
} from "@heroui/react";

import {
  methodLabelKeys,
  offlineMethods,
  useRecordPayment,
} from "../hooks/use-record-payment";

import { useLocale } from "@/contexts/locale-context";
import { SheetFrame } from "@/components/sheet-frame";

/** Same choice card as the M04 change and decline sheets: ink frame when selected. */
const choiceCard =
  "rounded-2xl border border-separator p-3 data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground";

/**
 * M08 Record payment (spec §4.7, §5.5): a bottom sheet over M04 for money received
 * outside the platform. The confirm button names the amount, the method and the balance
 * after. Mount it only while open, so every opening starts from the current balance.
 */
export function RecordPaymentSheet({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const form = useRecordPayment(order);

  const save = () => {
    const failed = form.submit();

    if (failed) {
      toast.danger(failed);

      return;
    }
    toast.success(form.recordedText);
    onClose();
  };

  return (
    <SheetFrame
      isOpen
      footer={
        <>
          <Button
            fullWidth
            className="h-auto min-h-14 py-3 text-base whitespace-normal"
            isDisabled={!form.canSubmit}
            onPress={save}
          >
            {form.confirmLabel}
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>
            {t("merchantOrder.sheet.back")}
          </Button>
        </>
      }
      title={t("recordPayment.title", { ref: order.ref })}
      onClose={onClose}
    >
      {/* Compact on purpose: the amount field takes focus on open and must not push
          the summary out of view. */}
      <div className="flex items-center justify-between gap-4 rounded-3xl bg-surface-secondary px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs text-muted">
            {t("recordPayment.summary.owed")}
          </span>
          <span className="sr-only">
            {t("recordPayment.owed", { amount: form.owed })}
          </span>
          <span aria-hidden className="text-title text-foreground tabular-nums">
            {form.owed}
          </span>
        </div>
        <dl className="flex shrink-0 flex-col gap-0.5 text-end text-xs tabular-nums">
          <div className="flex justify-end gap-1.5">
            <dt className="text-muted">{t("merchantOrder.amounts.total")}</dt>
            <dd className="font-medium">{form.total}</dd>
          </div>
          <div className="flex justify-end gap-1.5">
            <dt className="text-muted">{t("merchantOrder.amounts.paid")}</dt>
            <dd className="font-medium">{form.paid}</dd>
          </div>
        </dl>
      </div>

      <NumberField
        fullWidth
        formatOptions={{ style: "currency", currency: "CHF" }}
        isInvalid={form.amountError !== undefined}
        minValue={0}
        value={form.amount}
        onChange={form.setAmount}
      >
        <Label className="text-heading">{t("recordPayment.amount")}</Label>
        <NumberField.Group>
          <NumberField.Input className="tabular-nums" />
        </NumberField.Group>
        <Description>{t("recordPayment.amountHelp")}</Description>
        <FieldError>{form.amountError}</FieldError>
      </NumberField>

      {form.duplicateWarning && (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("recordPayment.duplicate.title")}</Alert.Title>
            <Alert.Description>{form.duplicateWarning}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <RadioGroup
        value={form.method}
        onChange={(v) => form.setMethod(v as OfflineMethod)}
      >
        <Label className="text-heading">{t("recordPayment.method")}</Label>
        {offlineMethods.map((m) => (
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

      <TimeField
        fullWidth
        hideTimeZone
        hourCycle={24}
        maxValue={form.maxTime}
        value={form.time}
        onChange={(v) => v && form.setTime(v)}
      >
        <Label className="text-heading">{t("recordPayment.time")}</Label>
        <TimeField.Group>
          <TimeField.Input>
            {(segment) => <TimeField.Segment segment={segment} />}
          </TimeField.Input>
        </TimeField.Group>
        <Description>
          {t("recordPayment.timeHelp", { date: form.today })}
        </Description>
        <FieldError>{t("recordPayment.timeFuture")}</FieldError>
      </TimeField>

      <TextField fullWidth value={form.note} onChange={form.setNote}>
        <Label className="text-heading">{t("recordPayment.note")}</Label>
        <TextArea rows={2} />
        <Description>{t("recordPayment.noteHelp")}</Description>
      </TextField>
    </SheetFrame>
  );
}
