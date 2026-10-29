import type { Product, PublishCheck } from '@sk/api-contract'
import type { KeepsakeView } from '../lib/search-params'

import { Button } from '@heroui/react'
import { useNavigate } from '@tanstack/react-router'
import { lazy, Suspense, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { GiftIcon, PhotoAddIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { CommissionCard } from '@/features/merchant/products/components/gift-editor'
import { useIsWide } from '@/hooks/use-is-wide'
import { useKeepsake } from '../api/queries'
import { useKeepsakeEditor } from '../hooks/use-keepsake-editor'
import { usePhotoLibrary } from '../hooks/use-photo-library'
import { nameIn } from '../lib/keepsake-rules'
import { KEEPSAKES_PATH } from '../lib/search-params'
import { BasicsFields } from './basics-fields'
import { EditorSkeleton } from './editor-skeleton'
import { KeepsakeCard } from './keepsake-card'
import { KeepsakeGate } from './keepsake-gate'
import { KeepsakeNotice } from './keepsake-notice'
import { KeepsakeTopBar } from './keepsake-top-bar'
import { OptionsCard } from './options-card'
import { PhotosField } from './photos-field'
import { useLeaveGuard } from './use-leave-guard'
import { VariantsCard } from './variants-card'

// The mockup and the preview load when Review opens, not with the edit screen.
const ReviewScreen = lazy(() => import('./review-screen'))

const CARD_OF_CHECK = { basics: 'basics', photos: 'photos', options: 'options', variants: 'variants', commission: 'commission' } as const

function Editor({ storeId, keepsake, view, onView, onReload }: {
  storeId: string
  keepsake: Product
  view: KeepsakeView
  onView: (view: KeepsakeView) => void
  onReload: () => void
}) {
  const { t, language } = useLocale()
  const wide = useIsWide()
  const navigate = useNavigate()
  const editor = useKeepsakeEditor({ storeId, keepsake })
  const library = usePhotoLibrary(keepsake.photos)
  const [showErrors, setShowErrors] = useState(false)
  const guard = useLeaveGuard({ isUnsaved: editor.isUnsaved, onLeave: () => void navigate({ to: KEEPSAKES_PATH }) })
  const { draft } = editor
  const photos = library.photosOf(draft.photoIds)
  const name = nameIn(draft.name, language) || t('keepsakes.untitled')

  /** Back to the edit screen and on to the card a check names: after the next paint, so the card exists. */
  const jumpTo = (check: PublishCheck) => {
    onView('edit')
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const card = document.getElementById(CARD_OF_CHECK[check.card])

      card?.scrollIntoView({ block: 'start' })
      card?.querySelector<HTMLElement>('input, textarea, button')?.focus({ preventScroll: true })
    }))
  }

  const review = async () => {
    if (await editor.flush())
      onView('review')
  }

  return (
    <div className="flex flex-col" data-testid="keepsake-editor">
      <KeepsakeTopBar
        backLabel={view === 'review' ? t('keepsakes.back.toEditing') : t('keepsakes.back.toKeepsakes')}
        keepsake={keepsake}
        name={name}
        savedAt={editor.savedAt}
        state={editor.state}
        onBack={view === 'review' ? () => onView('edit') : guard.leave}
      >
        {view === 'edit' && (
          <Button className="shrink-0 max-lg:min-h-11" size="sm" onPress={() => void review()}>
            {wide ? t('keepsakes.review.open') : t('keepsakes.review.openShort')}
          </Button>
        )}
      </KeepsakeTopBar>
      {editor.state === 'stale' && (
        <div className="mt-3 flex flex-col items-start gap-2 rounded-2xl bg-warning-soft p-4 text-sm text-warning-soft-foreground" role="alert">
          <p>{t('keepsakes.problem.stale')}</p>
          <Button className="min-h-11" variant="secondary" onPress={onReload}>{t('keepsakes.reload')}</Button>
        </div>
      )}
      {editor.state === 'failed' && (
        <div className="mt-3">
          <KeepsakeNotice type={editor.problem} onRetry={editor.retry} />
        </div>
      )}
      {view === 'review'
        ? (
            <Suspense fallback={<EditorSkeleton />}>
              <ReviewScreen
                actions={{
                  publish: editor.publish,
                  unpublish: editor.unpublish,
                  isPending: editor.isPublishing,
                  onBlocked: () => {
                    setShowErrors(true)
                    onView('edit')
                  },
                }}
                keepsake={keepsake}
                onFix={(check) => {
                  setShowErrors(true)
                  jumpTo(check)
                }}
              />
            </Suspense>
          )
        : (
            <div className="mx-auto flex w-full max-w-[880px] flex-col gap-3 pt-3 pb-4 lg:gap-6 lg:pt-8">
              <KeepsakeCard icon={GiftIcon} id="basics" title={t('keepsakes.basics.title')}>
                <BasicsFields showErrors={showErrors} value={draft} onChange={next => editor.change({ name: next.name, text: next.text })} />
              </KeepsakeCard>
              <KeepsakeCard icon={PhotoAddIcon} id="photos" title={t('keepsakes.photos.title')}>
                <PhotosField
                  photos={photos}
                  showError={showErrors && photos.length === 0}
                  storeId={storeId}
                  onChange={ids => editor.change({ photoIds: ids })}
                  onUploaded={library.add}
                />
              </KeepsakeCard>
              <OptionsCard keepsake={keepsake} onSave={editor.saveOptions} />
              <VariantsCard keepsake={keepsake} onCreate={editor.createVariant} onSave={editor.saveVariant} />
              <div className="scroll-mt-20" id="commission">
                <CommissionCard value={draft.commission} onChange={commission => editor.change({ commission })} />
              </div>
            </div>
          )}
      {guard.dialog}
    </div>
  )
}

function LoadedEditor({ storeId, id, view, onView }: { storeId: string, id: string, view: KeepsakeView, onView: (view: KeepsakeView) => void }) {
  const { t } = useLocale()
  const query = useKeepsake(storeId, id)
  // A reload starts the typed fields over from the server's copy: a new generation is a new editor.
  const [generation, setGeneration] = useState(0)

  if (query.isError) {
    if (query.error instanceof ApiProblem && (query.error.type === 'not-found' || query.error.status === 404))
      return <EmptyState action={{ label: t('keepsakes.back.toKeepsakes'), to: KEEPSAKES_PATH }} icon={GiftIcon} message={t('keepsakes.notFound')} />

    return <KeepsakeNotice error={query.error} onRetry={() => void query.refetch()} />
  }
  if (!query.data)
    return <EditorSkeleton />

  return (
    <Editor
      key={`${id}:${generation}`}
      keepsake={query.data}
      storeId={storeId}
      view={view}
      onReload={() => void query.refetch().then(() => setGeneration(g => g + 1))}
      onView={onView}
    />
  )
}

/** M12 for one keepsake: the edit screen of cards with autosave, and Review and publish (`view`). */
export function KeepsakeEditorScreen({ id, view, onView }: { id: string, view: KeepsakeView, onView: (view: KeepsakeView) => void }) {
  return (
    <KeepsakeGate fallback={<EditorSkeleton />}>
      {storeId => <LoadedEditor id={id} storeId={storeId} view={view} onView={onView} />}
    </KeepsakeGate>
  )
}
