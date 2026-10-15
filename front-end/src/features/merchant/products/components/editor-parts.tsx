import type { ProductTab } from "../hooks/use-merchant-products";
import type {
  LanguageStatus,
  MissingText,
  TextFieldId,
} from "../lib/completeness";
import type { Language } from "@/contexts/locale-context";
import type { LocalizedText } from "@/features/catalog/types";
import type { MessageKey } from "@/i18n/en";

import {
  Alert,
  Description,
  FieldError,
  Input,
  Label,
  Tabs,
  TextField,
} from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

import { LANGUAGES, hasText, languageStatus } from "../lib/completeness";

import { LanguageChip, PublishChip } from "./status-chips";

import { AutoTextArea } from "@/components/auto-textarea";
import { EditorFormSkeleton } from "@/components/layout/detail-skeletons";
import { MerchantBackBar } from "@/components/layout/merchant-back-bar";
import { StatusChip } from "@/components/status-chip";
import { BackIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";

const otherLanguage = (language: Language): Language =>
  language === "en" ? "de" : "en";

/** "Enter a number from 0 to 30." for an empty or out-of-range number field. */
export function useRangeError() {
  const { t } = useLocale();

  return (value: number, min: number, max: number): string | undefined =>
    !Number.isFinite(value) || value < min || value > max
      ? t("products.range", { min, max })
      : undefined;
}

/** "story and cancellation policy" in the interface language. */
export function useFieldList() {
  const { t } = useLocale();

  return (ids: TextFieldId[]) => {
    const names = ids.map((id) => t(`products.missing.${id}` as MessageKey));

    return names.length < 2
      ? names.join("")
      : `${names.slice(0, -1).join(", ")} ${t("products.and")} ${names[names.length - 1]}`;
  };
}

/**
 * After a failed save, waits for the switched tab and the error states to render, then moves
 * focus to the first invalid field, as C22 does (`attempt` changes on every failed save).
 */
export function useFocusFirstInvalid(
  root: React.RefObject<HTMLElement | null>,
  attempt: number,
) {
  useEffect(() => {
    if (!attempt) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        // Text fields, then controls without one (photo, category) that mark themselves.
        const field = root.current?.querySelector<HTMLElement>(
          '[data-invalid] :is(input:not([type="file"]), textarea), :is(input, textarea)[aria-invalid="true"], [data-error-focus="true"]',
        );

        field?.focus({ preventScroll: true });
        field?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [attempt, root]);
}

/** M04 header: back link to the M11 tab, the record as the one h1, its kind, both chips. */
export function EditorHeader({
  tab,
  title,
  subtitle,
  published,
  archived = false,
  languages,
}: {
  tab: Exclude<ProductTab, "pickup">;
  title: string;
  subtitle: string;
  published: boolean;
  archived?: boolean;
  languages: LanguageStatus;
}) {
  const { t } = useLocale();

  return (
    <header className="flex flex-col gap-3">
      <MerchantBackBar
        label={t("products.back")}
        title={title}
        to={tab === "gifts" ? "/store/products" : "/store/products/tours"}
      />
      <Link
        className="hidden w-fit items-center gap-1.5 rounded-lg text-sm text-muted outline-none hover:text-foreground focus-visible:focus-ring lg:flex"
        to={tab === "gifts" ? "/store/products" : "/store/products/tours"}
      >
        <BackIcon aria-hidden size={16} />
        {t("products.back")}
      </Link>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-title break-words hyphens-auto max-lg:sr-only">
            {title}
          </h1>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-start gap-2 lg:justify-end [&_svg]:shrink-0">
          {archived ? (
            <StatusChip tone="neutral">{t("products.archived")}</StatusChip>
          ) : (
            <PublishChip published={published} />
          )}
          <LanguageChip status={languages} />
        </div>
      </div>
    </header>
  );
}

/**
 * The EN and DE tabs of a text card (M12, M13, M14). A tab whose language misses required
 * text carries the warning icon; its panel opens with what is missing and what guests see.
 */
export function LanguageTabs({
  selected,
  onChange,
  missing,
  requireComplete = true,
  stepAlerts = false,
  children,
}: {
  selected: Language;
  onChange: (language: Language) => void;
  missing: MissingText;
  /** Saving needs a complete language (published); a draft only hears what publishing needs. */
  requireComplete?: boolean;
  /**
   * One stepper step's fields (M12/M13, revision 2): only a translation gap (text the other
   * language has) is announced; empty fields are flagged by Next, Save and Review.
   */
  stepAlerts?: boolean;
  children: (language: Language) => React.ReactNode;
}) {
  const { t } = useLocale();
  const fieldList = useFieldList();
  const status = languageStatus(missing);
  const gaps = (language: Language) =>
    missing[language].filter(
      (id) => !missing[otherLanguage(language)].includes(id),
    );

  return (
    <Tabs
      className="w-full"
      selectedKey={selected}
      onSelectionChange={(key) => onChange(key as Language)}
    >
      <Tabs.ListContainer className="w-fit max-w-full">
        <Tabs.List aria-label={t("products.text.tabsLabel")}>
          {LANGUAGES.map((language, index) => (
            <Tabs.Tab
              key={language}
              className="whitespace-nowrap"
              id={language}
            >
              {index > 0 && <Tabs.Separator />}
              {t(`products.lang.${language}`)}
              {missing[language].length > 0 && (
                <>
                  {/* A warning dot, as the M03 ticket marks status; the chip's clock means "waiting". */}
                  <span
                    aria-hidden
                    className="ms-1.5 size-2 shrink-0 rounded-full bg-warning"
                  />
                  <span className="sr-only">
                    {t(`products.lang.${language}-missing`)}
                  </span>
                </>
              )}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
      {LANGUAGES.map((language) => (
        <Tabs.Panel
          key={language}
          className="flex flex-col gap-5 px-0 pt-4 pb-0"
          id={language}
        >
          {stepAlerts ? (
            gaps(language).length > 0 && (
              <Alert status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                    {t("products.text.incomplete", {
                      language: t(`products.lang.${language}`),
                      other: t(`products.lang.${otherLanguage(language)}`),
                      fields: fieldList(gaps(language)),
                    })}
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )
          ) : status === "incomplete" ? (
            <Alert status={requireComplete ? "danger" : "warning"}>
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>
                  {t(
                    requireComplete
                      ? "products.text.noneComplete"
                      : "products.text.toPublish",
                  )}
                </Alert.Description>
              </Alert.Content>
            </Alert>
          ) : (
            missing[language].length > 0 && (
              <Alert status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                    {t("products.text.incomplete", {
                      language: t(`products.lang.${language}`),
                      other: t(`products.lang.${otherLanguage(language)}`),
                      fields: fieldList(missing[language]),
                    })}
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )
          )}
          {children(language)}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}

/**
 * One language of a merchant text. Empty while the other language has text, it shows that
 * text below as a translation aid. Invalid only after a failed save, in the language whose
 * errors are shown.
 */
export function LocalizedField({
  label,
  value,
  language,
  onChange,
  rows,
  isInvalid = false,
  errorText,
  error,
}: {
  label: string;
  value: LocalizedText;
  language: Language;
  onChange: (text: LocalizedText) => void;
  /** An auto-growing text area, at least this many rows tall; a one-line Input without. */
  rows?: number;
  isInvalid?: boolean;
  /** Replaces "Needed for the English version." (e.g. a draft's missing name). */
  errorText?: string;
  /** The stepper editors decide the error themselves (revision 2): shown as given. */
  error?: string;
}) {
  const { t } = useLocale();
  const other = otherLanguage(language);
  const hint =
    !hasText(value, language) && hasText(value, other)
      ? t(`products.text.other.${other}`, { text: value[other] ?? "" })
      : undefined;

  return (
    <TextField
      fullWidth
      isInvalid={
        error !== undefined || (isInvalid && !hasText(value, language))
      }
      value={value[language] ?? ""}
      onChange={(text) => onChange({ ...value, [language]: text })}
    >
      <Label>{label}</Label>
      {rows ? <AutoTextArea rows={rows} /> : <Input />}
      {hint && <Description className="line-clamp-2">{hint}</Description>}
      <FieldError>
        {error ?? errorText ?? t(`products.text.needed.${language}`)}
      </FieldError>
    </TextField>
  );
}

/** The editor's loading state, in M04's skeleton shape (spec §5.5: never a full-page spinner). */
export function EditorSkeleton() {
  return <EditorFormSkeleton cards={3} />;
}
