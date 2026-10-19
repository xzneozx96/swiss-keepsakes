import type { PlaceRow } from "../hooks/use-merchant-products";
import type { MissingText } from "../lib/completeness";
import type { Language } from "@/contexts/locale-context";
import type { PickupPlace } from "@/features/catalog/types";

import {
  Button,
  FieldError,
  Input,
  Label,
  TextField,
  toast,
} from "@heroui/react";
import { useRef, useState } from "react";

import {
  cleanText,
  closestLanguage,
  languageStatus,
  missingText,
  placeText,
} from "../lib/completeness";

import {
  LanguageTabs,
  LocalizedField,
  useFocusFirstInvalid,
} from "./editor-parts";
import { LanguageChip } from "./status-chips";

import { ChevronRightIcon, ClockIcon, PickupIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { useDemo, useDemoActions } from "@/features/demo";
import { SheetFrame } from "@/components/sheet-frame";
import { pickText } from "@/lib/localized";

type PlaceDraft = Pick<
  PickupPlace,
  "name" | "address" | "openingHours" | "instructions"
>;

/**
 * M14 editor in the M08 sheet frame (D3: a tab of M11 until Settings, Phase 6). Places are
 * edited, never added or removed: C03 offers the shop's places by id and its highlight names
 * two of them. Saved straight into demo data, which C03, C15, M04 and the mails read (D4).
 */
function PickupPointSheet({
  place,
  onClose,
}: {
  place: PickupPlace;
  onClose: () => void;
}) {
  const { t, language: uiLanguage } = useLocale();
  const { update } = useDemoActions();
  const [draft, setDraft] = useState<PlaceDraft>(() => ({
    name: { ...place.name },
    address: place.address,
    openingHours: { ...place.openingHours },
    instructions: { ...place.instructions },
  }));
  const [language, setLanguage] = useState<Language>(uiLanguage);
  const [tried, setTried] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const body = useRef<HTMLDivElement>(null);

  useFocusFirstInvalid(body, attempt);

  const missing: MissingText = missingText(placeText(draft));
  const noLanguage = languageStatus(missing) === "incomplete";
  const addressError = draft.address.trim()
    ? undefined
    : t("products.place.addressError");
  const errorLanguage =
    tried && noLanguage ? closestLanguage(missing) : undefined;

  const save = () => {
    if (noLanguage || addressError) {
      setTried(true);
      if (noLanguage && !addressError) setLanguage(closestLanguage(missing));
      setAttempt((n) => n + 1);

      return;
    }
    const next: PickupPlace = {
      ...place,
      name: cleanText(draft.name),
      address: draft.address.trim(),
      openingHours: cleanText(draft.openingHours),
      instructions: cleanText(draft.instructions),
    };

    update((s) => ({
      ...s,
      data: {
        ...s.data,
        pickupPlaces: s.data.pickupPlaces.map((p) =>
          p.id === place.id ? next : p,
        ),
      },
    }));
    toast.success(
      t("products.place.saved", {
        name: pickText(next.name, uiLanguage).text,
      }),
    );
    onClose();
  };

  return (
    <SheetFrame
      isOpen
      footer={
        <>
          <Button fullWidth onPress={save}>
            {t("products.place.save")}
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>
            {t("merchantOrder.sheet.back")}
          </Button>
        </>
      }
      title={t("products.place.edit")}
      onClose={onClose}
    >
      <div ref={body} className="flex flex-col gap-5">
        <TextField
          fullWidth
          isRequired
          isInvalid={tried && addressError !== undefined}
          value={draft.address}
          onChange={(address) => setDraft((d) => ({ ...d, address }))}
        >
          <Label>{t("products.field.address")}</Label>
          <Input />
          <FieldError>{addressError}</FieldError>
        </TextField>
        <LanguageTabs
          missing={missing}
          selected={language}
          onChange={setLanguage}
        >
          {(lang) => (
            <>
              <LocalizedField
                isInvalid={errorLanguage === lang}
                label={t("products.field.name")}
                language={lang}
                value={draft.name}
                onChange={(name) => setDraft((d) => ({ ...d, name }))}
              />
              <LocalizedField
                isInvalid={errorLanguage === lang}
                label={t("products.field.openingHours")}
                language={lang}
                value={draft.openingHours}
                onChange={(openingHours) =>
                  setDraft((d) => ({ ...d, openingHours }))
                }
              />
              <p className="-mt-3 text-xs text-pretty text-muted">
                {t("products.place.hoursHelp")}
              </p>
              <LocalizedField
                isInvalid={errorLanguage === lang}
                label={t("products.field.instructions")}
                language={lang}
                rows={3}
                value={draft.instructions}
                onChange={(instructions) =>
                  setDraft((d) => ({ ...d, instructions }))
                }
              />
            </>
          )}
        </LanguageTabs>
      </div>
    </SheetFrame>
  );
}

/**
 * M14 Pickup points as M11's third tab: one ticket per place, as the M03 cards. The name
 * opens the editor sheet; its hit area covers the card.
 */
export function PickupPoints({
  rows,
  label,
}: {
  rows: PlaceRow[];
  label: string;
}) {
  const { t } = useLocale();
  const { state } = useDemo();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = state.data.pickupPlaces.find((p) => p.id === openId);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-pretty text-muted">
        {t("products.place.intro")}
      </p>
      <ul aria-label={label} className="grid gap-5 lg:grid-cols-2">
        {rows.map((row) => (
          <li key={row.id}>
            <article className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-surface shadow-surface card-hover">
              <div className="flex items-center gap-4 p-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-surface-secondary text-muted">
                  <PickupIcon aria-hidden size={24} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg leading-tight font-semibold">
                    <button
                      aria-label={t("products.place.open", { name: row.name })}
                      className="rounded-md text-start outline-none after:absolute after:inset-0 focus-visible:focus-ring"
                      type="button"
                      onClick={() => setOpenId(row.id)}
                    >
                      {row.name}
                    </button>
                  </h3>
                  <p className="mt-2 text-xs text-muted">{row.address}</p>
                </div>
                <ChevronRightIcon
                  aria-hidden
                  className="shrink-0 text-muted"
                  size={18}
                />
              </div>
              <div className="flex flex-wrap gap-2 px-4 pb-4 [&_svg]:shrink-0">
                <LanguageChip status={row.languages} />
              </div>
              <div className="mt-auto flex flex-col gap-2 border-t border-dashed border-separator px-4 py-3.5 text-sm">
                <p className="flex items-start gap-2">
                  <ClockIcon
                    aria-hidden
                    className="mt-0.5 shrink-0 text-muted"
                    size={16}
                  />
                  <span className="tabular-nums">{row.hours}</span>
                </p>
                <p className="text-pretty text-muted">{row.instructions}</p>
              </div>
            </article>
          </li>
        ))}
      </ul>
      {open && (
        <PickupPointSheet
          key={open.id}
          place={open}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
