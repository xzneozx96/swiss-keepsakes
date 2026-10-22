const MARKS = /[\u0300-\u036F]/g
const NOT_ALNUM = /[^a-z0-9]+/g
const D_STROKE = /đ/g
const EDGE_DASHES = /^-+|-+$/g

/** The store's URL name from its name: lower-case letters and digits, one dash between words, at most 60 characters. */
export function slugFromName(name: string): string {
  return name
    .normalize('NFKD')
    .toLowerCase()
    .replace(MARKS, '')
    .replace(D_STROKE, 'd')
    .replace(NOT_ALNUM, '-')
    .replace(EDGE_DASHES, '')
    .slice(0, 60)
    .replace(EDGE_DASHES, '')
}
