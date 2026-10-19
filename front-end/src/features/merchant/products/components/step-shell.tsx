import type { MissingText } from "../lib/completeness";
import type { Issue, StepStatus } from "../lib/validation";
import type { Language } from "@/contexts/locale-context";

import { Alert, Button, ProgressBar } from "@heroui/react";
import { useEffect, useState } from "react";

import { LANGUAGES } from "../lib/completeness";

import { LanguageTabs, useFieldList } from "./editor-parts";

import {
  BackIcon,
  ArrowRightIcon,
  EditIcon,
  RestoreIcon,
  StatusDangerIcon,
  StatusNeutralIcon,
  StatusSuccessIcon,
  StatusWarningIcon,
} from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { SheetFrame } from "@/components/sheet-frame";
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

type MarkState = StepStatus | "current";

/** The mark's state: the step being edited reads "current", unless it has errors to fix. */
const markState = (status: StepStatus, isCurrent: boolean): MarkState =>
  isCurrent && status !== "error" ? "current" : status;

/** Per state: the number circle, the corner icon, the status text and the timeline segment below. */
const markStyle = {
  current: {
    circle: "bg-foreground text-background",
    icon: "text-foreground",
    text: "text-foreground",
    line: "bg-separator",
    Icon: ArrowRightIcon,
  },
  done: {
    circle: "bg-success-soft text-success-soft-foreground",
    icon: "text-success",
    text: "text-success",
    line: "bg-success",
    Icon: StatusSuccessIcon,
  },
  warning: {
    circle: "bg-warning-soft text-warning-soft-foreground",
    icon: "text-warning",
    text: "text-warning",
    line: "bg-warning",
    Icon: StatusWarningIcon,
  },
  error: {
    circle: "bg-danger-soft text-danger-soft-foreground",
    icon: "text-danger",
    text: "text-danger",
    line: "bg-danger",
    Icon: StatusDangerIcon,
  },
  todo: {
    circle: "bg-default text-muted",
    icon: "text-muted",
    text: "text-muted",
    line: "bg-separator",
    Icon: StatusNeutralIcon,
  },
} as const satisfies Record<MarkState, object>;

/**
 * The numbered circle: the number always shows; a corner icon and the colour carry the state
 * (done green tick, needs attention amber clock, errors brick alert, current ink arrow, to do
 * grey dash).
 */
function StepMark({
  index,
  status,
  isCurrent,
}: {
  index: number;
  status: StepStatus;
  isCurrent: boolean;
}) {
  const style = markStyle[markState(status, isCurrent)];

  return (
    <span
      aria-hidden
      className={`relative grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums ${style.circle}`}
    >
      {index + 1}
      <span className="absolute -end-1 -bottom-1 grid rounded-full bg-surface p-px">
        <style.Icon className={style.icon} size={14} />
      </span>
    </span>
  );
}

/** The step's status in words, in its colour (never colour alone). */
function StepStatusText({
  status,
  isCurrent,
}: {
  status: StepStatus;
  isCurrent: boolean;
}) {
  const { t } = useLocale();
  const state = markState(status, isCurrent);

  return (
    <span className={`text-xs ${markStyle[state].text}`}>
      {t(`products.steps.status.${state}`)}
    </span>
  );
}

/** The timeline segment from under one step's circle to the next, coloured by the step above. */
function StepLine({
  status,
  isCurrent,
  className,
}: {
  status: StepStatus;
  isCurrent: boolean;
  className: string;
}) {
  return (
    <span
      aria-hidden
      className={`absolute w-0.5 rounded-full ${markStyle[markState(status, isCurrent)].line} ${className}`}
    />
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
                  <StepLine
                    className="start-[1.3125rem] top-[2.625rem] -bottom-1"
                    isCurrent={isCurrent}
                    status={s.status}
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
                    <StepStatusText isCurrent={isCurrent} status={s.status} />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="flex min-w-0 flex-col gap-5 pb-20 lg:gap-6 lg:pb-0">
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
            <ol className="flex flex-col">
              {steps.map((s, i) => {
                const isCurrent = s.id === current;

                return (
                  <li key={s.id} className="relative">
                    {i < steps.length - 1 && (
                      <StepLine
                        className="start-[1.4375rem] top-[2.75rem] -bottom-1.5"
                        isCurrent={isCurrent}
                        status={s.status}
                      />
                    )}
                    <button
                      aria-current={isCurrent ? "step" : undefined}
                      className="flex min-h-12 w-full items-start gap-3 rounded-2xl p-2 text-start outline-none enabled:hover:bg-surface-secondary focus-visible:focus-ring disabled:opacity-60"
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
                      <span className="flex min-w-0 flex-1 flex-col pt-1">
                        <span className={isCurrent ? "font-semibold" : ""}>
                          {s.label}
                        </span>
                        <StepStatusText
                          isCurrent={isCurrent}
                          status={s.status}
                        />
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
 * True while a text field has focus and the on-screen keyboard has shrunk the visible area.
 * Browsers that resize the layout for the keyboard would lift a fixed bar over the focused
 * field, so the phone bar steps aside until the field loses focus.
 */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    const isField = (el: Element | null) =>
      el instanceof HTMLElement &&
      (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName));
    let tall = viewport?.height ?? window.innerHeight;
    const sync = () => {
      const height = viewport?.height ?? window.innerHeight;
      const focused = isField(document.activeElement);

      if (!focused) tall = Math.max(tall, height);
      setOpen(focused && height < tall * 0.85);
    };

    viewport?.addEventListener("resize", sync);
    window.addEventListener("resize", sync);
    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", sync);

    return () => {
      viewport?.removeEventListener("resize", sync);
      window.removeEventListener("resize", sync);
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", sync);
    };
  }, []);

  return open;
}

/**
 * The stepper's bar. Phones: fixed above the tab bar as one row, the status text then Back,
 * Next, a secondary action and the screen's one red action (Next while creating, Save
 * changes while editing, Publish on the last step). From 1024px: sticky under the step.
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
  const keyboardOpen = useKeyboardOpen();

  return (
    <div
      className={`fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] z-10 sm:inset-x-4 lg:sticky lg:inset-x-auto lg:bottom-6 ${keyboardOpen ? "max-lg:hidden" : ""}`}
    >
      <div className="flex items-center gap-2 rounded-3xl bg-surface px-3 py-2 shadow-overlay lg:px-4 lg:py-3">
        <span
          aria-live="polite"
          className={`flex min-w-0 flex-1 items-center gap-1.5 text-xs leading-snug lg:text-sm ${tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-muted"}`}
          role="status"
        >
          {tone === "success" && (
            <StatusSuccessIcon aria-hidden className="shrink-0" size={16} />
          )}
          <span className="truncate lg:line-clamp-2 lg:whitespace-normal">
            {status}
          </span>
        </span>
        <div className="flex shrink-0 items-center gap-1.5 lg:gap-2">
          {onBack && (
            <Button
              isIconOnly
              aria-label={t("products.steps.back")}
              size="sm"
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
              size="sm"
              variant="tertiary"
              onPress={onForward}
            >
              <ArrowRightIcon aria-hidden size={18} />
            </Button>
          )}
          {secondary && (
            <Button size="sm" variant="tertiary" onPress={secondary.onPress}>
              {secondary.label}
            </Button>
          )}
          <Button size="sm" onPress={primary.onPress}>
            {primary.label}
          </Button>
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
