const TRAILING_DASHES = /-+$/
const EDGE_DASHES = /^-+|-+$/g
const NOT_ALNUM_RUNS = /[^a-z0-9]+/g
const COMBINING_MARKS = /[\u0300-\u036F]/g
const UMLAUT_U = /ü/g
const UMLAUT_O = /ö/g
const UMLAUT_A = /ä/g
/** "Kapellbrücke Taschenmesser" → "kapellbruecke-taschenmesser", as the seeded slugs. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(UMLAUT_A, 'ae')
    .replace(UMLAUT_O, 'oe')
    .replace(UMLAUT_U, 'ue')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(NOT_ALNUM_RUNS, '-')
    .replace(EDGE_DASHES, '')
    .slice(0, 60)
    .replace(TRAILING_DASHES, '')
}
