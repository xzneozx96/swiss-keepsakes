import type { ReactNode } from "react";

import { Tabs } from "@heroui/react";

/**
 * The detail screens' tab bar (gift C15, 1.13r; tour C16 since round 3): equal tabs that stick
 * under the 56px top bar, each panel padded as C15's.
 */
export function DetailTabs<Tab extends string>({
  label,
  tabs,
  selected,
  onChange,
}: {
  label: string;
  tabs: readonly { id: Tab; label: string; panel: ReactNode }[];
  selected: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <Tabs
      className="mt-6 w-full"
      selectedKey={selected}
      variant="secondary"
      onSelectionChange={(key) => onChange(key as Tab)}
    >
      <Tabs.ListContainer className="sticky top-14 z-10 bg-background px-4">
        <Tabs.List aria-label={label} className="w-full">
          {tabs.map((tab) => (
            <Tabs.Tab
              key={tab.id}
              className="h-11 min-w-0 flex-1 px-1.5 whitespace-nowrap"
              id={tab.id}
            >
              {tab.label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
      {tabs.map((tab) => (
        <Tabs.Panel key={tab.id} className="px-4 pt-5" id={tab.id}>
          {tab.panel}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
