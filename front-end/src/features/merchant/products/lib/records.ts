import type { LocalizedText, ProductStory } from "@/features/catalog/types";
import type { LocalizedRich } from "@/lib/rich-text";

import { LANGUAGES, cleanText, hasText } from "./completeness";

import { isEmptyDoc } from "@/lib/rich-text";

/** "Kapellbrücke Taschenmesser" → "kapellbruecke-taschenmesser", as the seeded slugs. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** A slug from the name (English first), unique among `taken`; set once, at the first save. */
export function uniqueSlug(
  name: LocalizedText,
  taken: Iterable<string>,
  fallback: string,
): string {
  const used = new Set(taken);
  const base = slugify(name.en ?? name.de ?? "") || fallback;
  let slug = base;

  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;

  return slug;
}

/** A new record's id: the kind and the time, so it sorts after the seeded ones. */
export const newId = (kind: string) =>
  `${kind}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const hasAnyText = (text: LocalizedText) =>
  LANGUAGES.some((language) => hasText(text, language));

/** The long story as stored: none when both the title and every body are empty. */
export function toStory(
  title: LocalizedText,
  body: LocalizedRich,
): ProductStory | undefined {
  const kept: LocalizedRich = {};

  for (const language of LANGUAGES) {
    const doc = body[language];

    if (doc && !isEmptyDoc(doc)) kept[language] = doc;
  }

  return Object.keys(kept).length || hasAnyText(title)
    ? { title: cleanText(title), body: kept }
    : undefined;
}

/** A story body exists in some language while no language has its title. */
export function storyNeedsTitle(title: LocalizedText, body: LocalizedRich) {
  return (
    LANGUAGES.some((l) => body[l] && !isEmptyDoc(body[l])) && !hasAnyText(title)
  );
}
