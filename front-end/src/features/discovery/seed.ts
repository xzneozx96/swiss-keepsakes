import type { LocalizedText } from "@/features/catalog/types";

/**
 * The story under each time block on C01 (spec §4.1): a short walk for two hours, a lake
 * day for a few days. A block shows its story only when it exists in the guest's language.
 */
export const timeBlockStories = {
  quick: "musegg-morning",
  fewDays: "lake-steamboat",
} as const;

/**
 * Business types for the discovery rail (PRD §7): goods, tours, stays and experiences.
 * Product categories (knives, chocolate…) live one level down, on the Gifts screen.
 * Tours open in prototype Phase 2; stays and experiences are a later stage of the PRD.
 */
export type BusinessTypeId = "gifts" | "tours" | "stays" | "experiences";

export interface BusinessType {
  id: BusinessTypeId;
  name: LocalizedText;
  photo: string;
  live: boolean;
}

export const businessTypes: BusinessType[] = [
  {
    id: "gifts",
    name: { en: "Gifts", de: "Geschenke" },
    photo: "gift-box",
    live: true,
  },
  {
    id: "tours",
    name: { en: "Tours", de: "Touren" },
    photo: "lucerne-old-town",
    live: true,
  },
  {
    id: "stays",
    name: { en: "Stays", de: "Unterkünfte" },
    photo: "stay",
    live: false,
  },
  {
    id: "experiences",
    name: { en: "Experiences", de: "Erlebnisse" },
    photo: "artisan-workshop",
    live: false,
  },
];
