import type { SECTION_PAGES } from "@/components/layout/section-pages";
import type { ReactNode } from "react";

import { Tabs } from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";

import { SECTION_PAGES as PAGES } from "@/components/layout/section-pages";
import { STICKY_TABS } from "@/components/layout/sticky-tabs";
import { useLocale } from "@/contexts/locale-context";

type Section = keyof typeof SECTION_PAGES;

/**
 * A section page with sub-pages (owner review 15.10.2026): on phones the section's pages as
 * underline tabs (from 1024px the sidebar lists them), then the page. A page without its own
 * visible title (the analytics pages) gets a hidden one.
 */
export function SectionFrame({
  section,
  page,
  title,
  hasOwnTitle = false,
  children,
}: {
  section: Section;
  page: string;
  /** The section's name, for the tabs' label and the hidden title. */
  title: string;
  hasOwnTitle?: boolean;
  children: ReactNode;
}) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const pages: readonly { id: string; to: string; label: string }[] =
    PAGES[section];
  const label = (p: (typeof pages)[number]) =>
    t(p.label as Parameters<typeof t>[0]);
  const current = pages.find((p) => p.id === page) ?? pages[0];

  return (
    <div className="flex flex-col gap-6">
      {!hasOwnTitle && (
        <h1 className="sr-only">
          {title}: {label(current)}
        </h1>
      )}
      <Tabs
        className="w-full"
        selectedKey={page}
        variant="secondary"
        onSelectionChange={(key) =>
          void navigate({
            to: (pages.find((p) => p.id === key) ?? pages[0]).to as never,
          })
        }
      >
        <Tabs.ListContainer className={`lg:hidden ${STICKY_TABS}`}>
          <Tabs.List
            aria-label={t("sectionPages.label", { section: title })}
            className="w-full"
          >
            {pages.map((p) => (
              <Tabs.Tab
                key={p.id}
                className={`h-11 min-w-0 whitespace-nowrap ${pages.length > 3 ? "flex-auto px-1.5 text-[13px]" : "flex-1 px-1"}`}
                id={p.id}
              >
                {label(p)}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel className="px-0 pt-2 pb-0 lg:pt-0" id={page}>
          {children}
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
