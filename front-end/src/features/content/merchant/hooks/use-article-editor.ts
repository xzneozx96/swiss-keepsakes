import type { Article, ArticleLink, ArticlePublication } from '../../types'
import type {
  ArticleForm,
  BlockType,
  FormBlock,
  FormErrors,
  FormSection,
} from '../lib/article-form'
import type { Language } from '@/contexts/locale-context'

import { useState } from 'react'

import { isPublished } from '@/features/catalog/lib/publish'
import { isSoldOut } from '@/features/catalog/lib/stock'
import { useDemo } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'

import { pickText } from '@/lib/localized'

import { slugify } from '@/lib/slug'
import { publishedArticles } from '../../lib/articles'
import { MAX_ARTICLE_LINKS, MAX_RELATED_STORIES } from '../../types'
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
  const { state, update } = useDemo()
  const { articles } = state.data
  const stored = articles.find(a => a.id === articleId)
  const [form, setForm] = useState<ArticleForm>(() =>
    stored
      ? toForm(stored)
      : emptyForm(newLanguage, defaultAuthor(state.role, newLanguage)),
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
        f.author.role === defaultAuthor(state.role, f.language).role
          ? defaultAuthor(state.role, language)
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
      const tour = state.data.tours?.tours.find(x => x.id === link.id)

      return {
        link,
        name: tour ? pickText(tour.name, form.language).text : link.id,
        photo: tour?.photos[0],
        hidden: isLinkHidden(state.data, link),
        soldOut: false,
      }
    }
    const product = state.data.products.find(p => p.id === link.id)

    return {
      link,
      name: product ? pickText(product.name, form.language).text : link.id,
      photo: product?.photo,
      hidden: isLinkHidden(state.data, link),
      soldOut: product ? isSoldOut(product, state.data.orders) : false,
    }
  }
  const linkCandidates: LinkOption[] = [
    ...state.data.products
      .filter(isPublished)
      .map(p => toOption({ kind: 'gift', id: p.id })),
    ...(state.data.tours?.tours ?? [])
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

  const now = () => demoNow(state.clockStartedAt).toISOString()

  /**
   * Validates for the mode, then stores the working copy with the given publication (or the
   * current one). Returns the article id, or null when a field needs fixing.
   */
  const save = (
    mode: SaveMode,
    publication?: ArticlePublication,
  ): string | null => {
    setAttempt(mode)
    if (Object.keys(validate(form, mode)).length)
      return null
    const content = fromForm(form)
    const at = now()
    let id = stored?.id

    if (stored) {
      update(s => ({
        ...s,
        data: {
          ...s.data,
          articles: s.data.articles.map(a =>
            a.id === stored.id
              ? {
                  ...a,
                  ...content,
                  publication: publication ?? a.publication,
                  updatedAt: at,
                }
              : a,
          ),
        },
      }))
    }
    else {
      const slug = uniqueValue(
        slugify(content.title) || 'story',
        new Set(articles.map(a => a.slug)),
      )

      id = uniqueValue(
        `${slug}-${content.language}`,
        new Set(articles.map(a => a.id)),
      )
      const created: Article = {
        ...content,
        id,
        slug,
        publication: publication ?? { status: 'draft' },
        updatedAt: at,
      }

      update(s => ({
        ...s,
        data: { ...s.data, articles: [...s.data.articles, created] },
      }))
    }
    setBaseline(form)
    setAttempt(null)

    return id ?? null
  }

  /** The other language version as a draft copy of the saved one, to translate (R02). */
  const addOtherVersion = (): string | null => {
    if (!stored || otherVersion)
      return null
    const id = uniqueValue(
      `${stored.slug}-${otherLanguage}`,
      new Set(articles.map(a => a.id)),
    )
    const copy: Article = {
      ...structuredClone(stored),
      id,
      language: otherLanguage,
      author: {
        name: stored.author.name,
        role: translateRole(stored.author.role, otherLanguage),
      },
      publication: { status: 'draft' },
      updatedAt: now(),
    }

    update(s => ({
      ...s,
      data: { ...s.data, articles: [...s.data.articles, copy] },
    }))

    return id
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
    save,
    publish: () => save('publish', { status: 'published', publishedAt: now() }),
    unpublish: () => save('draft', { status: 'draft' }),
    addOtherVersion,
  }
}

export type ArticleEditor = ReturnType<typeof useArticleEditor>
