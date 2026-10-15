import type { Language } from "@/contexts/locale-context";
import type {
  LocalizedText,
  PickupPlace,
  Product,
} from "@/features/catalog/types";
import type { Tour } from "@/features/tours/types";
import type { LocalizedRich } from "@/lib/rich-text";

import { isEmptyDoc } from "@/lib/rich-text";

export const LANGUAGES = ["en", "de"] as const satisfies readonly Language[];

/** The merchant-written text fields a guest needs, per record type (R02). */
export type TextFieldId =
  | "name"
  | "story"
  | "cancellation"
  | "options"
  | "summary"
  | "description"
  | "meetingPoint"
  | "itinerary"
  | "included"
  | "excluded"
  | "conditions"
  | "openingHours"
  | "instructions"
  | "longStory";

export interface RequiredText {
  id: TextFieldId;
  text: LocalizedText;
}

/** Field ids still empty in each language, each id once, in field order. */
export type MissingText = Record<Language, TextFieldId[]>;

/**
 * - `complete`: both languages have every required field.
 * - `de-missing` / `en-missing`: one language is complete, the other is not (a warning; R02
 *   still allows publishing).
 * - `incomplete`: no language is complete, so the record cannot be saved or shown.
 */
export type LanguageStatus =
  "complete" | "de-missing" | "en-missing" | "incomplete";

export const hasText = (text: LocalizedText, language: Language) =>
  Boolean(text[language]?.trim());

export function missingText(fields: RequiredText[]): MissingText {
  const missing = (language: Language) => [
    ...new Set(
      fields.filter((f) => !hasText(f.text, language)).map((f) => f.id),
    ),
  ];

  return { en: missing("en"), de: missing("de") };
}

/**
 * Completeness is computed from the required fields, never stored (outline §4). A language
 * counts only when all its fields are filled in that same language: R02 forbids mixing.
 */
export function languageStatus(missing: MissingText): LanguageStatus {
  const en = missing.en.length === 0;
  const de = missing.de.length === 0;

  if (en && de) return "complete";
  if (en) return "de-missing";

  return de ? "en-missing" : "incomplete";
}

/** The long story counts in a language once it has a title and a body there (owner, rev. 2). */
export function storyText(
  story: { title: LocalizedText; body: LocalizedRich } | undefined,
): LocalizedText {
  const text: LocalizedText = {};

  for (const language of LANGUAGES) {
    const body = story?.body[language];

    if (story?.title[language]?.trim() && body && !isEmptyDoc(body))
      text[language] = "story";
  }

  return text;
}

/**
 * Gift text shown on C02, C03 and checkout: name, short story, cancellation, option names
 * and, since the owner made it a must (15.10.2026), the long story.
 */
export function giftText(
  product: Pick<Product, "name" | "story" | "cancellationPolicy"> & {
    variants: Pick<Product["variants"][number], "label">[];
    longStory?: { title: LocalizedText; body: LocalizedRich };
  },
): RequiredText[] {
  return [
    { id: "name", text: product.name },
    { id: "story", text: product.story },
    ...product.variants.map((v) => ({ id: "options" as const, text: v.label })),
    { id: "cancellation", text: product.cancellationPolicy },
    { id: "longStory", text: storyText(product.longStory) },
  ];
}

/** Tour text shown on C08–C11, and the long story (a must since 15.10.2026); stop notes stay optional. */
export function tourText(
  tour: Pick<
    Tour,
    | "name"
    | "summary"
    | "description"
    | "meetingPoint"
    | "included"
    | "excluded"
    | "conditions"
    | "cancellationPolicy"
  > & {
    itinerary: Pick<Tour["itinerary"][number], "name" | "description">[];
    longStory?: { title: LocalizedText; body: LocalizedRich };
  },
): RequiredText[] {
  return [
    { id: "name", text: tour.name },
    { id: "summary", text: tour.summary },
    { id: "description", text: tour.description },
    { id: "meetingPoint", text: tour.meetingPoint },
    ...tour.itinerary.flatMap((stop) => [
      { id: "itinerary" as const, text: stop.name },
      { id: "itinerary" as const, text: stop.description },
    ]),
    ...tour.included.map((item) => ({ id: "included" as const, text: item })),
    { id: "excluded", text: tour.excluded },
    { id: "conditions", text: tour.conditions },
    { id: "cancellation", text: tour.cancellationPolicy },
    { id: "longStory", text: storyText(tour.longStory) },
  ];
}

export function placeText(
  place: Pick<PickupPlace, "name" | "openingHours" | "instructions">,
): RequiredText[] {
  return [
    { id: "name", text: place.name },
    { id: "openingHours", text: place.openingHours },
    { id: "instructions", text: place.instructions },
  ];
}

/**
 * The language whose errors are shown when no language is complete: the one with fewer
 * missing fields, English on a tie.
 */
export function closestLanguage(missing: MissingText): Language {
  return missing.de.length < missing.en.length ? "de" : "en";
}

/** Drops empty and blank languages, so a cleared German field falls back to English. */
export function cleanText(text: LocalizedText): LocalizedText {
  const result: LocalizedText = {};

  for (const language of LANGUAGES) {
    const value = text[language]?.trim();

    if (value) result[language] = value;
  }

  return result;
}
