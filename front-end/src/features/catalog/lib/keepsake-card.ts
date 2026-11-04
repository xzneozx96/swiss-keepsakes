import type { PublicKeepsakeCard, PublicKeepsakePhoto } from '@sk/api-contract'
import type { ProductCardProps } from '../components/product-card'
import type { MessageKey } from '@/i18n/en'
import { photoCopy } from './photo-copy'

type Translate = (key: MessageKey) => string

const CARD_PHOTO_WIDTH = 800

/** A card shows the widest copy when none is as wide as it; the original only when there are no copies. */
const coverUrl = (cover: PublicKeepsakePhoto) => photoCopy(cover.variants, CARD_PHOTO_WIDTH) ?? cover.variants.reduce<{ width: number, url: string } | undefined>((widest, v) => !widest || v.width > widest.width ? v : widest, undefined)?.url ?? cover.url

/** A card of the public list: photo, name, sold-out state and language note. No price and no pickup line (AC54). */
export function toKeepsakeCard(item: PublicKeepsakeCard, t: Translate): ProductCardProps {
  return {
    slug: item.slug,
    // A card in the other language than the list's links to its own address, so the page needs no redirect.
    lang: item.language,
    name: item.name,
    photo: item.cover ? coverUrl(item.cover) : undefined,
    soldOutLabel: item.soldOut ? t('gifts.soldOut') : undefined,
    languageNote: item.fallback ? t(item.language === 'en' ? 'gifts.textInEnglish' : 'gifts.textInGerman') : undefined,
  }
}
