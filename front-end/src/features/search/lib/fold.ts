const marks = /\p{M}/gu
const sharpS = /ß/g

/** Text as the matcher compares it: accents removed, lower case, and the German sharp s written ss. */
export function fold(text: string): string {
  return text.normalize('NFD').replace(marks, '').toLowerCase().replace(sharpS, 'ss')
}
