import type { PartnerAction, PartnerRowProps } from "./partner-rows";
import type { PartnerFilter } from "../hooks/use-merchant-partners";

import {
  Button,
  SearchField,
  Skeleton,
  Tabs,
  Tag,
  TagGroup,
  toast,
} from "@heroui/react";
import { useState } from "react";

import { usePartnerAnalytics } from "../hooks/use-partner-analytics";
import { useMerchantPartners } from "../hooks/use-merchant-partners";

import { AddPartnerSheet } from "./add-partner-sheet";
import { PartnerAnalytics } from "./partner-analytics";
import { PartnerQrSheet } from "./partner-qr-sheet";
import { PartnerRows } from "./partner-rows";

import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { PartnersIcon, PlusIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { usePartnerActions } from "@/features/partners/hooks/use-partner-actions";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";

export type PartnersView = "partners" | "analytics";

function RowsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-44 rounded-3xl lg:h-16" />
      ))}
    </div>
  );
}

function AnalyticsTab() {
  return <PartnerAnalytics {...usePartnerAnalytics()} />;
}

/**
 * M15 Partners (spec §5.2, revised for partner management): the M03 page shape with two
 * tabs (D18). Partners: search, filter chips with counts, the partner cards, "Add partner",
 * and per partner a QR sheet and archive or delete (D17). Analytics: the partner KPIs.
 */
export function MerchantPartners({
  view,
  filter,
  onViewChange,
  onFilterChange,
}: {
  view: PartnersView;
  filter: PartnerFilter;
  onViewChange: (view: PartnersView) => void;
  onFilterChange: (filter: PartnerFilter) => void;
}) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const { rows, filters, existingCodes, total } = useMerchantPartners(
    filter,
    query,
  );
  const actions = usePartnerActions();
  const { confirm, dialog } = useConfirm();
  const isLoading = useSimulatedLoading();
  const [qrFor, setQrFor] = useState<{ name: string; code: string } | null>(
    null,
  );
  const [isAdding, setAdding] = useState(false);
  const title = t("merchantPartners.title");
  const selectedLabel = filters.find((f) => f.id === filter)?.label ?? "";

  const onAction = async (row: PartnerRowProps, action: PartnerAction) => {
    if (action === "qr") {
      setQrFor({ name: row.name, code: row.code });

      return;
    }
    if (action === "restore") {
      actions.restore(row.id);
      toast.success(t("merchantPartners.restored", { name: row.name }));

      return;
    }
    const isDelete = action === "delete";
    const ok = await confirm({
      title: t(
        isDelete
          ? "merchantPartners.delete.title"
          : "merchantPartners.archive.title",
        { name: row.name },
      ),
      body: t(
        isDelete
          ? "merchantPartners.delete.body"
          : "merchantPartners.archive.body",
        { toPay: row.toPay },
      ),
      confirmLabel: t(
        isDelete
          ? "merchantPartners.action.delete"
          : "merchantPartners.action.archive",
      ),
    });

    if (!ok) return;
    if (isDelete) actions.remove(row.id);
    else actions.archive(row.id);
    toast.success(
      t(
        isDelete
          ? "merchantPartners.deleted"
          : "merchantPartners.archivedToast",
        {
          name: row.name,
        },
      ),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-title">{title}</h1>
          <Button
            className="shrink-0"
            size="sm"
            onPress={() => setAdding(true)}
          >
            <PlusIcon aria-hidden size={16} />
            {t("merchantPartners.add.button")}
          </Button>
        </div>
        <p className="text-sm text-muted">{t("merchantPartners.intro")}</p>
      </div>

      {/* The underline tabs of M21 (C15), not the pills of the period tabs. */}
      <Tabs
        className="w-full"
        selectedKey={view}
        variant="secondary"
        onSelectionChange={(key) => onViewChange(key as PartnersView)}
      >
        <Tabs.ListContainer>
          <Tabs.List
            aria-label={t("merchantPartners.viewsLabel")}
            className="w-full"
          >
            <Tabs.Tab
              className="h-11 min-w-0 flex-1 px-1.5 whitespace-nowrap"
              id="partners"
            >
              {t("merchantPartners.view.partners")}
              <span className="ms-1.5 min-w-5 rounded-full bg-default px-1.5 text-xs leading-5 tabular-nums">
                {filters.find((f) => f.id === "all")?.count ?? 0}
              </span>
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab
              className="h-11 min-w-0 flex-1 px-1.5 whitespace-nowrap"
              id="analytics"
            >
              {t("merchantPartners.view.analytics")}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel
          className="flex flex-col gap-4 px-0 pt-5 pb-0"
          id="partners"
        >
          <SearchField
            aria-label={t("merchantPartners.search")}
            className="w-full lg:max-w-sm"
            value={query}
            onChange={setQuery}
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                className="w-full"
                placeholder={t("merchantPartners.search")}
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <TagGroup
            aria-label={t("merchantPartners.filtersLabel")}
            selectedKeys={new Set([filter])}
            selectionMode="single"
            onSelectionChange={(keys) => {
              const [next] = [...keys];

              if (next) onFilterChange(next as PartnerFilter);
            }}
          >
            <TagGroup.List className="flex-wrap gap-1.5">
              {filters.map((f) => (
                <Tag key={f.id} id={f.id}>
                  {f.label}
                  <span className="ms-1 tabular-nums opacity-70">
                    {f.count}
                  </span>
                </Tag>
              ))}
            </TagGroup.List>
          </TagGroup>
          {isLoading ? (
            <RowsSkeleton />
          ) : rows.length ? (
            <PartnerRows
              label={selectedLabel}
              rows={rows}
              onAction={(row, action) => void onAction(row, action)}
            />
          ) : (
            <EmptyState
              icon={PartnersIcon}
              message={
                total === 0
                  ? t("merchantPartners.empty")
                  : query.trim()
                    ? t("merchantPartners.noMatch", { query: query.trim() })
                    : t("merchantPartners.emptyFilter", {
                        filter: selectedLabel,
                      })
              }
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel className="px-0 pt-5 pb-0" id="analytics">
          {view === "analytics" && <AnalyticsTab />}
        </Tabs.Panel>
      </Tabs>

      {qrFor && (
        <PartnerQrSheet
          code={qrFor.code}
          name={qrFor.name}
          onClose={() => setQrFor(null)}
        />
      )}
      {isAdding && (
        <AddPartnerSheet
          existingCodes={existingCodes}
          onAdd={(partner) => {
            actions.add(partner);
            setAdding(false);
            onFilterChange("all");
            toast.success(t("merchantPartners.added", { name: partner.name }));
            setQrFor({ name: partner.name, code: partner.code });
          }}
          onClose={() => setAdding(false)}
        />
      )}
      {dialog}
    </div>
  );
}
