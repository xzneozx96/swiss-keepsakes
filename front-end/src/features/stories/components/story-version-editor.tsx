import type { StoryGroupDetail } from '@sk/api-contract'
import type { CheckTarget } from '../lib/publish-checks'
import type { StoryLanguage } from '../lib/search-params'

import { formatDate } from '@sk/domain/shared'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { ErrorNotice } from '@/components/error-notice'
import { useLocale } from '@/contexts/locale-context'
import { useLeaveGuard } from '@/features/keepsakes/components/use-leave-guard'
import { useIsWide } from '@/hooks/use-is-wide'
import { useDeleteStory } from '../hooks/use-delete-story'
import { useStartVersion } from '../hooks/use-start-version'
import { useStoryGroupEditor } from '../hooks/use-story-group-editor'
import { useStoryVersionEditor } from '../hooks/use-story-version-editor'
import { blockingGaps } from '../lib/gaps'
import { storyProblemKey } from '../lib/problems'
import { saveStatusOf, worseState } from '../lib/save-status'
import { STORIES_PATH } from '../lib/search-params'
import { versionStateOf } from '../lib/version-state'
import { CoverTitleCard } from './cover-title-card'
import { StoryBodyCard } from './story-body-card'
import { StoryHeader } from './story-header'
import { StoryLanguageSwitch } from './story-language-switch'
import { StoryReviewScreen } from './story-review-screen'
import { StoryStaleNotice } from './story-stale-notice'

/**
 * The editor of one language version of a story: the header, the Write cards, the stale and failed notices and the leave
 * guard. It is keyed by language and reload, not by screen, so what is typed and a pressed Review (`showErrors`) survive
 * the trip to Review and back. Later tickets add cards after the cover card and replace the Review placeholder.
 */
export function StoryVersionEditor({ storeId, group, language, accountName, screen, onScreen, onLanguage, onReload }: {
  storeId: string
  group: StoryGroupDetail
  language: StoryLanguage
  accountName: string
  screen: 'write' | 'review'
  onScreen: (screen: 'write' | 'review') => void
  onLanguage: (language: StoryLanguage) => void
  onReload: () => void
}) {
  const { t, intlLocale } = useLocale()
  const navigate = useNavigate()
  const isWide = useIsWide()
  const editor = useStoryVersionEditor({ storeId, group, language, accountName })
  // The shared facts of the group have their own row version and their own autosave.
  const groupEditor = useStoryGroupEditor({ storeId, group })
  const starter = useStartVersion({ storeId, group, accountName })
  const [showErrors, setShowErrors] = useState(false)
  // The field a check sent the merchant to: scrolled to once Write has rendered.
  const scrollToRef = useRef<string>(undefined)

  useEffect(() => {
    if (screen === 'write' && scrollToRef.current) {
      document.getElementById(scrollToRef.current)?.scrollIntoView?.({ block: 'center' })
      scrollToRef.current = undefined
    }
  }, [screen])
  // Back with edits that are not saved asks first, and "Leave without saving" drops them: the engine is emptied, so
  // nothing is sent when the screen goes. Judgment call 1 of the plan: this is the one place that decides it.
  const guard = useLeaveGuard({
    isUnsaved: editor.isUnsaved || groupEditor.isUnsaved,
    copy: 'leave',
    blockNavigation: true,
    onSave: async () => {
      editor.discard()
      groupEditor.discard()

      return true
    },
    onLeave: () => void navigate({ to: STORIES_PATH }),
  })
  // The story is gone: what is typed is dropped (nothing is saved to a deleted story), the guard is not asked, the list opens.
  const remove = useDeleteStory(storeId, () => {
    editor.discard()
    groupEditor.discard()
    guard.bypass()

    return navigate({ to: STORIES_PATH })
  })
  const other = language === 'en' ? 'de' : 'en'
  const publishedOn = (dated: boolean) => dated
    ? Object.fromEntries((['en', 'de'] as const).flatMap((code) => {
        const at = group.versions[code]?.publishedAt

        return at ? [[code, formatDate(new Date(at), intlLocale)]] : []
      }))
    : undefined
  const switcher = (compact: boolean, dated = false) => (
    <StoryLanguageSwitch
      compact={compact}
      publishedOn={publishedOn(dated)}
      selected={language}
      versions={{
        [language]: { state: editor.versionState },
        [other]: { state: versionStateOf(group.versions[other], false) },
      } as Record<StoryLanguage, { state: ReturnType<typeof versionStateOf> }>}
      onChange={next => void choose(next)}
    />
  )

  /** Saves what is typed first (a failure keeps the merchant here), starts a version that does not exist, then switches. */
  async function choose(next: StoryLanguage) {
    if (next === language)
      return
    // Both are saved before either is judged, so one failure does not leave the other pending.
    const saved = await Promise.all([editor.flush(), groupEditor.flush()])

    if (saved.includes(false))
      return
    if (group.versions[next] === null && !(await starter.start(next)))
      return
    onLanguage(next)
  }

  /** Edit on a check: Write, with the field errors on and the field in view. */
  function edit(target: CheckTarget) {
    setShowErrors(true)
    scrollToRef.current = `write-${target}`
    onScreen('write')
  }

  /** Review saves what is typed, so the checks and the preview are of what is on screen; a blocking check turns the field errors on. */
  async function review() {
    const saved = await Promise.all([editor.flush(), groupEditor.flush()])

    if (saved.includes(false))
      return
    if (blockingGaps(groupEditor.group, group.versions[language]!, editor.fields).length > 0)
      setShowErrors(true)
    onScreen('review')
    window.scrollTo?.({ top: 0 })
  }

  const notices = (
    <>
      {(editor.state === 'stale' || groupEditor.state === 'stale') && (
        <div className="max-lg:px-4">
          <StoryStaleNotice onReload={onReload} />
        </div>
      )}
      {editor.state === 'failed' && <ErrorNotice compact message={t(storyProblemKey(editor.problem ?? 'unknown'))} onRetry={editor.retry} />}
      {groupEditor.state === 'failed' && <ErrorNotice compact message={t(storyProblemKey(groupEditor.problem ?? 'unknown'))} onRetry={groupEditor.retry} />}
    </>
  )

  return (
    <>
      <StoryHeader
        language={language}
        save={saveStatusOf(t, intlLocale, worseState(editor.state, groupEditor.state), editor.savedAt)}
        screen={screen}
        switchNode={switcher(true)}
        versionState={editor.versionState}
        onBack={screen === 'review' ? () => onScreen('write') : guard.leave}
        onDelete={() => void remove.ask({ groupId: group.id, name: editor.fields.title.trim() || t('merchantStories.untitled'), published: [group.versions.en, group.versions.de].some(version => version?.status === 'published') })}
        onReview={() => void review()}
      />
      {screen === 'review'
        ? (
            <>
              {[editor.state, groupEditor.state].some(state => state === 'stale' || state === 'failed') && <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 pt-4 max-lg:-mx-4">{notices}</div>}
              <StoryReviewScreen editor={editor} groupEditor={groupEditor} language={language} storeId={storeId} switchNode={switcher(false, true)} onEdit={edit} version={group.versions[language]!} />
            </>
          )
        : (
            <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 py-4 max-lg:-mx-4 max-lg:w-auto lg:max-w-[1200px] lg:py-8">
              {notices}
              {!isWide && <div className="max-lg:px-4">{switcher(false)}</div>}
              <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6" data-testid="write-columns">
                <div className="lg:col-span-5">
                  <CoverTitleCard fields={editor.fields} language={language} showErrors={showErrors} storeId={storeId} onChange={editor.change} />
                </div>
                <div className="lg:col-span-7">
                  <StoryBodyCard body={editor.fields.body} language={language} storeId={storeId} registerHandover={editor.registerHandover} onChange={editor.change} onDirty={editor.markDirty} />
                </div>
              </div>
            </div>
          )}
      {guard.dialog}
      {remove.dialog}
    </>
  )
}
