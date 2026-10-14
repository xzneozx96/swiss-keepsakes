import type { Outcome, PaymentView } from "../hooks/use-payment";
import type { MessageKey } from "@/i18n/en";

import { useEffect, useRef } from "react";

import { useLocale } from "@/contexts/locale-context";

/**
 * C12 simulated payment provider (outline §2 row 1.14). Deliberately not the product's look and
 * not any real payment brand: system font, cool grey surfaces, square corners, no serif, no
 * accent colour, no card or wallet marks, and a monospace "simulated" strip on top.
 */
const focus =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f2933]";

const outcomes: { outcome: Outcome; hint: MessageKey; primary?: boolean }[] = [
  { outcome: "succeeded", hint: "payment.choose.payHint", primary: true },
  { outcome: "failed", hint: "payment.choose.failHint" },
  { outcome: "processing", hint: "payment.choose.processingHint" },
];

export function ProviderPage({ view }: { view: PaymentView }) {
  const { t } = useLocale();
  const { step } = view;

  const label = (outcome: Outcome) =>
    outcome === "succeeded"
      ? t("payment.choose.pay", { amount: view.amount })
      : t(
          outcome === "failed"
            ? "payment.choose.fail"
            : "payment.choose.processing",
        );

  return (
    <ProviderFrame>
      <div className="flex flex-col gap-4 rounded-sm border border-[#cfd4da] bg-white p-4">
        <h1 className="text-lg font-semibold">{t("payment.title")}</h1>
        <dl className="flex flex-col divide-y divide-[#e4e7eb] border-y border-[#e4e7eb] text-sm">
          <Row label={t("payment.payTo")}>
            <span className="font-semibold">{view.seller}</span>
            <span className="block text-xs text-[#52606d]">
              {t("payment.sellerNote")}
            </span>
          </Row>
          <Row label={t("payment.reference")}>
            <span className="font-mono">{view.ref}</span>
          </Row>
          <Row label={t("payment.amount")}>
            <span className="text-xl font-semibold tabular-nums">
              {view.amount}
            </span>
          </Row>
        </dl>

        {step.kind === "choose" && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-semibold tracking-wide text-[#52606d] uppercase">
              {t("payment.choose.title")}
            </legend>
            {outcomes.map(({ outcome, hint, primary }) => (
              <button
                key={outcome}
                className={`${focus} flex min-h-14 flex-col items-start justify-center rounded-sm border px-4 py-2 text-left disabled:opacity-60 ${
                  primary
                    ? "border-[#1f2933] bg-[#1f2933] text-white active:bg-[#323f4b]"
                    : "border-[#9aa5b1] bg-white text-[#1f2933] active:bg-[#f0f2f4]"
                }`}
                disabled={view.isPending}
                type="button"
                onClick={() => view.choose(outcome)}
              >
                <span className="font-semibold">{label(outcome)}</span>
                <span
                  className={`text-xs ${primary ? "text-[#cbd2d9]" : "text-[#52606d]"}`}
                >
                  {t(hint)}
                </span>
              </button>
            ))}
          </fieldset>
        )}

        {step.kind === "failed" && (
          <Message role="alert" title={t("payment.failed.title")} tone="danger">
            {t("payment.failed.body")}
            <RetryButton onPress={view.retry}>
              {t("payment.failed.retry")}
            </RetryButton>
          </Message>
        )}

        {step.kind === "processing" && (
          <Message title={t("payment.processing.title")}>
            {t("payment.processing.body")}
          </Message>
        )}

        {step.kind === "blocked" && (
          <Message title={t("payment.blocked.title")}>{step.reason}</Message>
        )}

        <button
          className={`${focus} self-start rounded-sm py-1 text-sm text-[#1f2933] underline underline-offset-2`}
          type="button"
          onClick={view.back}
        >
          {t("payment.back")}
        </button>
      </div>
    </ProviderFrame>
  );
}

/** Loading state in the provider's own look (spec §5.5: never a full-page spinner). */
export function ProviderLoading() {
  const { t } = useLocale();

  return (
    <ProviderFrame>
      <div
        aria-busy
        className="flex flex-col gap-3 rounded-sm border border-[#cfd4da] bg-white p-4"
      >
        <p className="text-sm text-[#52606d]">{t("payment.loading")}</p>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-sm bg-[#e4e7eb]" />
        ))}
      </div>
    </ProviderFrame>
  );
}

function ProviderFrame({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();

  return (
    <div className="flex min-h-dvh flex-col bg-[#e4e7eb] font-[system-ui,-apple-system,'Segoe_UI',Roboto,Arial,sans-serif] text-[#1f2933]">
      <p className="bg-[#1f2933] px-4 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2 font-mono text-[11px] leading-4 tracking-wide text-[#e4e7eb] uppercase">
        {t("payment.banner")}
      </p>
      <div className="px-4 py-6">{children}</div>
    </div>
  );
}

/** Takes focus when it appears, because the Fail button the guest pressed is gone. */
function RetryButton({
  onPress,
  children,
}: {
  onPress: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => ref.current?.focus(), []);

  return (
    <button
      ref={ref}
      className={`${focus} mt-3 min-h-12 w-full rounded-sm border border-[#1f2933] bg-[#1f2933] px-4 font-semibold text-white active:bg-[#323f4b]`}
      type="button"
      onClick={onPress}
    >
      {children}
    </button>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="shrink-0 text-[#52606d]">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

function Message({
  title,
  tone,
  role,
  children,
}: {
  title: string;
  tone?: "danger";
  role?: "alert";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-sm border-l-4 p-3 text-sm ${
        tone === "danger"
          ? "border-[#ab091e] bg-[#fdecee]"
          : "border-[#52606d] bg-[#f5f7fa]"
      }`}
      role={role}
    >
      <p className="font-semibold">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
