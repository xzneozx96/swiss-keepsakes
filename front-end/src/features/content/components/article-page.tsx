import type { CommentView } from '../hooks/use-article'

import { Button } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { EmptyState } from '@/components/empty-state'

import { ContentIcon } from '@/components/icons'
import {
  BackButton,
  CartButton,
  CompactBar,
} from '@/components/layout/cart-button'
import { LanguageButton } from '@/components/layout/language-button'
import { Media } from '@/components/media'

import { useLocale } from '@/contexts/locale-context'
import { useRequireSignIn } from '@/features/auth/hooks/use-require-sign-in'
import { ProductCard } from '@/features/catalog/components/product-card'
import { Rail } from '@/features/discovery/components/section'
import { StoryRow } from '@/features/discovery/components/story-row'
import { TripAdviceButton } from '@/features/discovery/components/trip-advice-button'
import { TourCard } from '@/features/tours/discovery/tour-card'
import { useScrolledPast } from '@/hooks/use-scrolled-past'
import { readStored, writeStored } from '@/lib/storage'
import { useArticle } from '../hooks/use-article'
import { ArticleBlocks } from './article-blocks'
import {
  ArticleComments,
  commentAnchor,
  CommentSheet,
} from './article-comments'
import { ArticleContents, sectionAnchor } from './article-contents'

/**
 * A comment started while signed out. C05 steps back to this screen after sign-in (no new
 * history entry), and the sheet reopens for the same story and, for a reply, the same comment.
 */
const PENDING_KEY = 'sk.pendingComment'

interface PendingComment { slug: string, replyTo: string | null }

/**
 * C20 Article (spec §4.11; blog layout per owner 14.10.2026): a tall cover with the title,
 * the author byline, a contents bar that follows the reader through the sections, photos,
 * video and audio in the body, the linked gifts and tours, then comments. Commenting needs
 * sign-in (AC16): C05 returns here with the sheet open.
 */
export function ArticlePage({
  slug,
  onBack,
}: {
  slug: string
  onBack: () => void
}) {
  const { language, t } = useLocale()
  const view = useArticle(slug)
  const { signedIn, requireSignIn } = useRequireSignIn()
  const [coverEnd, scrolledPast] = useScrolledPast<HTMLDivElement>()
  const bodyRef = useRef<HTMLDivElement>(null)
  const comments = view?.comments
  // The comment the guest started before signing in comes back from storage, read once when the page opens.
  const [resume] = useState(() => {
    const pending = readStored<PendingComment | null>(PENDING_KEY, null)

    return signedIn && comments && pending?.slug === slug
      ? { replyTo: comments.find(c => c.id === pending.replyTo) }
      : null
  })
  const [sheetOpen, setSheetOpen] = useState(resume !== null)
  const [replyTo, setReplyTo] = useState<CommentView | undefined>(resume?.replyTo)
  const [announcement, setAnnouncement] = useState('')

  const openSheet = (comment?: CommentView) => {
    setReplyTo(comment)
    setSheetOpen(true)
  }

  const startComment = (comment?: CommentView) => {
    if (!signedIn) {
      writeStored(PENDING_KEY, {
        slug,
        replyTo: comment?.id ?? null,
      } satisfies PendingComment)
    }
    requireSignIn(() => openSheet(comment))
  }

  useEffect(() => {
    if (resume)
      writeStored(PENDING_KEY, null)
  }, [resume])

  if (!view) {
    return (
      <div className="pt-16">
        <EmptyState
          action={{ label: t('article.allStories'), to: '/$lang/stories', params: { lang: language } }}
          icon={ContentIcon}
          message={t('article.notFound')}
        />
      </div>
    )
  }

  const { article } = view

  const post = (text: string) => {
    const id = view.addComment(text, replyTo?.id)

    setSheetOpen(false)
    if (!id)
      return
    setAnnouncement(t('article.posted'))
    // After the sheet closes and the new comment renders.
    window.setTimeout(() => {
      const el = document.getElementById(commentAnchor(id))

      el?.scrollIntoView({ block: 'center' })
      el?.focus({ preventScroll: true })
    }, 350)
  }

  return (
    <div className="flex flex-1 flex-col">
      <CompactBar
        leading={<BackButton label={t('detail.back')} onPress={onBack} />}
        title={article.title}
        visible={scrolledPast}
      >
        <LanguageButton tone="bar" />
        <CartButton tone="bar" />
      </CompactBar>

      <Media alt="" className="h-[min(68dvh,540px)]" photo={article.photo}>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/5 to-black/75"
        />
        <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-2">
          <BackButton label={t('detail.back')} tone="pill" onPress={onBack} />
          <span className="flex-1" />
          <LanguageButton tone="pill" />
          <CartButton tone="pill" />
        </div>
        <header
          className="absolute inset-x-6 bottom-12 flex flex-col gap-2 text-white"
          lang={article.language}
        >
          <h1 className="font-serif text-display text-balance">
            {article.title}
          </h1>
          <p className="text-body text-white/85">{article.excerpt}</p>
        </header>
      </Media>
      <div ref={coverEnd} aria-hidden className="h-px" />

      <div className="relative -mt-6 flex flex-1 flex-col rounded-t-3xl bg-background px-6 pt-7 pb-4">
        <div className="flex items-center gap-3">
          <img
            alt=""
            className="size-12 shrink-0 rounded-full bg-surface-secondary object-cover"
            decoding="async"
            src={view.authorAvatar}
          />
          <div className="flex min-w-0 flex-col" lang={article.language}>
            <span className="font-semibold">{article.author.name}</span>
            <span className="text-sm text-muted">{article.author.role}</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted tabular-nums">{view.meta}</p>

        <p className="mt-6 text-lg leading-8" lang={article.language}>
          {article.intro}
        </p>

        <div className="mt-6 flex flex-col">
          <ArticleContents
            bodyRef={bodyRef}
            label={t('article.contents')}
            sections={article.sections}
          />
          <div ref={bodyRef} className="flex flex-col" lang={article.language}>
            {article.sections.map(section => (
              <section
                key={section.id}
                aria-labelledby={`${sectionAnchor(section.id)}-heading`}
                className="flex scroll-mt-[calc(env(safe-area-inset-top,0px)+124px)] flex-col gap-4 pt-9"
                id={sectionAnchor(section.id)}
              >
                <h2
                  className="font-serif text-title text-balance"
                  id={`${sectionAnchor(section.id)}-heading`}
                >
                  {section.heading}
                </h2>
                <ArticleBlocks blocks={section.blocks} />
              </section>
            ))}
          </div>
        </div>

        {view.links.length > 0 && (
          <section
            aria-labelledby="article-linked"
            className="mt-10 flex flex-col gap-4 border-t border-separator pt-7"
          >
            <h2 className="font-serif text-title" id="article-linked">
              {t('article.linked')}
            </h2>
            <div className="-mx-2">
              <Rail label={t('article.linked')}>
                {view.links.map(link =>
                  link.kind === 'tour'
                    ? (
                        <li key={`tour-${link.tour.id}`}>
                          <TourCard layout="carousel" tour={link.tour} />
                        </li>
                      )
                    : (
                        <li key={`gift-${link.card.slug}`} className="flex">
                          <ProductCard {...link.card} layout="carousel" />
                        </li>
                      ),
                )}
              </Rail>
            </div>
          </section>
        )}

        {view.related.length > 0 && (
          <section
            aria-labelledby="article-more"
            className="mt-10 flex flex-col gap-4 border-t border-separator pt-7"
          >
            <h2 className="font-serif text-title" id="article-more">
              {t('article.more')}
            </h2>
            <ul className="flex flex-col gap-3">
              {view.related.map(story => (
                <li key={story.slug}>
                  <StoryRow {...story} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-10">
          <ArticleComments
            comments={view.comments}
            count={view.commentCount}
            onReply={startComment}
          />
        </div>
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>

      <TripAdviceButton above="actionBar" />
      <div className="sticky bottom-0 z-30 border-t border-separator bg-background px-6 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
        <Button fullWidth size="lg" onPress={() => startComment()}>
          {t(signedIn ? 'article.write' : 'article.signInToComment')}
        </Button>
      </div>

      <CommentSheet
        authorName={view.commenterName ?? ''}
        isOpen={sheetOpen}
        replyTo={replyTo}
        onOpenChange={setSheetOpen}
        onPost={post}
      />
    </div>
  )
}
