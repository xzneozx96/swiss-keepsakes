const marks = /\p{M}/gu
const sharpS = /ß/g
const umlauts = /[äöü]/gi
const digraph: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue' }

/** Text as the matcher compares it: accents removed, lower case, and the German sharp s written ss. */
export function fold(text: string): string {
  return text.normalize('NFD').replace(marks, '').toLowerCase().replace(sharpS, 'ss')
}

/** The same, with ä, ö and ü written ae, oe and ue first, as a guest on an English keyboard types them. */
export function foldDigraphs(text: string): string {
  return fold(text.normalize('NFC').replace(umlauts, letter => digraph[letter.toLowerCase()] ?? letter))
}
