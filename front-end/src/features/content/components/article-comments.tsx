import type { CommentView } from '../hooks/use-article'

import {
  Button,
  Chip,
  Description,
  Drawer,
  FieldError,
  Form,
  Label,
  TextArea,
  TextField,
} from '@heroui/react'
import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'

const MAX_TEXT = 1000

export const commentAnchor = (id: string) => `comment-${id}`

/** One comment, laid out like the "full" review card (C03): person first, then the text. */
function CommentItem({
  comment,
  reply,
  anchored,
  onReply,
}: {
  comment: CommentView
  reply?: boolean
  /** The page copy carries the id posting scrolls to; the sheet copy does not. */
  anchored: boolean
  onReply?: () => void
}) {
  const { t } = useLocale()

  return (
    <article
      className="flex scroll-mt-36 flex-col gap-2 rounded-xl outline-none focus-visible:focus-ring"
      id={anchored ? commentAnchor(comment.id) : undefined}
      tabIndex={-1}
    >
      <div className="flex items-center gap-3">
        <img
          alt=""
          className={`shrink-0 rounded-full bg-surface-secondary object-cover ${reply ? 'size-9' : 'size-12'}`}
          decoding="async"
          loading="lazy"
          src={comment.avatar}
        />
        <div className="flex min-w-0 flex-col">
          <span className="flex items-center gap-2 font-semibold">
            <span className="truncate">{comment.name}</span>
            {comment.isShop && (
              <Chip size="sm" variant="secondary">
                <Chip.Label>{t('article.shop')}</Chip.Label>
              </Chip>
            )}
          </span>
          <span className="text-sm text-muted tabular-nums">
            {comment.date}
          </span>
        </div>
      </div>
      <p className="text-body">{comment.text}</p>
      {onReply && (
        <button
          className="-ms-2 self-start rounded-full px-2 py-2.5 text-sm font-medium text-muted underline underline-offset-4 outline-none focus-visible:focus-ring"
          type="button"
          onClick={onReply}
        >
          {t('article.reply')}
        </button>
      )}
    </article>
  )
}

/** Threads on the page before "Show all" (owner, 14.10.2026), as reviews show a few first. */
const PREVIEW_THREADS = 3

function Thread({
  comment,
  anchored,
  onReply,
}: {
  comment: CommentView
  anchored: boolean
  onReply: () => void
}) {
  return (
    <li className="flex flex-col gap-5">
      <CommentItem anchored={anchored} comment={comment} onReply={onReply} />
      {comment.replies.length > 0 && (
        <ul className="ms-6 flex flex-col gap-5 border-s border-separator ps-4">
          {comment.replies.map(r => (
            <li key={r.id}>
              <CommentItem reply anchored={anchored} comment={r} />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/**
 * C20 comments (spec §4.11, AC16): the three most recently active threads, replies one
 * level deep, then "Show all" opens every comment in a tall sheet, as gift and tour reviews do.
 */
export function ArticleComments({
  comments,
  count,
  onReply,
}: {
  comments: CommentView[]
  count: number
  onReply: (comment: CommentView) => void
}) {
  const { t, intlLocale } = useLocale()
  const [allOpen, setAllOpen] = useState(false)
  const heading = (
    <>
      {t('article.comments')}
      {count > 0 && (
        <span className="ms-2 font-sans text-base text-muted tabular-nums">
          {count}
        </span>
      )}
    </>
  )

  return (
    <section
      aria-labelledby="article-comments"
      className="flex flex-col gap-6 border-t border-separator py-7"
    >
      <h2 className="font-serif text-title" id="article-comments">
        {heading}
      </h2>
      {comments.length === 0
        ? (
            <p className="text-sm text-muted">{t('article.noComments')}</p>
          )
        : (
            <ul className="flex flex-col gap-7">
              {comments.slice(0, PREVIEW_THREADS).map(c => (
                <Thread
                  key={c.id}
                  anchored
                  comment={c}
                  onReply={() => onReply(c)}
                />
              ))}
            </ul>
          )}
      {comments.length > PREVIEW_THREADS && (
        <Button
          fullWidth
          size="lg"
          variant="secondary"
          onPress={() => setAllOpen(true)}
        >
          {t(
            new Intl.PluralRules(intlLocale).select(count) === 'one'
              ? 'article.showAll.one'
              : 'article.showAll.other',
            { count },
          )}
        </Button>
      )}
      <Drawer.Backdrop isOpen={allOpen} onOpenChange={setAllOpen}>
        <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
          <Drawer.Dialog
            aria-label={t('article.comments')}
            className="flex sheet-tall flex-col"
          >
            <Drawer.Handle />
            <Drawer.Header className="flex items-center justify-start">
              <Drawer.CloseTrigger aria-label={t('article.close')} />
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-8 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+24px)] text-foreground">
              <h2 className="font-serif text-title">{heading}</h2>
              <ul className="flex flex-col gap-7">
                {comments.map(c => (
                  <Thread
                    key={c.id}
                    anchored={false}
                    comment={c}
                    onReply={() => {
                      // The comment sheet opens instead of stacking on this one.
                      setAllOpen(false)
                      onReply(c)
                    }}
                  />
                ))}
              </ul>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </section>
  )
}

/** The comment sheet (same build as the C18 review sheet); a reply names its comment. */
export function CommentSheet({
  isOpen,
  replyTo,
  authorName,
  onOpenChange,
  onPost,
}: {
  isOpen: boolean
  replyTo?: CommentView
  authorName: string
  onOpenChange: (open: boolean) => void
  onPost: (text: string) => void
}) {
  const { t } = useLocale()

  return (
    <Drawer.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
        <Drawer.Dialog className="flex sheet-max flex-col">
          <Drawer.Handle />
          <Drawer.Header className="flex flex-row items-center justify-between gap-2">
            <Drawer.Heading className="font-serif text-title">
              {replyTo
                ? t('article.replyTo', { name: replyTo.name })
                : t('article.write')}
            </Drawer.Heading>
            <Drawer.CloseTrigger aria-label={t('article.close')} />
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-6 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+24px)] text-foreground">
            {replyTo && (
              <blockquote className="line-clamp-3 border-s border-separator ps-3 text-sm text-muted">
                {replyTo.text}
              </blockquote>
            )}
            <CommentForm
              key={replyTo?.id ?? 'new'}
              authorName={authorName}
              onPost={onPost}
            />
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}

function CommentForm({
  authorName,
  onPost,
}: {
  authorName: string
  onPost: (text: string) => void
}) {
  const { t } = useLocale()
  const [text, setText] = useState('')
  const [showError, setShowError] = useState(false)

  return (
    <Form
      className="flex flex-col gap-6"
      validationBehavior="aria"
      onSubmit={(e) => {
        e.preventDefault()
        if (text.trim() === '') {
          setShowError(true)

          return
        }
        onPost(text)
      }}
    >
      <TextField
        fullWidth
        isInvalid={showError && text.trim() === ''}
        maxLength={MAX_TEXT}
        name="comment"
        value={text}
        onChange={setText}
      >
        <Label className="text-heading">{t('article.composer.label')}</Label>
        <TextArea rows={5} />
        <Description>
          {t('article.composer.help', { name: authorName })}
        </Description>
        <FieldError>{t('article.composer.error')}</FieldError>
      </TextField>
      <Button fullWidth size="lg" type="submit">
        {t('article.post')}
      </Button>
    </Form>
  )
}
