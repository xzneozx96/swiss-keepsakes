import type { ProductAction } from "./product-rows";
import type { ProductRow } from "../hooks/use-merchant-products";
import type { ProductTab } from "@/features/merchant/products/lib/search-params";

import { Skeleton, buttonVariants, toast } from "@heroui/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import {
  useMerchantProducts,
  useProductArchive,
} from "../hooks/use-merchant-products";

import { PickupPoints } from "./pickup-points";
import { ProductRows } from "./product-rows";

import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { MerchantPageHeader } from "@/components/layout/merchant-page-header";
import { RouteTabs } from "@/components/route-tabs";
import {
  FilterButton,
  FilterChips,
  filterGroup,
} from "@/components/filter-bar";
import {
  GiftIcon,
  OptionIcon,
  PickupIcon,
  PlusIcon,
  TourIcon,
} from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { useDemo } from "@/features/demo";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";
import { pickText } from "@/lib/localized";

type ProductView = "active" | "archived";

/** Pickup points: two columns of cards, each with icon tile, name, hours and instructions. */
function PickupSkeleton() {
  return (
    <ul aria-hidden className="grid gap-5 lg:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <li
          key={i}
          className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface"
        >
          <div className="flex items-center gap-4 p-4">
            <Skeleton className="size-14 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-3/5 rounded-lg" />
              <Skeleton className="h-3 w-4/5 rounded-lg" />
            </div>
          </div>
          <div className="px-4 pb-4">
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="flex flex-col gap-2 border-t border-dashed border-separator px-4 py-3.5">
            <Skeleton className="h-4 w-1/3 rounded-lg" />
            <Skeleton className="h-4 w-full rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * M11 Products (spec §5.2, D3): M03's page shape. Tabs with counts (gifts, tours and,
 * until Settings arrives in Phase 6, M14 pickup points), each its own page: /store/products,
 * /tours, /pickup. Each is a list of M03 tickets on phones and a Table from 1024px. Each gift and tour shows its publish chip and its EN/DE
 * completeness (R02).
 */
export function MerchantProducts({ tab }: { tab: ProductTab }) {
  const { t, language } = useLocale();
  const all = useMerchantProducts();
  const { places } = all;
  const { subcategories } = useDemo().state.data;
  const archive = useProductArchive();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();
  // Archived gifts and tours sit under their own filter, as archived partners on M15.
  // Both ticked shows both; none ticked is no filter, the same as both.
  const [view, setView] = useState<ProductView[]>(["active"]);
  const inView = (r: ProductRow) =>
    !view.length || view.includes(r.archived ? "archived" : "active");
  // Keepsakes only: the store's sub-categories, ticked like the status.
  const [subs, setSubs] = useState<string[]>([]);
  const gifts = all.gifts
    .filter(inView)
    .filter(
      (r) =>
        !subs.length || (!!r.subcategoryId && subs.includes(r.subcategoryId)),
    );
  const tours = all.tours.filter(inView);
  const isLoading = useSimulatedLoading();
  const tabs = [
    {
      id: "gifts",
      to: "/store/products",
      label: t("products.tab.gifts"),
      badge: all.gifts.filter((r) => !r.archived).length,
    },
    {
      id: "tours",
      to: "/store/products/tours",
      label: t("products.tab.tours"),
      badge: all.tours.filter((r) => !r.archived).length,
    },
    {
      id: "pickup",
      to: "/store/products/pickup",
      label: t("products.tab.pickup"),
      badge: places.length,
    },
  ] as const;
  const selectedLabel = tabs.find((item) => item.id === tab)?.label ?? "";
  const rootRef = useRef<HTMLDivElement>(null);

  // As M03: a link to a page whose tab starts off-screen in the scrolling
  // list on phones. React Aria mounts the tabs after the first commit, so wait a frame.
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      rootRef.current
        ?.querySelector(`[role="tab"][data-key="${tab}"]`)
        ?.scrollIntoView({ block: "nearest", inline: "nearest" }),
    );

    return () => cancelAnimationFrame(frame);
  }, [tab]);

  const onAction = async (
    kind: "gift" | "tour",
    row: ProductRow,
    action: ProductAction,
  ) => {
    if (action === "edit") {
      void navigate({
        to:
          kind === "gift"
            ? "/store/products/gifts/$productId"
            : "/store/products/tours/$tourId",
        params: { productId: row.id, tourId: row.id },
      });

      return;
    }
    if (action === "restore") {
      archive.restore(kind, row.id);
      toast.success(t("products.restored", { name: row.name }));

      return;
    }
    const ok = await confirm({
      title: t("products.archive.title", { name: row.name }),
      body: t(
        kind === "gift"
          ? "products.archive.body.gift"
          : "products.archive.body.tour",
      ),
      confirmLabel: t("products.action.archive"),
    });

    if (!ok) return;
    archive.archive(kind, row.id);
    toast.success(t("products.archivedToast", { name: row.name }));
  };

  const filterGroups = (id: "gifts" | "tours") => {
    const source = id === "gifts" ? all.gifts : all.tours;

    const groups = [
      filterGroup({
        id: "view",
        label: t("products.view.label"),
        options: (["active", "archived"] as const).map((v) => ({
          id: v,
          label: t(`products.view.${v}`),
          count: source.filter((r) => r.archived === (v === "archived")).length,
        })),
        selected: view,
        onChange: setView,
      }),
    ];

    if (id === "gifts") {
      groups.push(
        filterGroup({
          id: "subcategory",
          label: t("products.subcategory.label"),
          options: subcategories
            .filter((c) => c.categoryId === "keepsakes")
            .map((c) => ({
              id: c.id,
              label: pickText(c.name, language).text,
              count: source.filter((r) => r.subcategoryId === c.id).length,
            })),
          selected: subs,
          onChange: setSubs,
        }),
      );
    }

    return groups;
  };

  const groups = tab === "gifts" || tab === "tours" ? filterGroups(tab) : null;

  const panel = (id: ProductTab) => {
    if (isLoading && id === "pickup") return <PickupSkeleton />;
    if (id === "pickup") {
      return places.length ? (
        <PickupPoints label={selectedLabel} rows={places} />
      ) : (
        <EmptyState icon={PickupIcon} message={t("products.empty.pickup")} />
      );
    }
    const rows = id === "gifts" ? gifts : tours;

    return (
      <ProductRows
        columns={[
          t(id === "gifts" ? "products.column.gift" : "products.column.tour"),
          t("products.column.status"),
          t("products.column.price"),
          t(
            id === "gifts"
              ? "products.column.available"
              : "products.column.departures",
          ),
          t("products.column.commission"),
        ]}
        empty={{
          icon: id === "gifts" ? GiftIcon : TourIcon,
          message: t(
            view.length === 1 && view[0] === "archived"
              ? "products.empty.archived"
              : `products.empty.${id}`,
          ),
        }}
        isLoading={isLoading}
        label={selectedLabel}
        resetKey={`${id}|${selectedLabel}|${view.join()}`}
        rows={rows}
        onAction={(row, action) =>
          void onAction(id === "gifts" ? "gift" : "tour", row, action)
        }
      />
    );
  };

  return (
    <div ref={rootRef} className="flex flex-col gap-4">
      <MerchantPageHeader
        // The screen's one red action, as M15's "Add partner"; none for pickup points.
        action={
          tab !== "pickup" && (
            <Link
              className={buttonVariants({ size: "sm", className: "shrink-0" })}
              to={
                tab === "gifts"
                  ? "/store/products/gifts/new"
                  : "/store/products/tours/new"
              }
            >
              <PlusIcon aria-hidden size={16} />
              {t(tab === "gifts" ? "products.addGift" : "products.addTour")}
            </Link>
          )
        }
        description={t("products.intro")}
        title={t("products.title")}
      />
      <Link
        className={buttonVariants({
          size: "sm",
          variant: "tertiary",
          className: "w-fit",
        })}
        to="/store/products/categories"
      >
        <OptionIcon aria-hidden size={16} />
        {t("categories.manage")}
      </Link>
      <RouteTabs
        label={t("products.tabsLabel")}
        selected={tab}
        tabs={tabs}
        trailing={groups && <FilterButton groups={groups} />}
      />
      {groups && <FilterChips groups={groups} />}
      {panel(tab)}
      {dialog}
    </div>
  );
}
