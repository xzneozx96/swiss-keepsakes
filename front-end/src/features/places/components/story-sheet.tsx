import type { Article } from '@sk/domain/content'
import type { Language } from '@sk/domain/shared'

import { Button } from '@heroui/react'

import { InfoIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { ArticleBlocks } from '@/features/content/components/article-blocks'

/**
 * The story of the pin in a bottom sheet inside the place editor's phone, so the merchant reads what "Read the story"
 * opens without leaving the editor (on the real guest map it opens the story page). The cover, the byline, the intro and
 * the sections are drawn with the guest story page's own parts (`Media`, `ArticleBlocks`). `article` is the version the
 * guest page would draw, a draft included; without one the sheet says the text is not available here yet.
 */
export function StorySheet({ isOpen, container, title, language, article, onClose }: {
  isOpen: boolean
  /** The phone's screen: the sheet slides up inside it and not over the page. */
  container: Element | null
  title: string
  language: Language
  article: Article | undefined
  onClose: () => void
}) {
  const { t } = useLocale()

  return (
    <SheetFrame
      container={container ?? undefined}
      footer={<Button fullWidth variant="secondary" onPress={onClose}>{t('places.preview.story.close')}</Button>}
      isOpen={isOpen && container !== null}
      title={title}
      tightBottom
      onClose={onClose}
    >
      {article
        ? (
            <div className="flex flex-col gap-4" lang={article.language}>
              {article.publication.status === 'draft' && (
                <p className="flex items-start gap-2 rounded-xl bg-surface-secondary p-3 text-sm" role="status">
                  <InfoIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
                  {t('places.preview.story.draft')}
                </p>
              )}
              <Media alt="" className="aspect-[16/10] w-full shrink-0 rounded-2xl" photo={article.photo} />
              <p className="text-sm text-muted">{[article.author.name, article.author.role].filter(Boolean).join(' · ')}</p>
              <p className="text-lg leading-8">{article.intro}</p>
              {article.sections.map(section => (
                <section key={section.id} className="flex flex-col gap-4 pt-3">
                  <h3 className="font-serif text-title text-balance">{section.heading}</h3>
                  <ArticleBlocks blocks={section.blocks} />
                </section>
              ))}
            </div>
          )
        : <p className="text-muted" lang={language}>{t('places.preview.story.missing')}</p>}
    </SheetFrame>
  )
}
