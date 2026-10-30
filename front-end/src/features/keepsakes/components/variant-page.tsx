import type { Product, ProductVariant } from '@sk/api-contract'

import { Button } from '@heroui/react'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { ArchiveIcon, BackIcon, EditIcon, GiftIcon, MoreIcon, PhotoAddIcon, StatusNeutralIcon, StatusSuccessIcon } from '@/components/icons'
import { RowActions } from '@/components/row-actions'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useKeepsake } from '../api/queries'
import { useVariantCommands } from '../hooks/use-variant-commands'
import { chf, nameIn } from '../lib/keepsake-rules'
import { labelOf, refusalText, variantTitle } from '../lib/option-rules'
import { problemMessageKey } from '../lib/problems'
import { KEEPSAKE_PATH } from '../lib/search-params'
import { EditorSkeleton } from './editor-skeleton'
import { KeepsakeCard } from './keepsake-card'
import { KeepsakeGate } from './keepsake-gate'
import { KeepsakeNotice } from './keepsake-notice'
import { KeepsakePhoto } from './keepsake-photo'
import { RefusalAlert, ValueBadge } from './option-parts'
import { StatusText } from './status-text'
import { VariantSheet } from './variant-sheet'

type Action = 'edit' | 'toggle' | 'archive'

function Fact({ name, children }: { name: string, children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-sm text-muted">{name}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  )
}

function Page({ storeId, keepsake, variant }: { storeId: string, keepsake: Product, variant: ProductVariant }) {
  const { t, language, intlLocale } = useLocale()
  const navigate = useNavigate()
  const { confirm, dialog } = useConfirm()
  const commands = useVariantCommands({ storeId, id: keepsake.id })
  const [editing, setEditing] = useState(false)
  const [refusal, setRefusal] = useState<string>()
  const { options } = keepsake
  const title = variantTitle(variant.values, options, language) || variant.skuCode
  const archived = variant.status === 'archived'
  const keepsakeName = nameIn(keepsake.name, language) || t('keepsakes.untitled')

  const change = async (status: 'published' | 'draft' | 'archived') => {
    setRefusal(undefined)
    const outcome = await commands.saveVariant(variant.id, { status })

    if (!outcome.ok)
      setRefusal(outcome.refusals && outcome.refusals.length > 0 ? outcome.refusals.map(r => refusalText(t, r)).join(' ') : t(problemMessageKey(outcome.type)))
  }

  const onAction = async (action: Action) => {
    if (action === 'edit')
      setEditing(true)
    else if (action === 'toggle')
      await change(variant.status === 'published' ? 'draft' : 'published')
    else if (await confirm({ title: t('keepsakes.variant.archive.title', { code: variant.skuCode }), body: t('keepsakes.variant.archive.body'), confirmLabel: t('keepsakes.variant.archive.confirm') }))
      await change('archived')
  }

  return (
    <div className="flex flex-col gap-3 pb-6 lg:gap-5" data-testid="variant-page">
      <header className="flex items-center gap-2">
        <Button isIconOnly aria-label={t('keepsakes.variant.backTo', { name: keepsakeName })} className="size-11 shrink-0" variant="ghost" onPress={() => void navigate({ to: KEEPSAKE_PATH, params: { productId: keepsake.id } })}>
          <BackIcon aria-hidden size={20} />
        </Button>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="truncate text-heading" title={title}>{title}</h1>
          <StatusText tone={variant.status === 'published' ? 'success' : 'neutral'}>
            {t(variant.status === 'published' ? 'keepsakes.variant.status.published' : variant.status === 'draft' ? 'keepsakes.variant.status.hidden' : 'keepsakes.variant.status.archived')}
          </StatusText>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-3 lg:gap-5">
        <KeepsakeCard
          icon={GiftIcon}
          id="variant-details"
          title={t('keepsakes.variantPage.details')}
          trailing={archived
            ? undefined
            : (
                <RowActions<Action>
                  actions={[
                    { id: 'edit', label: t('keepsakes.variant.edit'), icon: EditIcon },
                    variant.status === 'published'
                      ? { id: 'toggle', label: t('keepsakes.variant.hide'), icon: StatusNeutralIcon }
                      : { id: 'toggle', label: t('keepsakes.variant.putOnSale'), icon: StatusSuccessIcon },
                    { id: 'archive', label: t('keepsakes.variant.archive'), icon: ArchiveIcon, isDanger: true },
                  ]}
                  label={t('keepsakes.variant.actions', { code: variant.skuCode })}
                  onAction={action => void onAction(action)}
                />
              )}
        >
          {refusal && <RefusalAlert>{refusal}</RefusalAlert>}
          <dl className="flex flex-col gap-3">
            {options.map(option => (
              <Fact key={option.id} name={labelOf(option.name, language)}>
                <ValueBadge option={option} valueId={variant.values[option.id]} />
              </Fact>
            ))}
            <Fact name={t('keepsakes.variant.code')}>
              <span className="font-mono">{variant.skuCode}</span>
            </Fact>
            <Fact name={t('keepsakes.variant.price')}>
              <span className="tabular-nums">{chf(variant.priceRappen, intlLocale)}</span>
            </Fact>
          </dl>
        </KeepsakeCard>
        <KeepsakeCard icon={PhotoAddIcon} id="variant-media" title={t('keepsakes.variantPage.media')}>
          <div className="flex items-center gap-3">
            <KeepsakePhoto className="size-16 shrink-0 rounded-xl" media={keepsake.photos[0]} width={160} />
            <p className="text-sm text-pretty text-muted">{t('keepsakes.variantPage.noPhoto')}</p>
          </div>
        </KeepsakeCard>
      </div>
      {editing && <VariantSheet keepsake={keepsake} variant={variant} onClose={() => setEditing(false)} onSave={commands.saveVariant} />}
      {dialog}
    </div>
  )
}

function Loaded({ storeId, id, variantId }: { storeId: string, id: string, variantId: string }) {
  const { t } = useLocale()
  const query = useKeepsake(storeId, id)
  const variant = query.data?.variants.find(v => v.id === variantId)

  if (query.isError) {
    if (query.error instanceof ApiProblem && query.error.status === 404)
      return <EmptyState action={{ label: t('keepsakes.back.toKeepsakes'), to: '/store/products' }} icon={GiftIcon} message={t('keepsakes.notFound')} />

    return <KeepsakeNotice error={query.error} onRetry={() => void query.refetch()} />
  }
  if (!query.data)
    return <EditorSkeleton />
  if (!variant)
    return <EmptyState action={{ label: t('keepsakes.back.toKeepsakes'), to: '/store/products' }} icon={MoreIcon} message={t('keepsakes.variantPage.notFound')} />

  return <Page keepsake={query.data} storeId={storeId} variant={variant} />
}

/** The variant page: its option values, code, price and status, with Edit, Hide or Put on sale, and Archive. */
export function VariantScreen({ id, variantId }: { id: string, variantId: string }) {
  return (
    <KeepsakeGate fallback={<EditorSkeleton />}>
      {storeId => <Loaded id={id} storeId={storeId} variantId={variantId} />}
    </KeepsakeGate>
  )
}
