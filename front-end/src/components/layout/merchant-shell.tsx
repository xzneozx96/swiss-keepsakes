import type { IconComponent } from "@/components/icons";
import type { MessageKey } from "@/i18n/en";

import { Drawer } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import {
  BookingsIcon,
  ContentIcon,
  MoreIcon,
  OrdersIcon,
  PartnersIcon,
  ProductsIcon,
  ReportsIcon,
  RequestsIcon,
  SettingsIcon,
  TodayIcon,
} from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { shop } from "@/features/catalog/seed";
import { useDemo } from "@/features/demo";

export type MerchantSection =
  | "bookings"
  | "products"
  | "partners"
  | "content"
  | "requests"
  | "reports"
  | "settings";

type NavItem =
  | { kind: "today"; label: MessageKey; icon: IconComponent }
  | { kind: "orders"; label: MessageKey; icon: IconComponent }
  | {
      kind: "section";
      section: MerchantSection;
      label: MessageKey;
      icon: IconComponent;
    };

/** Dashboard sections in the order of UX spec §3.2. */
const allItems: NavItem[] = [
  { kind: "today", label: "nav.today", icon: TodayIcon },
  { kind: "orders", label: "nav.orders", icon: OrdersIcon },
  {
    kind: "section",
    section: "bookings",
    label: "nav.bookings",
    icon: BookingsIcon,
  },
  {
    kind: "section",
    section: "products",
    label: "nav.products",
    icon: ProductsIcon,
  },
  {
    kind: "section",
    section: "partners",
    label: "nav.partners",
    icon: PartnersIcon,
  },
  {
    kind: "section",
    section: "content",
    label: "nav.content",
    icon: ContentIcon,
  },
  {
    kind: "section",
    section: "requests",
    label: "nav.requests",
    icon: RequestsIcon,
  },
  {
    kind: "section",
    section: "reports",
    label: "nav.reports",
    icon: ReportsIcon,
  },
  {
    kind: "section",
    section: "settings",
    label: "nav.settings",
    icon: SettingsIcon,
  },
];

const phonePrimary = allItems.slice(0, 3);
const phoneMore = allItems.slice(3);

function NavLink({
  item,
  className,
  children,
  onClick,
}: {
  item: NavItem;
  className: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  if (item.kind === "today") {
    return (
      <Link
        activeOptions={{ exact: true }}
        className={className}
        to="/store"
        onClick={onClick}
      >
        {children}
      </Link>
    );
  }
  if (item.kind === "orders") {
    return (
      <Link className={className} to="/store/orders" onClick={onClick}>
        {children}
      </Link>
    );
  }
  // M15 has its own route since step 5.2; the $section placeholder would resolve to it anyway.
  if (item.section === "partners") {
    return (
      <Link className={className} to="/store/partners" onClick={onClick}>
        {children}
      </Link>
    );
  }
  // M21 since step 5.9; also active on M24 (/store/reports/costs).
  if (item.section === "reports") {
    return (
      <Link className={className} to="/store/reports" onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <Link
      className={className}
      params={{ section: item.section }}
      to="/store/$section"
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

const sideLink =
  "flex h-10 items-center gap-3 rounded-2xl px-3 text-sm text-muted outline-none hover:bg-default focus-visible:focus-ring data-[status=active]:bg-default data-[status=active]:font-semibold data-[status=active]:text-foreground";

const tabLink =
  "group relative flex h-16 w-full flex-col items-center justify-center gap-1 text-xs text-muted outline-none focus-visible:focus-ring data-[status=active]:font-semibold data-[status=active]:text-foreground";

/**
 * Merchant dashboard frame (UX spec §3.2). Phones: bottom navigation with Today,
 * Orders, Bookings and More (a sheet with the other sections). From 1024px: a sidebar.
 */
export function MerchantShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const { state } = useDemo();
  const staffName = state.role === "manager" ? "Lukas" : shop.ownerName;
  const staffRole =
    state.role === "manager" ? t("staff.manager") : t("staff.owner");
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex flex-1">
      {/* The aside stretches with the page; its contents stay pinned while the page scrolls. */}
      <aside className="hidden w-64 shrink-0 border-e border-separator bg-surface lg:block">
        <div className="sticky top-0 flex flex-col gap-6 p-4">
          <div className="flex flex-col gap-0.5 px-3 pt-2">
            <span className="text-heading">{shop.name}</span>
            <span className="text-label text-muted">
              {staffName} · {staffRole}
            </span>
          </div>
          <nav aria-label={t("nav.merchant.label")}>
            <ul className="flex flex-col gap-1">
              {allItems.map((item) => (
                <li key={item.label}>
                  <NavLink className={sideLink} item={item}>
                    <item.icon size={20} />
                    {t(item.label)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 flex-col justify-center border-b border-separator bg-background/95 px-4 backdrop-blur lg:hidden">
          <span className="truncate text-heading">{shop.name}</span>
          <span className="truncate text-label text-muted">
            {staffName} · {staffRole}
          </span>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-24 lg:px-8 lg:pt-8 lg:pb-8">
          {children}
        </main>

        <nav
          aria-label={t("nav.merchant.label")}
          className="fixed inset-x-0 bottom-0 z-20 border-t border-separator bg-surface pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
        >
          <ul className="grid grid-cols-4">
            {phonePrimary.map((item) => (
              <li key={item.label}>
                <NavLink className={tabLink} item={item}>
                  <span
                    aria-hidden
                    className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-transparent group-data-[status=active]:bg-accent"
                  />
                  <item.icon size={24} />
                  {t(item.label)}
                </NavLink>
              </li>
            ))}
            <li>
              <Drawer isOpen={moreOpen} onOpenChange={setMoreOpen}>
                <Drawer.Trigger className="flex h-16 w-full flex-col items-center justify-center gap-1 text-xs text-muted outline-none focus-visible:focus-ring">
                  <MoreIcon size={24} />
                  {t("nav.more")}
                </Drawer.Trigger>
                <Drawer.Backdrop>
                  <Drawer.Content placement="bottom">
                    <Drawer.Dialog>
                      <Drawer.Handle />
                      <Drawer.Header>
                        <Drawer.Heading>{t("nav.moreTitle")}</Drawer.Heading>
                      </Drawer.Header>
                      <Drawer.Body>
                        <ul className="flex flex-col gap-1 pb-4">
                          {phoneMore.map((item) => (
                            <li key={item.label}>
                              <NavLink
                                className="flex h-12 items-center gap-3 rounded-2xl px-3 text-base outline-none hover:bg-default focus-visible:focus-ring data-[status=active]:bg-default data-[status=active]:font-semibold"
                                item={item}
                                onClick={() => setMoreOpen(false)}
                              >
                                <item.icon size={20} />
                                {t(item.label)}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </Drawer.Body>
                    </Drawer.Dialog>
                  </Drawer.Content>
                </Drawer.Backdrop>
              </Drawer>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
