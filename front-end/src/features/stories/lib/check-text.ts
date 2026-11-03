import type { Check } from './publish-checks'
import type { MessageKey } from '@/i18n/en'

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string

/** The sentence of a check, in the merchant's language. */
export function checkText(t: Translate, check: Check): string {
  const count = check.count ?? 0
  const language = check.language === undefined ? '' : t(`storyEditor.language.${check.language}`)
  const name = check.name ?? ''

  switch (check.code) {
    case 'cover': return t('storyPublish.check.cover')
    case 'title': return t('storyPublish.check.title')
    case 'excerpt': return t('storyPublish.check.excerpt')
    case 'link': return t('storyPublish.check.link')
    case 'review-place': return t('storyPublish.check.reviewPlace')
    case 'review-date': return t('storyPublish.check.reviewDate')
    case 'no-text': return t('storyPublish.check.noText')
    case 'no-alt': return t(count === 1 ? 'storyPublish.check.noAlt.one' : 'storyPublish.check.noAlt.other', { count })
    case 'no-caption': return t(count === 1 ? 'storyPublish.check.noCaption.one' : 'storyPublish.check.noCaption.other', { count })
    case 'pin-unpublished': return t('storyPublish.check.pinUnpublished', { name })
    case 'no-category': return t('storyPublish.check.noCategory')
    case 'related-language': return t('storyPublish.check.relatedLanguage', { name, language })
    case 'keepsake-unpublished': return t('storyPublish.check.keepsakeUnpublished', { name })
    case 'other-language': return t('storyPublish.check.otherLanguage', { language })
  }
}
