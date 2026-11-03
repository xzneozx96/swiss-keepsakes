import type { Article } from '@sk/domain/content'

import type { QueriedData } from '@/features/demo/types'

import { isPublished } from '@sk/domain/catalog'

/** A linked gift or tour that guests can't open any more (R16: it drops out of C20). */
export function isLinkHidden(
  data: Pick<QueriedData, 'tours' | 'products'>,
  link: Article['links'][number],
): boolean {
  if (link.kind === 'tour')
    return !data.tours?.tours.find(t => t.id === link.id)?.published
  const product = data.products.find(p => p.id === link.id)

  return !product || !isPublished(product)
}
