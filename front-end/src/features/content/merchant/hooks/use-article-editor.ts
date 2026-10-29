import type { ArticleLink, ArticlePublication } from '@sk/domain/content'
import type {
  ArticleForm,
  BlockType,
  FormBlock,
  FormErrors,
  FormSection,
} from '../lib/article-form'
import type { Language } from '@/contexts/locale-context'

import { isPublished, isSoldOut } from '@sk/domain/catalog'

import { MAX_ARTICLE_LINKS, MAX_RELATED_STORIES } from '@sk/domain/content'
import { pickText, slugify } from '@sk/domain/shared'

import { useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useProducts } from '@/features/catalog/api/queries'
import { useSubmit } from '@/features/data-client'
import { useDemoSelector } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { useOrders } from '@/features/orders/api/queries'
import { useTourRecords } from '@/features/tours/api/queries'
import { useArticles } from '../../api/queries'
import { publishedArticles } from '../../lib/articles'
import {
  emptyForm,
  fromForm,
  move,
  newBlock,
  newSection,
  toForm,
  uniqueValue,
  validate,
} from '../lib/article-form'
import { defaultAuthor, translateRole } from '../lib/staff'
import { isLinkHidden } from './use-merchant-articles'

export type SaveMode = 'draft' | 'publish'

export interface LinkOption {
  link: ArticleLink
  name: string
  photo?: string
  /** Unpublished: kept in the list with a warning, hidden on C20 (R16). */
  hidden: boolean
  soldOut: boolean
}

export interface StoryOption {
  slug: string
  title: string
  photo: string
  readMinutes: number
  /** No published version in this language: C20 skips it (R18). */
  hidden: boolean
}

function sameLink(a: ArticleLink, b: ArticleLink) {
  return a.kind === b.kind && a.id === b.id
}

/**
 * M17 editor state (spec §4.11, R16–R18). Edits stay in this working copy until a save, so a
 * refresh drops them (outline side path "Refresh"). A new article is stored on its first save.
 */
export function useArticleEditor(articleId: string, newLanguage: Language) {
  const { t } = useLocale()
  const role = useDemoSelector(s => s.role)
  const clockStartedAt = useDemoSelector(s => s.clockStartedAt)
  const tours = useTourRecords()
  const products = useProducts()
  const orders = useOrders()
  // `save` and `addOtherVersion` set this right before sending, so meta.success (fixed once createArticle
  // and updateArticle are set up) always reads the text for the attempt actually in flight.
  const pendingSuccessRef = useRef('')
  const { submit: createArticle, isPending: isCreating } = useSubmit(
    'content',
    'createArticle',
    { meta: { success: () => pendingSuccessRef.current } },
  )
  const { submit: updateArticle, isPending: isUpdating } = useSubmit(
    'content',
    'updateArticle',
    { meta: { success: () => pendingSuccessRef.current } },
  )
  const articles = useArticles()
  const stored = articles.find(a => a.id === articleId)
  const [form, setForm] = useState<ArticleForm>(() =>
    stored
      ? toForm(stored)
      : emptyForm(newLanguage, defaultAuthor(role, newLanguage)),
  )
  const [baseline, setBaseline] = useState(form)
  const [attempt, setAttempt] = useState<SaveMode | null>(null)

  const dirty = JSON.stringify(form) !== JSON.stringify(baseline)
  // Errors show after a save attempt and clear as the merchant fixes each field.
  const errors: FormErrors = attempt ? validate(form, attempt) : {}

  const patch = (next: Partial<ArticleForm>) =>
    setForm(f => ({ ...f, ...next }))
  /** New articles only: the byline role follows the language, and picked stories reset (R18). */
  const setLanguage = (language: Language) =>
    setForm(f => ({
      ...f,
      language,
      author:
        f.author.role === defaultAuthor(role, f.language).role
          ? defaultAuthor(role, language)
          : f.author,
      related: [],
    }))
  const setSections = (fn: (sections: FormSection[]) => FormSection[]) =>
    setForm(f => ({ ...f, sections: fn(f.sections) }))
  const setBlocks = (
    sectionKey: string,
    fn: (blocks: FormBlock[]) => FormBlock[],
  ) =>
    setSections(sections =>
      sections.map(s =>
        s.key === sectionKey ? { ...s, blocks: fn(s.blocks) } : s,
      ),
    )

  const sections = {
    add: () => setSections(list => [...list, newSection()]),
    update: (key: string, next: Partial<FormSection>) =>
      setSections(list =>
        list.map(s => (s.key === key ? { ...s, ...next } : s)),
      ),
    move: (key: string, by: -1 | 1) =>
      setSections(list =>
        move(
          list,
          list.findIndex(s => s.key === key),
          by,
        ),
      ),
    remove: (key: string) =>
      setSections(list => list.filter(s => s.key !== key)),
  }

  const blocks = {
    add: (sectionKey: string, type: BlockType) =>
      setBlocks(sectionKey, list => [...list, newBlock(type)]),
    update: (sectionKey: string, key: string, next: Partial<FormBlock>) =>
      setBlocks(sectionKey, list =>
        list.map(b => (b.key === key ? ({ ...b, ...next } as FormBlock) : b))),
    move: (sectionKey: string, key: string, by: -1 | 1) =>
      setBlocks(sectionKey, list =>
        move(
          list,
          list.findIndex(b => b.key === key),
          by,
        )),
    remove: (sectionKey: string, key: string) =>
      setBlocks(sectionKey, list => list.filter(b => b.key !== key)),
  }

  // Linked gifts and tours (R16): any stored link keeps its place and counts toward the 6;
  // new ones can only be published items.
  const toOption = (link: ArticleLink): LinkOption => {
    if (link.kind === 'tour') {
      const tour = tours.tours.find(x => x.id === link.id)

      return {
        link,
        name: tour ? pickText(tour.name, form.language).text : link.id,
        photo: tour?.photos[0],
        hidden: isLinkHidden({ tours, products }, link),
        soldOut: false,
      }
    }
    const product = products.find(p => p.id === link.id)

    return {
      link,
      name: product ? pickText(product.name, form.language).text : link.id,
      photo: product?.photo,
      hidden: isLinkHidden({ tours, products }, link),
      soldOut: product ? isSoldOut(product, orders) : false,
    }
  }
  const linkCandidates: LinkOption[] = [
    ...products
      .filter(isPublished)
      .map(p => toOption({ kind: 'gift', id: p.id })),
    ...tours.tours
      .filter(x => x.published)
      .map(x => toOption({ kind: 'tour', id: x.id })),
  ]
  const links = {
    items: form.links.map(toOption),
    candidates: linkCandidates,
    isFull: form.links.length >= MAX_ARTICLE_LINKS,
    has: (link: ArticleLink) => form.links.some(l => sameLink(l, link)),
    add: (link: ArticleLink) =>
      setForm(f =>
        f.links.length >= MAX_ARTICLE_LINKS
        || f.links.some(l => sameLink(l, link))
          ? f
          : { ...f, links: [...f.links, link] },
      ),
    move: (index: number, by: -1 | 1) =>
      setForm(f => ({ ...f, links: move(f.links, index, by) })),
    remove: (index: number) =>
      setForm(f => ({ ...f, links: f.links.filter((_, i) => i !== index) })),
  }

  // "More to discover" (R18): published stories in this language, never the story itself.
  const sameLanguage = publishedArticles(articles, form.language)
  const ownSlug = stored?.slug
  const toStory = (slug: string): StoryOption => {
    const version
      = sameLanguage.find(a => a.slug === slug)
        ?? articles.find(a => a.slug === slug && a.language === form.language)
        ?? articles.find(a => a.slug === slug)

    return {
      slug,
      title: version?.title ?? slug,
      photo: version?.photo ?? '',
      readMinutes: version?.readMinutes ?? 0,
      hidden: !sameLanguage.some(a => a.slug === slug),
    }
  }
  const related = {
    items: form.related.map(toStory),
    candidates: sameLanguage
      .filter(a => a.slug !== ownSlug)
      .map(a => toStory(a.slug)),
    isFull: form.related.length >= MAX_RELATED_STORIES,
    add: (slug: string) =>
      setForm(f =>
        f.related.length >= MAX_RELATED_STORIES || f.related.includes(slug)
          ? f
          : { ...f, related: [...f.related, slug] },
      ),
    move: (index: number, by: -1 | 1) =>
      setForm(f => ({ ...f, related: move(f.related, index, by) })),
    remove: (index: number) =>
      setForm(f => ({
        ...f,
        related: f.related.filter((_, i) => i !== index),
      })),
  }

  const otherLanguage: Language = form.language === 'en' ? 'de' : 'en'
  const otherVersion = stored
    ? articles.find(
        a => a.slug === stored.slug && a.language === otherLanguage,
      )
    : undefined

  const now = () => demoNow(clockStartedAt).toISOString()

  /**
   * Validates for the mode, then stores the working copy with the given publication (or the
   * current one). Returns false when a field needs fixing. `onSaved` gets the article id once
   * screens can read it, while the editor is still open.
   */
  const save = (
    mode: SaveMode,
    publication?: ArticlePublication,
    onSaved?: (id: string) => void,
  ): boolean => {
    setAttempt(mode)
    if (Object.keys(validate(form, mode)).length)
      return false
    const content = fromForm(form)
    const saved = (id: string) => {
      setBaseline(form)
      setAttempt(null)
      onSaved?.(id)
    }
    const wasPublished = stored?.publication.status === 'published'
    const willPublish = (publication ?? stored?.publication)?.status === 'published'
    const languageName = t(`merchantContent.lang.${form.language}`)

    pendingSuccessRef.current = !wasPublished && willPublish
      ? t('merchantArticles.toast.published', { language: languageName })
      : wasPublished && !willPublish
        ? t('merchantArticles.toast.unpublished')
        : wasPublished
          ? t('merchantArticles.toast.savedPublished')
          : t('merchantArticles.toast.saved')

    if (stored) {
      updateArticle(
        { id: stored.id, content, publication },
        { onSuccess: () => saved(stored.id) },
      )

      return true
    }
    const slug = uniqueValue(
      slugify(content.title) || 'story',
      new Set(articles.map(a => a.slug)),
    )
    const id = uniqueValue(
      `${slug}-${content.language}`,
      new Set(articles.map(a => a.id)),
    )

    createArticle(
      {
        ...content,
        id,
        slug,
        publication: publication ?? { status: 'draft' },
      },
      { onSuccess: () => saved(id) },
    )

    return true
  }

  /** The other language version as a draft copy of the saved one, to translate (R02). */
  const addOtherVersion = (onAdded: (id: string) => void) => {
    if (!stored || otherVersion)
      return
    const id = uniqueValue(
      `${stored.slug}-${otherLanguage}`,
      new Set(articles.map(a => a.id)),
    )

    pendingSuccessRef.current = t(`merchantArticles.toast.versionAdded.${otherLanguage}`)
    createArticle(
      {
        ...structuredClone(stored),
        id,
        language: otherLanguage,
        author: {
          name: stored.author.name,
          role: translateRole(stored.author.role, otherLanguage),
        },
        publication: { status: 'draft' },
      },
      { onSuccess: () => onAdded(id) },
    )
  }

  return {
    stored,
    isNew: !stored,
    form,
    patch,
    setLanguage,
    sections,
    blocks,
    links,
    related,
    errors,
    errorCount: Object.keys(errors).length,
    attempt,
    dirty,
    otherLanguage,
    otherVersion,
    publishedAt:
      stored?.publication.status === 'published'
        ? stored.publication.publishedAt
        : null,
    /** A save is on its way: the save buttons are off. */
    isSaving: isCreating || isUpdating,
    save,
    publish: (onSaved?: (id: string) => void) =>
      save('publish', { status: 'published', publishedAt: now() }, onSaved),
    unpublish: (onSaved?: (id: string) => void) =>
      save('draft', { status: 'draft' }, onSaved),
    addOtherVersion,
  }
}

export type ArticleEditor = ReturnType<typeof useArticleEditor>
