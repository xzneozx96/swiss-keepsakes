import type { PartnerAction, PartnerRowProps } from "./partner-rows";
import type { PartnerFilter } from "../hooks/use-merchant-partners";

import { Button, SearchField, toast } from "@heroui/react";
import { useState } from "react";

import { useMerchantPartners } from "../hooks/use-merchant-partners";

import { AddPartnerSheet } from "./add-partner-sheet";
import { PartnerQrSheet } from "./partner-qr-sheet";
import { PartnerRows } from "./partner-rows";

import { useConfirm } from "@/components/confirm-dialog";
import { MerchantPageHeader } from "@/components/layout/merchant-page-header";
import {
  FilterButton,
  FilterChips,
  filterGroup,
  selectedLabels,
} from "@/components/filter-bar";
import { PartnersIcon, PlusIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { usePartnerActions } from "@/features/partners/hooks/use-partner-actions";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";

/**
 * M15 Partners › All partners (spec §5.2; Analytics is its own page since 15.10.2026): the M03
 * page shape. Search, filter chips with counts, the partner cards, "Add partner", and per
 * partner a QR sheet and archive or delete (D17).
 */
export function MerchantPartners({
  filter,
  onFilterChange,
}: {
  filter: PartnerFilter[];
  onFilterChange: (filter: PartnerFilter[]) => void;
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
  const selectedLabel = selectedLabels(
    filters,
    filter,
    t("merchantPartners.filter.all"),
  );

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

  const emptyState = {
    icon: PartnersIcon,
    message:
      total === 0
        ? t("merchantPartners.empty")
        : query.trim()
          ? t("merchantPartners.noMatch", { query: query.trim() })
          : t("merchantPartners.emptyFilter", { filter: selectedLabel }),
  };

  const filterGroups = [
    filterGroup({
      id: "partners",
      label: t("merchantPartners.filtersLabel"),
      options: filters,
      selected: filter,
      onChange: onFilterChange,
    }),
  ];

  const list = (
    <>
      <div className="flex items-center gap-2">
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
        <FilterButton groups={filterGroups} />
      </div>
      <FilterChips groups={filterGroups} />
      <PartnerRows
        empty={emptyState}
        isLoading={isLoading}
        label={selectedLabel}
        resetKey={`${selectedLabel}|${query}`}
        rows={rows}
        onAction={(row, action) => void onAction(row, action)}
      />
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      <MerchantPageHeader
        action={
          <Button
            className="shrink-0"
            size="sm"
            onPress={() => setAdding(true)}
          >
            <PlusIcon aria-hidden size={16} />
            {t("merchantPartners.add.button")}
          </Button>
        }
        description={t("merchantPartners.intro")}
        title={title}
      />

      {list}

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
            onFilterChange([]);
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
