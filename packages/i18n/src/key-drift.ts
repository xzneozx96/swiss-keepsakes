type Dictionary = Readonly<Record<string, string>>

/**
 * Keys that one language has and the other lacks. Typing DE as `Record<keyof typeof en, string>`
 * catches a missing German key, but not an extra one that arrives through a spread.
 */
export function keyDrift(en: Dictionary, de: Dictionary): { onlyEn: string[], onlyDe: string[] } {
  const enKeys = new Set(Object.keys(en))
  const deKeys = new Set(Object.keys(de))

  return {
    onlyEn: [...enKeys].filter(key => !deKeys.has(key)),
    onlyDe: [...deKeys].filter(key => !enKeys.has(key)),
  }
}
