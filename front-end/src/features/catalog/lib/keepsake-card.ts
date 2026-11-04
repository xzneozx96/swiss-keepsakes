import type { PublicKeepsakeCard, PublicKeepsakePhoto } from '@sk/api-contract'
import type { ProductCardProps } from '../components/product-card'
import type { MessageKey } from '@/i18n/en'

type Translate = (key: MessageKey) => string

const CARD_PHOTO_WIDTH = 800

/** The smallest copy that is wide enough for a card, else the widest one, else the original. */
function coverUrl(cover: PublicKeepsakePhoto): string {
  const variants = cover.variants
  return (variants.find(v => v.width >= CARD_PHOTO_WIDTH) ?? variants.at(-1))?.url ?? cover.url
}

/** A card of the public list: photo, name, sold-out state and language note. No price and no pickup line (AC54). */
export function toKeepsakeCard(item: PublicKeepsakeCard, t: Translate): ProductCardProps {
  return {
    slug: item.slug,
    name: item.name,
    photo: item.cover ? coverUrl(item.cover) : undefined,
    soldOutLabel: item.soldOut ? t('gifts.soldOut') : undefined,
    languageNote: item.fallback ? t(item.language === 'en' ? 'gifts.textInEnglish' : 'gifts.textInGerman') : undefined,
  }
}
