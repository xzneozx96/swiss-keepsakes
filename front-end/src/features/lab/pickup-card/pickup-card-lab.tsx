import { Link } from '@tanstack/react-router'

import { PlusIcon } from '@/components/icons'
import { ListAction, ListHeader, ListSearch, ListToolbar } from '@/components/layout/list-toolbar'
import { useLocale } from '@/contexts/locale-context'
import { PickupTable } from './options'
import { samples } from './samples'

// Archived points last, as they read in a list that shows them.
const rows = [...samples.filter(place => !place.archived), ...samples.filter(place => place.archived)]

/** Lab: the pickup points as the shared merchant table, under the list screen's own header and toolbar. */
export function PickupCardLab() {
  const { t } = useLocale()

  return (
    <div className="flex flex-1 flex-col gap-8 bg-background px-4 py-8 xl:px-10">
      <div className="flex max-w-2xl flex-col gap-2">
        <Link className="w-fit text-label text-muted underline underline-offset-4" to="/lab">Lab</Link>
        <p className="text-sm text-pretty text-muted">
          The owner asked for a table. This is the shared DataTable, the look of Keepsakes and Places: the table from
          1024 px, cards below it. The name opens the edit sheet; the ⋯ menu holds Edit, Archive or Restore, and Delete.
          Buttons do nothing here.
        </p>
      </div>
      <div className="flex w-full max-w-6xl flex-col gap-4">
        <ListHeader
          action={<ListAction icon={PlusIcon} onPress={() => {}}>{t('pickup.action.add')}</ListAction>}
          description={t('pickup.description')}
          title={t('pickup.title')}
        />
        <ListToolbar search={<ListSearch label={t('pickup.search')} />} />
        <PickupTable label={t('pickup.title')} places={rows} />
      </div>
    </div>
  )
}
