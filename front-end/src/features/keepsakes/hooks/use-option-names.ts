import { useKeepsakes } from '../api/queries'

/**
 * The option names that the store's other keepsakes already use, each once (ignoring case), for the name field's
 * suggestions. Empty while the list loads and when no other keepsake has an option. `exceptId` is the keepsake being
 * edited, whose own options are not suggestions.
 */
export function useOptionNames(storeId: string, exceptId?: string): { en?: string, de?: string }[] {
  const { data } = useKeepsakes(storeId)
  const seen = new Set<string>()

  return (data?.items ?? []).filter(item => item.id !== exceptId).flatMap(item => item.optionNames).filter((name) => {
    const key = (name.en ?? name.de ?? '').trim().toLowerCase()

    if (!key || seen.has(key))
      return false
    seen.add(key)

    return true
  })
}
