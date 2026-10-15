import type { MissingText } from "../lib/completeness";
import type { Issue, StepStatus } from "../lib/validation";
import type { Language } from "@/contexts/locale-context";

import { Alert, Button, ProgressBar } from "@heroui/react";
import { useState } from "react";

import { LANGUAGES } from "../lib/completeness";

import { LanguageTabs, useFieldList } from "./editor-parts";

import {
  BackIcon,
  ArrowRightIcon,
  EditIcon,
  RestoreIcon,
  StatusDangerIcon,
  StatusSuccessIcon,
} from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { SheetFrame } from "@/features/merchant/order-detail/components/decision-block";
import { ToneLine } from "@/features/tours/merchant/shared";

export interface StepView {
  id: string;
  label: string;
  status: StepStatus;
  /** The step's text fields per language; absent for a step without text (no switch). */
  missing?: MissingText;
}

const statusKey = {
  done: "products.steps.status.done",
  error: "products.steps.status.error",
  warning: "products.steps.status.warning",
  todo: "products.steps.status.todo",
} as const;

/** The numbered circle: current in ink, done with a tick, an error in red, a warning dot. */
function StepMark({
  index,
  status,
  isCurrent,
}: {
  index: number;
  status: StepStatus;
  isCurrent: boolean;
}) {
  const base =
    "relative grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums";

  return (
    <span
      aria-hidden
      className={`${base} ${
        status === "error"
          ? "bg-danger-soft text-danger-soft-foreground"
          : isCurrent
            ? "bg-foreground text-background"
            : status === "done" || status === "warning"
              ? "border border-foreground text-foreground"
              : "border border-separator text-muted"
      }`}
    >
      {status === "error" ? (
        <StatusDangerIcon size={16} />
      ) : status === "done" && !isCurrent ? (
        <StatusSuccessIcon size={16} />
      ) : (
        index + 1
      )}
      {status === "warning" && (
        <span className="absolute -end-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-warning" />
      )}
    </span>
  );
}

/**
 * The stepper's frame (owner, revision 2). From 1024px: the steps as a vertical numbered list
 * in a sticky left column, with the step's title, fields and bar on the right. Phones: "Step 2
 * of 6 · Options & stock", an ink progress bar and "All steps", a sheet listing them.
 * While creating, only the steps already reached can be opened.
 */
export function StepLayout({
  steps,
  current,
  canGo,
  onGo,
  children,
}: {
  steps: StepView[];
  current: string;
  canGo: (id: string) => boolean;
  onGo: (id: string) => void;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const [sheetOpen, setSheetOpen] = useState(false);
  const index = steps.findIndex((s) => s.id === current);
  const step = steps[index];
  const srStatus = (s: StepView) =>
    s.status === "todo" ? "" : `, ${t(statusKey[s.status])}`;

  return (
    <div className="flex min-w-0 flex-col gap-5 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <nav
        aria-label={t("products.steps.label")}
        className="sticky top-6 hidden lg:block"
      >
        <ol className="flex flex-col">
          {steps.map((s, i) => {
            const isCurrent = s.id === current;

            return (
              <li key={s.id} className="relative pb-2 last:pb-0">
                {/* The connector runs from under this number to the next one. */}
                {i < steps.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute start-[1.375rem] top-[2.625rem] -bottom-0.5 w-px bg-separator"
                  />
                )}
                <button
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`${i + 1}. ${s.label}${srStatus(s)}`}
                  className={`flex w-full min-w-0 items-start gap-3 rounded-2xl p-1.5 text-start outline-none enabled:hover:bg-surface-secondary focus-visible:focus-ring disabled:cursor-default ${isCurrent ? "bg-surface-secondary" : ""}`}
                  disabled={!canGo(s.id) || isCurrent}
                  type="button"
                  onClick={() => onGo(s.id)}
                >
                  <StepMark index={i} isCurrent={isCurrent} status={s.status} />
                  <span className="flex min-w-0 flex-col pt-1">
                    <span
                      className={`text-sm break-words hyphens-auto ${isCurrent ? "font-semibold text-foreground" : canGo(s.id) ? "text-foreground" : "text-muted"}`}
                    >
                      {s.label}
                    </span>
                    {s.status !== "todo" && (
                      <span
                        className={`text-xs ${s.status === "error" ? "text-danger" : s.status === "warning" ? "text-warning" : "text-muted"}`}
                      >
                        {t(statusKey[s.status])}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
        {sheetOpen && (
          <SheetFrame
            isOpen
            footer={
              <Button
                fullWidth
                variant="tertiary"
                onPress={() => setSheetOpen(false)}
              >
                {t("merchantOrder.sheet.close")}
              </Button>
            }
            title={t("products.steps.title")}
            onClose={() => setSheetOpen(false)}
          >
            <ol className="flex flex-col gap-1">
              {steps.map((s, i) => {
                const isCurrent = s.id === current;

                return (
                  <li key={s.id}>
                    <button
                      aria-current={isCurrent ? "step" : undefined}
                      className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-2 text-start outline-none enabled:hover:bg-surface-secondary focus-visible:focus-ring disabled:opacity-60"
                      disabled={!canGo(s.id)}
                      type="button"
                      onClick={() => {
                        setSheetOpen(false);
                        onGo(s.id);
                      }}
                    >
                      <StepMark
                        index={i}
                        isCurrent={isCurrent}
                        status={s.status}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={isCurrent ? "font-semibold" : ""}>
                          {s.label}
                        </span>
                        {s.status !== "todo" && (
                          <span
                            className={`text-xs ${s.status === "error" ? "text-danger" : s.status === "warning" ? "text-warning" : "text-muted"}`}
                          >
                            {t(statusKey[s.status])}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </SheetFrame>
        )}
        {/* The step's own title: on phones with its number, as the owner's "Step 2 of 6 · …",
          beside "All steps", with an ink progress bar under it. */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 text-heading" id="step-title">
              <span className="lg:hidden">
                {t("products.steps.of", { n: index + 1, total: steps.length })}{" "}
                ·{" "}
              </span>
              {step?.label}
            </h2>
            <Button
              className="shrink-0 lg:hidden"
              size="sm"
              variant="tertiary"
              onPress={() => setSheetOpen(true)}
            >
              {t("products.steps.all")}
            </Button>
          </div>
          <ProgressBar
            aria-label={t("products.steps.progress")}
            className="w-full lg:hidden"
            color="default"
            maxValue={steps.length}
            size="sm"
            value={index + 1}
          >
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        </div>
        {children}
      </div>
    </div>
  );
}

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
  step: StepView;
  language: Language;
  onLanguage: (language: Language) => void;
  render: (language: Language) => React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="step-title"
      className="flex min-w-0 flex-col gap-5 lg:max-w-3xl lg:gap-6"
    >
      {step.missing ? (
        <LanguageTabs
          stepAlerts
          missing={step.missing}
          selected={language}
          onChange={onLanguage}
        >
          {(lang) => (
            <div className="flex flex-col gap-5 lg:gap-6">{render(lang)}</div>
          )}
        </LanguageTabs>
      ) : (
        render(language)
      )}
    </section>
  );
}

/** "This gift is archived …" with "Restore as draft", instead of publishing (coordinator, rev. 2). */
export function ArchivedNotice({
  text,
  onRestore,
}: {
  text: string;
  onRestore: () => void;
}) {
  const { t } = useLocale();

  return (
    <Alert status="warning">
      <Alert.Indicator />
      <Alert.Content className="flex flex-col items-start gap-2">
        <Alert.Description>{text}</Alert.Description>
        <Button size="sm" variant="tertiary" onPress={onRestore}>
          <RestoreIcon aria-hidden size={16} />
          {t("products.action.restore")}
        </Button>
      </Alert.Content>
    </Alert>
  );
}

/** One step on the Review step: its facts, what it still needs, and "Edit". */
export function ReviewSection({
  index,
  step,
  issues,
  onEdit,
  children,
}: {
  index: number;
  step: StepView;
  issues: Issue[];
  onEdit: () => void;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const titleId = `review-${step.id}`;

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
          aria-label={t("products.review.edit", { step: step.label })}
          size="sm"
          variant="tertiary"
          onPress={onEdit}
        >
          <EditIcon aria-hidden size={16} />
          {t("products.action.edit")}
        </Button>
      </div>
      <dl className="flex flex-col gap-2 text-sm">{children}</dl>
      {issues.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-separator pt-3">
          {issues.map((issue) => (
            <li key={issue.text}>
              <ToneLine tone={issue.tone}>{issue.text}</ToneLine>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** One fact in a review section. */
export function ReviewRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-end break-words">{children}</dd>
    </div>
  );
}

export interface BarAction {
  label: string;
  onPress: () => void;
}

/**
 * The stepper's bar, sticky above the phone tab bar: the status line, then Back (and, when
 * editing, Next) as icons, a secondary action, and the screen's one red action (Next while
 * creating, Save changes while editing, Publish on the last step).
 */
export function StepBar({
  status,
  tone,
  onBack,
  onForward,
  secondary,
  primary,
}: {
  status: string;
  tone: "muted" | "danger" | "success";
  onBack?: () => void;
  onForward?: () => void;
  secondary?: BarAction;
  primary: BarAction;
}) {
  const { t } = useLocale();

  return (
    <div className="sticky bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] z-10 lg:bottom-6">
      {/* Two rows below 1280px: the status with Back/Next, then the actions; one row from 1280px. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-3xl bg-surface px-3 py-3 shadow-overlay sm:px-4 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
        <span
          aria-live="polite"
          className={`flex min-h-5 min-w-0 items-start gap-1.5 text-sm ${tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-muted"}`}
          role="status"
        >
          {tone === "success" && (
            <StatusSuccessIcon
              aria-hidden
              className="mt-0.5 shrink-0"
              size={16}
            />
          )}
          {status}
        </span>
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              isIconOnly
              aria-label={t("products.steps.back")}
              variant="tertiary"
              onPress={onBack}
            >
              <BackIcon aria-hidden size={18} />
            </Button>
          )}
          {onForward && (
            <Button
              isIconOnly
              aria-label={t("products.steps.next")}
              variant="tertiary"
              onPress={onForward}
            >
              <ArrowRightIcon aria-hidden size={18} />
            </Button>
          )}
        </div>
        <div className="col-span-2 flex items-center justify-end gap-2 xl:col-span-1">
          {secondary && (
            <Button variant="tertiary" onPress={secondary.onPress}>
              {secondary.label}
            </Button>
          )}
          <Button onPress={primary.onPress}>{primary.label}</Button>
        </div>
      </div>
    </div>
  );
}

/** The Review step's opening card: what publishing means, and each language's state (R02). */
export function ReviewOverview({
  description,
  missing,
}: {
  description: string;
  missing: MissingText;
}) {
  const { t } = useLocale();
  const fieldList = useFieldList();

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface lg:p-5">
      <p className="text-sm text-pretty">{description}</p>
      <div className="flex flex-col gap-2 border-t border-separator pt-3">
        {LANGUAGES.map((language) => (
          <ToneLine
            key={language}
            tone={missing[language].length ? "warning" : "success"}
          >
            {missing[language].length
              ? t("products.lang.line.missing", {
                  language: t(`products.lang.${language}`),
                  fields: fieldList(missing[language]),
                })
              : t("products.lang.line.complete", {
                  language: t(`products.lang.${language}`),
                })}
          </ToneLine>
        ))}
        <p className="text-xs text-pretty text-muted">
          {t("products.lang.rule")}
        </p>
      </div>
    </section>
  );
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
  actions,
}: {
  isNew: boolean;
  isReview: boolean;
  isFirst: boolean;
  live: boolean;
  archived: boolean;
  isDirty: boolean;
  hasErrors: boolean;
  publishRefused: boolean;
  storageFull: boolean;
  justSaved: boolean;
  actions: {
    back: () => void;
    next: () => void;
    saveDraft: () => void;
    saveChanges: () => void;
    publish: () => void;
    unpublish: () => void;
  };
}): React.ComponentProps<typeof StepBar> {
  const { t } = useLocale();
  const status: Pick<
    React.ComponentProps<typeof StepBar>,
    "status" | "tone"
  > = storageFull
    ? { status: t("products.storageFull"), tone: "danger" }
    : hasErrors
      ? {
          status: t(
            publishRefused ? "products.review.refused" : "products.fixErrors",
          ),
          tone: "danger",
        }
      : justSaved && !isDirty
        ? {
            status: t(live ? "products.saved" : "products.savedDraft"),
            tone: "success",
          }
        : {
            status: t(
              isNew
                ? "products.steps.notSaved"
                : isDirty
                  ? "products.unsaved"
                  : "products.noChanges",
            ),
            tone: "muted",
          };
  const back = isFirst ? undefined : actions.back;

  if (isNew) {
    return {
      ...status,
      onBack: back,
      secondary: { label: t("products.saveDraft"), onPress: actions.saveDraft },
      primary: isReview
        ? { label: t("products.publish"), onPress: actions.publish }
        : { label: t("products.steps.next"), onPress: actions.next },
    };
  }
  if (!isReview) {
    return {
      ...status,
      onBack: back,
      onForward: actions.next,
      primary: { label: t("products.save"), onPress: actions.saveChanges },
    };
  }
  if (archived || live) {
    return {
      ...status,
      onBack: back,
      secondary: archived
        ? undefined
        : { label: t("products.unpublish"), onPress: actions.unpublish },
      primary: { label: t("products.save"), onPress: actions.saveChanges },
    };
  }

  return {
    ...status,
    onBack: back,
    secondary: { label: t("products.saveDraft"), onPress: actions.saveDraft },
    primary: { label: t("products.publish"), onPress: actions.publish },
  };
}
