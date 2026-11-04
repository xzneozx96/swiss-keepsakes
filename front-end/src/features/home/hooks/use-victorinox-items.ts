import { useLocale } from '@/contexts/locale-context'
import { useProducts } from '@/features/catalog/api/queries'
import { victorinoxItems } from '../lib/victorinox-items'

export function useVictorinoxItems() {
  const { language } = useLocale()

  return useProducts(products => victorinoxItems(products, language))
}
