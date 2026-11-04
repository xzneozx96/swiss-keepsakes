/** The shape the guest keepsake page reads: options with values, and one variant per sold combination. */
export interface ChoiceOption {
  id: string
  label: string
  values: { id: string, label: string, /** Shown under the label, e.g. the price when there is one option. */ hint?: string }[]
}

export interface ChoiceVariant {
  id: string
  /** The value chosen for each option. */
  values: Record<string, string>
  price: string
  /** Set = sold out or not sold: it cannot be picked. */
  reason?: string
  /** Index into the gallery photos; this photo moves to the front when the variant is chosen. */
  photoIndex?: number
}

/** The chosen value per option id. */
export type Chosen = Record<string, string>

function matches(variant: ChoiceVariant, options: ChoiceOption[], chosen: Chosen) {
  return options.every(o => variant.values[o.id] === chosen[o.id])
}

/** The variant whose values are exactly the chosen ones; with no options, the only variant. */
export function chosenVariant(
  options: ChoiceOption[],
  variants: ChoiceVariant[],
  chosen: Chosen,
): ChoiceVariant | undefined {
  if (options.length === 0)
    return variants[0]

  return variants.find(v => matches(v, options, chosen))
}

/**
 * Why a value cannot be picked, per option and value id; a pickable value is absent. A value is
 * blocked when no variant with it and the other chosen values can be picked: the reason is the one
 * a matching variant carries, or `missing` when the combination is not sold at all.
 */
export function valueReasons(
  options: ChoiceOption[],
  variants: ChoiceVariant[],
  chosen: Chosen,
  missing: string,
): Record<string, Record<string, string>> {
  return Object.fromEntries(
    options.map((option) => {
      const others = options.filter(o => o.id !== option.id)
      const blocked: Record<string, string> = {}

      for (const value of option.values) {
        const candidates = variants.filter(
          v =>
            v.values[option.id] === value.id
            && others.every(o => chosen[o.id] === undefined || v.values[o.id] === chosen[o.id]),
        )

        if (candidates.some(v => !v.reason))
          continue
        blocked[value.id] = candidates[0]?.reason ?? missing
      }

      return [option.id, blocked]
    }),
  )
}

export function pickValue(chosen: Chosen, optionId: string, valueId: string): Chosen {
  return { ...chosen, [optionId]: valueId }
}

/** The photos with the one at `index` first; an unknown or first index keeps the order. */
export function galleryOrder<T>(photos: T[], index: number | undefined): T[] {
  if (index === undefined || index <= 0 || index >= photos.length)
    return photos

  return [photos[index], ...photos.slice(0, index), ...photos.slice(index + 1)]
}

/**
 * Why a value cannot be picked at all: no combination with it can be picked (sold out or not sold). Unlike
 * `valueReasons`, other chosen values do not block it, so a guest can switch from Red/S to Blue/L; `settleChoice`
 * then moves the other options to a combination that exists.
 */
export function blockedValues(
  options: ChoiceOption[],
  variants: ChoiceVariant[],
  missing: string,
): Record<string, Record<string, string>> {
  return Object.fromEntries(
    options.map(option => [
      option.id,
      Object.fromEntries(
        option.values.flatMap((value) => {
          const candidates = variants.filter(v => v.values[option.id] === value.id)

          return candidates.some(v => !v.reason) ? [] : [[value.id, candidates[0]?.reason ?? missing]]
        }),
      ),
    ]),
  )
}

/** The choice after picking a value: the combination it makes when that can be picked, else the pickable combination with it that keeps most of the other choices. */
export function settleChoice(
  options: ChoiceOption[],
  variants: ChoiceVariant[],
  chosen: Chosen,
  optionId: string,
  valueId: string,
): Chosen {
  const next = pickValue(chosen, optionId, valueId)
  const exact = chosenVariant(options, variants, next)

  if (exact && !exact.reason)
    return next
  const kept = (v: ChoiceVariant) => options.filter(o => v.values[o.id] === chosen[o.id]).length
  const best = variants
    .filter(v => !v.reason && v.values[optionId] === valueId)
    .sort((a, b) => kept(b) - kept(a))[0]

  return best ? { ...best.values } : next
}
