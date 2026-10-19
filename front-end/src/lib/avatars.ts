const TRAILING_DASH = /-$/
const NOT_LETTER_RUNS = /[^a-z]+/g
const COMBINING_MARKS = /[\u0300-\u036F]/g
/**
 * Reviewer avatars: every SVG in src/assets/avatars, keyed by the reviewer's name in
 * lower case with dashes ("Marie D." -> "marie-d"). Sample cast, CC0; see CREDITS.txt.
 */
const files = import.meta.glob<string>('/src/assets/avatars/*.svg', {
  eager: true,
  import: 'default',
})

const bySlug = new Map(
  Object.entries(files).map(([path, url]) => [
    path.slice(path.lastIndexOf('/') + 1, -'.svg'.length),
    url,
  ]),
)

const pool = [...bySlug.values()]

/**
 * Avatar URL for a person's name: their own sample avatar when the cast has one, otherwise a
 * stable pick from the cast, so every name always shows the same face and never initials.
 */
export function avatarUrl(name: string): string {
  // Accents drop their marks first, so "Sonja" finds sonja.svg.
  const slug = name
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(NOT_LETTER_RUNS, '-')
    .replace(TRAILING_DASH, '')
  let hash = 0

  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0

  return bySlug.get(slug) ?? pool[hash % pool.length]
}
