import type { Category } from "./types";

/**
 * The four product categories (PRD §7.0), in the order the guest rail shows them. Fixed:
 * no merchant screen edits them. Keepsakes and tours are sold; stays and experiences are a
 * later stage, so they show "soon" and open nothing.
 */
export const categories: Category[] = [
  {
    id: "keepsakes",
    name: { en: "Keepsakes", de: "Andenken" },
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
