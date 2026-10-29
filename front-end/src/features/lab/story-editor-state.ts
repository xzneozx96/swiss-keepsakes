import type { Language, Story, StoryBody, StoryVersion } from './story-editor-data'
import type { LabState } from './story-editor-search-params'

import { useEffect, useRef, useState } from 'react'

import { LAB_TODAY, museggStory, newStory, pins, reviewStory } from './story-editor-data'
import { publishChecks } from './story-editor-rules'

export type SaveState = 'saved' | 'unsaved' | 'saving'

/** A draft saves itself this long after the last edit (owner: autosave everywhere). */
export const AUTOSAVE_MS = 1500
export const SAVE_MS = 700

/** Which story and version a lab state opens on. */
export function initialStory(state: LabState): Story {
  if (state === 'new')
    return newStory()
  if (state === 'reviewtype')
    return reviewStory()
  if (state === 'blocked') {
    // The review's check date is missing: one check stops publishing, the rest only warn.
    const story = reviewStory()

    return { ...story, review: { ...story.review, checkedOn: '' } }
  }

  return museggStory()
}

/**
 * One story in memory, for one lab frame. Edits mark the open version unsaved, and the draft
 * saves itself 1.5 s after the last edit. Publishing a version makes it
 * live; editing a published version keeps the guests' copy until it is published again (ADR-014).
 */
export function useStoryEditor(state: LabState) {
  const [story, setStory] = useState(() => initialStory(state))
  const [language, setLanguage] = useState<Language>(state === 'de' ? 'de' : 'en')
  const [save, setSave] = useState<SaveState>(state === 'unsaved' ? 'unsaved' : 'saved')
  const [savedAt, setSavedAt] = useState<string | null>(state === 'new' ? null : '10:42')
  /** Published versions edited since they went live: guests still see the old copy. */
  const [pending, setPending] = useState<Record<Language, boolean>>({ en: false, de: false })
  const timerRef = useRef<number | undefined>(undefined)

  const commitSave = () => {
    window.clearTimeout(timerRef.current)
    setSave('saving')
    timerRef.current = window.setTimeout(() => {
      setSave('saved')
      setSavedAt(new Date().toLocaleTimeString('en-CH', { hour: '2-digit', minute: '2-digit' }))
    }, SAVE_MS)
  }

  const touch = () => {
    setSave('unsaved')
    if (story.versions[language].status === 'published')
      setPending(p => ({ ...p, [language]: true }))
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(commitSave, AUTOSAVE_MS)
  }

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const patchStory = (patch: Partial<Story>) => {
    setStory(s => ({ ...s, ...patch }))
    touch()
  }
  const patchVersion = (patch: Partial<StoryVersion>, lang: Language = language) => {
    setStory(s => ({ ...s, versions: { ...s.versions, [lang]: { ...s.versions[lang], ...patch } } }))
    touch()
  }
  const setBody = (body: StoryBody, lang: Language) => {
    setStory(s => ({ ...s, versions: { ...s.versions, [lang]: { ...s.versions[lang], body } } }))
  }

  /** Starts the other language as an empty draft with the same cover. */
  const startVersion = (lang: Language) => {
    const from = story.versions[lang === 'en' ? 'de' : 'en']

    patchVersion({ status: 'draft', coverId: from.coverId }, lang)
    setLanguage(lang)
  }

  const publish = () => {
    window.clearTimeout(timerRef.current)
    setStory(s => ({ ...s, versions: { ...s.versions, [language]: { ...s.versions[language], status: 'published', publishedOn: s.versions[language].publishedOn ?? LAB_TODAY } } }))
    setPending(p => ({ ...p, [language]: false }))
    setSave('saved')
    setSavedAt(new Date().toLocaleTimeString('en-CH', { hour: '2-digit', minute: '2-digit' }))
  }
  const unpublish = () => {
    setStory(s => ({ ...s, versions: { ...s.versions, [language]: { ...s.versions[language], status: 'draft' } } }))
    setPending(p => ({ ...p, [language]: false }))
  }

  const version = story.versions[language]

  return {
    story,
    language,
    setLanguage,
    version,
    save,
    savedAt,
    pending,
    checks: publishChecks(story, language, pins),
    isNew: story.id === 'new',
    patchStory,
    patchVersion,
    setBody,
    markDirty: touch,
    startVersion,
    publish,
    unpublish,
  }
}

export type StoryEditorModel = ReturnType<typeof useStoryEditor>
