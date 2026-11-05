import { useOptionNamesRead } from '../api/queries'

/** What the name field offers while no keepsake of the shop has an option of its own yet. */
const STARTER_NAMES: { en: string, de: string }[] = [{ en: 'Size', de: 'Grösse' }, { en: 'Colour', de: 'Farbe' }, { en: 'Material', de: 'Material' }]

/**
 * The option names that the store's other keepsakes already use, each once (ignoring case), for the name field's
 * suggestions, read from the server (at most 50). Empty while the read loads. `exceptId` is the keepsake being edited, whose own
 * options are not suggestions. Once the read has loaded and no other keepsake has an option, the starter names (Size, Colour,
 * Material) are offered instead; as soon as the shop has names of its own, only those show.
 */
export function useOptionNames(storeId: string, exceptId?: string): { en?: string, de?: string }[] {
  const { data } = useOptionNamesRead(storeId, exceptId)
  const own = data?.items ?? []

  return data && own.length === 0 ? STARTER_NAMES : own
}
