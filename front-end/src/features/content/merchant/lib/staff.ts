import type { ArticleAuthor } from "../../types";
import type { Language } from "@/contexts/locale-context";
import type { Role } from "@/features/demo";

/**
 * The name guests see on a story, a shop comment or a review reply written by the signed-in
 * staff member (the prototype bar's role stands in for staff sign-in). The seeded stories and
 * shop comments use "Ngọc" and "Lukas", so new ones match them.
 */
export const publicStaffName = (role: Role) =>
  role === "manager" ? "Lukas" : "Ngọc";

const roles: Record<"owner" | "manager", Record<Language, string>> = {
  owner: {
    en: "Owner, Swiss Keepsakes Luzern",
    de: "Inhaberin, Swiss Keepsakes Luzern",
  },
  manager: {
    en: "Shop manager, Swiss Keepsakes Luzern",
    de: "Ladenleiter, Swiss Keepsakes Luzern",
  },
};

/** A known staff role in the other language, for a translated copy; other text stays as written. */
export function translateRole(role: string, to: Language): string {
  const match = Object.values(roles).find(
    (r) => r.en === role || r.de === role,
  );

  return match ? match[to] : role;
}

/** A new article's byline: the staff member writing it, in the article's language. */
export function defaultAuthor(role: Role, language: Language): ArticleAuthor {
  return {
    name: publicStaffName(role),
    role: roles[role === "manager" ? "manager" : "owner"][language],
  };
}
