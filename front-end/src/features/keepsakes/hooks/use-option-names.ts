import { useKeepsakes } from '../api/queries'

/** What the name field offers while no keepsake of the shop has an option of its own yet. */
const STARTER_NAMES: { en: string, de: string }[] = [{ en: 'Size', de: 'Grösse' }, { en: 'Colour', de: 'Farbe' }, { en: 'Material', de: 'Material' }]

/**
 * The option names that the store's other keepsakes already use, each once (ignoring case), for the name field's
 * suggestions. Empty while the list loads and when no other keepsake has an option. `exceptId` is the keepsake being
 * edited, whose own options are not suggestions. Once the list has loaded and no other keepsake has an option, the starter
 * names (Size, Colour, Material) are offered instead; as soon as the shop has names of its own, only those show.
 */
export function useOptionNames(storeId: string, exceptId?: string): { en?: string, de?: string }[] {
  const { data } = useKeepsakes(storeId)
  const seen = new Set<string>()
  const own = (data?.items ?? []).filter(item => item.id !== exceptId).flatMap(item => item.optionNames).filter((name) => {
    const key = (name.en ?? name.de ?? '').trim().toLowerCase()

    if (!key || seen.has(key))
      return false
    seen.add(key)

    return true
  })

  return data && own.length === 0 ? STARTER_NAMES : own
}
