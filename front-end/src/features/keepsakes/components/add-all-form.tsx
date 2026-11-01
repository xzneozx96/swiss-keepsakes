import type { ProductOption, ProductVariant } from '@sk/api-contract'
import type { CreateVariant } from './variants-step'

import { Button } from '@heroui/react'

import { ChevronLeftIcon } from '@/components/icons'
import { FIELD_GROUP } from '@/components/inline-field'
import { useLocale } from '@/contexts/locale-context'
import { useAddAll } from '../hooks/use-add-all'
import { QuietNote } from './option-bits'
import { PriceRow } from './variant-detail'

/** Focus follows the press that opened the form: the ref callback is stable, so it runs once, when the form mounts. */
const focusOnMount = (element: HTMLElement | null) => element?.focus()

/**
 * "Add the N missing combinations": one price and Add. It sits in the detail pane like a variant does, so on a phone it
 * is its own screen with the same way back. What was not added is listed under the field; what was added is already in
 * the list.
 */
export function AddAllForm({ options, variants, onCreate, onDone, onClose }: {
  options: ProductOption[]
  variants: ProductVariant[]
  onCreate: CreateVariant
  onDone?: () => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const addAll = useAddAll({ options, variants, onCreate, onDone, onClose })
  const count = addAll.missing.length
  const { summary } = addAll

  return (
    <form
      aria-label={t('keepsakes.addAll.button')}
      className="flex w-full max-w-xl flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        void addAll.submit()
      }}
    >
      <div className="flex flex-col gap-3">
        <Button className="-ms-2 self-start max-lg:h-11 lg:hidden" variant="ghost" onPress={onClose}>
          <ChevronLeftIcon aria-hidden size={16} />
          {t('keepsakes.variants.back')}
        </Button>
        <div className="flex flex-col gap-1">
          <h4 ref={focusOnMount} className="font-serif text-title text-balance outline-none" tabIndex={-1}>{t(count === 1 ? 'keepsakes.addAll.title.one' : 'keepsakes.addAll.title.other', { count })}</h4>
          <p className="text-sm text-muted">{t('keepsakes.addAll.note')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className={FIELD_GROUP}>
          <PriceRow invalid={addAll.priceError !== undefined} price={addAll.price} onChange={addAll.changePrice} />
        </div>
        {addAll.priceError && <QuietNote>{addAll.priceError}</QuietNote>}
        {addAll.confirming && <p className="text-sm text-pretty" role="status">{t('keepsakes.addAll.confirm', { count })}</p>}
      </div>

      {summary && (
        <div className="flex flex-col gap-2" role="alert">
          {summary.added > 0 && <p className="text-sm">{t(summary.added === 1 ? 'keepsakes.addAll.added.one' : 'keepsakes.addAll.added.other', { count: summary.added })}</p>}
          <p className="text-sm font-medium text-danger">{t(summary.failed.length === 1 ? 'keepsakes.addAll.failed.one' : 'keepsakes.addAll.failed.other', { count: summary.failed.length })}</p>
          <ul className="flex flex-col gap-1 text-sm text-danger">
            {summary.failed.map(line => <li key={line.name}>{t('keepsakes.addAll.failedLine', line)}</li>)}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center">
        <Button className="max-sm:min-h-12 max-sm:w-full" isPending={addAll.isPending} type="submit">
          {addAll.confirming ? t('keepsakes.addAll.confirmSubmit', { count }) : t('keepsakes.addAll.submit')}
        </Button>
      </div>
    </form>
  )
}
