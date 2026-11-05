import type { TourCommentView } from '../hooks/use-tour-comments'
import type { Language } from '@/contexts/locale-context'

import { Button, buttonVariants } from '@heroui/react'
import { useState } from 'react'

import { InfoIcon } from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'

const FIRST = 3

function Comment({ comment, lang }: { comment: TourCommentView, lang: string }) {
  const { t } = useLocale()

  return (
    <article className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <img
          alt=""
          className="size-10 shrink-0 rounded-full bg-surface-secondary object-cover"
          decoding="async"
          loading="lazy"
          src={comment.avatar}
        />
        <div className="flex flex-col">
          <span className="font-semibold">{comment.name}</span>
          <span className="text-xs text-muted">{comment.date}</span>
        </div>
      </div>
      <p className="text-body" lang={lang}>{comment.text}</p>
      {comment.replies.map(reply => (
        <div key={reply.id} className="flex flex-col gap-1 border-s border-separator ps-4">
          <span className="text-sm font-semibold">
            {reply.isShop ? t('tourDetail.comments.replyFrom', { name: reply.name }) : reply.name}
          </span>
          <span className="text-xs text-muted">{reply.date}</span>
          <p className="text-sm" lang={lang}>{reply.text}</p>
        </div>
      ))}
    </article>
  )
}

/** Guest comments on a tour (demo data): the first three, then all of them in a sheet. No rating, no form. */
export function TourComments({ comments, lang, tourName }: { comments: TourCommentView[], lang: Language, tourName: string }) {
  const { t, intlLocale, language } = useLocale()
  const [open, setOpen] = useState(false)

  if (comments.length === 0)
    return null

  const plural = new Intl.PluralRules(intlLocale).select(comments.length) === 'one' ? 'one' : 'other'

  return (
    <section className="flex flex-col gap-6 border-t border-separator py-7" id="tour-comments">
      <h2 className="font-serif text-title">{t('tourDetail.comments.title')}</h2>
      {lang !== language && (
        <p className="flex items-start gap-2 text-sm">
          <InfoIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
          {t(lang === 'en' ? 'tourDetail.comments.onlyInEnglish' : 'tourDetail.comments.onlyInGerman')}
        </p>
      )}
      <ul className="flex flex-col gap-8">
        {comments.slice(0, FIRST).map(comment => (
          <li key={comment.id}>
            <Comment comment={comment} lang={lang} />
          </li>
        ))}
      </ul>
      {comments.length > FIRST && (
        <>
          <button
            className={buttonVariants({ variant: 'tertiary', size: 'lg', fullWidth: true })}
            type="button"
            onClick={() => setOpen(true)}
          >
            {t(`tourDetail.comments.showAll.${plural}`, { count: comments.length })}
          </button>
          <SheetFrame
            footer={(
              <Button fullWidth size="lg" variant="secondary" onPress={() => setOpen(false)}>
                {t('detail.sheet.close')}
              </Button>
            )}
            isOpen={open}
            title={t('tourDetail.comments.sheetTitle', { name: tourName })}
            onClose={() => setOpen(false)}
          >
            <ul className="flex flex-col gap-8">
              {comments.map(comment => (
                <li key={comment.id}>
                  <Comment comment={comment} lang={lang} />
                </li>
              ))}
            </ul>
          </SheetFrame>
        </>
      )}
    </section>
  )
}
