import type { ReactNode } from 'react'

import { Tabs } from '@heroui/react'

import { TabRow } from '@/components/page-tabs'

/**
 * The detail screens' tab bar (gift C15, 1.13r; tour C16 since round 3): equal pills (the shared thin pill) that stick
 * under the 56px top bar, each panel padded as C15's.
 */
export function DetailTabs<Tab extends string>({
  label,
  tabs,
  selected,
  onChange,
}: {
  label: string
  tabs: readonly { id: Tab, label: string, panel: ReactNode }[]
  selected: Tab
  onChange: (tab: Tab) => void
}) {
  return (
    <Tabs
      className="mt-6 w-full"
      selectedKey={selected}
      onSelectionChange={key => onChange(key as Tab)}
    >
      <div className="sticky top-14 z-10 bg-background px-4">
        <TabRow
          equal
          label={label}
          tabs={tabs.map(tab => ({ id: tab.id, label: tab.label }))}
        />
      </div>
      {tabs.map(tab => (
        <Tabs.Panel key={tab.id} className="px-4 pt-5" id={tab.id}>
          {tab.panel}
        </Tabs.Panel>
      ))}
    </Tabs>
  )
}
