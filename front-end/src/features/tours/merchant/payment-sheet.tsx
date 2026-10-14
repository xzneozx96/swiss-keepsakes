import type { ExternalPaymentInput } from "./lib/transitions";
import type { TourBooking } from "../types";
import type { ZonedDateTime } from "@internationalized/date";

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
import { fromDate, toCalendarDate } from "@internationalized/date";
import { useState } from "react";

import { useTourActions, useTours } from "../hooks/use-tours";
import { bookingBalance, bookingPaid } from "../lib/selectors";

import { externalPaymentBlock } from "./lib/transitions";
import { useBlockText, useTourFormatting } from "./shared";

import { useLocale } from "@/contexts/locale-context";
import { SheetFrame } from "@/features/merchant/order-detail/components/decision-block";
import {
  methodLabelKeys,
  offlineMethods,
} from "@/features/merchant/record-payment/hooks/use-record-payment";
import { formatOrderDate } from "@/features/orders/lib/format";

const ZURICH = "Europe/Zurich";

/** Same choice card as M08: ink frame when selected. */
const choiceCard =
  "rounded-2xl border border-separator p-3 data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground";

const confirmKeys = {
  cash: "recordPayment.confirm.cash",
  "bank-transfer": "recordPayment.confirm.bankTransfer",
  other: "recordPayment.confirm.other",
} as const;

const confirmAgainKeys = {
  cash: "recordPayment.confirmAgain.cash",
  "bank-transfer": "recordPayment.confirmAgain.bankTransfer",
  other: "recordPayment.confirmAgain.other",
} as const;

/**
 * M08 Record payment for a tour booking: the gift sheet's fields, copy and checks (amount up
 * to the balance, received today and not later than now, same amount within 10 minutes
 * warns and asks again). Mount it only while open, so it starts from the current balance.
 */
export function TourPaymentSheet({
  booking,
  onClose,
}: {
  booking: TourBooking;
  onClose: () => void;
}) {
  const { t, intlLocale } = useLocale();
  const { now, role } = useTours();
  const { recordPayment } = useTourActions();
  const { money } = useTourFormatting();
  const blockText = useBlockText();
  const balance = bookingBalance(booking);
  const [openedAt] = useState(() => fromDate(now, ZURICH));
  const [amount, setAmount] = useState(balance / 100);
  const [method, setMethod] = useState<ExternalPaymentInput["method"]>("cash");
  const [time, setTime] = useState<ZonedDateTime>(openedAt);
  const [note, setNote] = useState("");
  const cents = Number.isNaN(amount) ? 0 : Math.round(amount * 100);
  const input: ExternalPaymentInput = {
    amount: cents,
    method,
    note,
    at: time.toDate().toISOString(),
  };
  const block = externalPaymentBlock(booking, input, role, now);
  const isDuplicate = block?.code === "duplicate";
  const isFuture = time.compare(openedAt) > 0;
  const amountError =
    block?.code === "above-balance" || block?.code === "invalid-amount"
      ? blockText(block)
      : undefined;
  const after = money(Math.max(0, balance - cents));
  const save = () => {
    const result = recordPayment(booking.id, {
      ...input,
      allowDuplicate: isDuplicate,
    });

    if (!result.ok) {
      toast.danger(t("tourMerchant.failed"));

      return;
    }
    toast.success(
      t("recordPayment.recorded", { amount: money(cents), balance: after }),
    );
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
            isDisabled={(!!block && !isDuplicate) || isFuture}
            onPress={save}
          >
            {t((isDuplicate ? confirmAgainKeys : confirmKeys)[method], {
              amount: money(cents),
              balance: after,
            })}
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>
            {t("merchantOrder.sheet.back")}
          </Button>
        </>
      }
      title={t("recordPayment.title", { ref: booking.ref })}
      onClose={onClose}
    >
      <div className="flex items-center justify-between gap-4 rounded-3xl bg-surface-secondary px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs text-muted">
            {t("recordPayment.summary.owed")}
          </span>
          <span className="sr-only">
            {t("recordPayment.owed", { amount: money(balance) })}
          </span>
          <span aria-hidden className="text-title text-foreground tabular-nums">
            {money(balance)}
          </span>
        </div>
        <dl className="flex shrink-0 flex-col gap-0.5 text-end text-xs tabular-nums">
          <div className="flex justify-end gap-1.5">
            <dt className="text-muted">{t("tourMerchant.total")}</dt>
            <dd className="font-medium">{money(booking.total)}</dd>
          </div>
          <div className="flex justify-end gap-1.5">
            <dt className="text-muted">{t("tourMerchant.paid")}</dt>
            <dd className="font-medium">{money(bookingPaid(booking))}</dd>
          </div>
        </dl>
      </div>
      <NumberField
        fullWidth
        formatOptions={{ style: "currency", currency: "CHF" }}
        isInvalid={amountError !== undefined}
        minValue={0}
        value={amount}
        onChange={setAmount}
      >
        <Label className="text-heading">{t("recordPayment.amount")}</Label>
        <NumberField.Group>
          <NumberField.Input className="tabular-nums" />
        </NumberField.Group>
        <Description>{t("tourMerchant.amountHelp")}</Description>
        <FieldError>{amountError}</FieldError>
      </NumberField>
      {isDuplicate && block && (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("recordPayment.duplicate.title")}</Alert.Title>
            <Alert.Description>{blockText(block)}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      <RadioGroup
        value={method}
        onChange={(value) => {
          const next = offlineMethods.find((m) => m === value);

          if (next) setMethod(next);
        }}
      >
        <Label className="text-heading">{t("recordPayment.method")}</Label>
        {offlineMethods.map((value) => (
          <Radio key={value} className={choiceCard} value={value}>
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {t(methodLabelKeys[value])}
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
      <TimeField
        fullWidth
        hideTimeZone
        hourCycle={24}
        maxValue={openedAt}
        value={time}
        onChange={(value) => value && setTime(value)}
      >
        <Label className="text-heading">{t("recordPayment.time")}</Label>
        <TimeField.Group>
          <TimeField.Input>
            {(segment) => <TimeField.Segment segment={segment} />}
          </TimeField.Input>
        </TimeField.Group>
        <Description>
          {t("recordPayment.timeHelp", {
            date: formatOrderDate(
              toCalendarDate(openedAt).toString(),
              intlLocale,
            ),
          })}
        </Description>
        <FieldError>{t("recordPayment.timeFuture")}</FieldError>
      </TimeField>
      <TextField fullWidth value={note} onChange={setNote}>
        <Label className="text-heading">{t("recordPayment.note")}</Label>
        <TextArea rows={2} />
        <Description>{t("recordPayment.noteHelp")}</Description>
      </TextField>
    </SheetFrame>
  );
}
