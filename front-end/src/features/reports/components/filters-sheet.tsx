import type { ReportsView } from "../hooks/use-reports";
import type { ReportFilters } from "../lib/money";

import { Button, Label, ListBox, Select } from "@heroui/react";
import { useState } from "react";

import { NO_FILTERS } from "../lib/money";

import { useLocale } from "@/contexts/locale-context";
import { SheetFrame } from "@/features/merchant/order-detail/components/decision-block";

type FilterKey = "source" | "type" | "group" | "item";

const FILTER_KEYS: FilterKey[] = ["source", "type", "group", "item"];

/** The four filters in the M08 sheet frame; applied when the sheet closes with "Show". */
export function FiltersSheet({
  view,
  filters,
  onApply,
  onClose,
}: {
  view: ReportsView;
  filters: ReportFilters;
  onApply: (filters: ReportFilters) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [draft, setDraft] = useState(filters);

  return (
    <SheetFrame
      isOpen
      footer={
        <>
          <Button fullWidth onPress={() => onApply(draft)}>
            {t("reports.filter.apply")}
          </Button>
          <Button
            fullWidth
            variant="tertiary"
            onPress={() => setDraft(NO_FILTERS)}
          >
            {t("reports.filter.clear")}
          </Button>
        </>
      }
      title={t("reports.filter.title")}
      onClose={onClose}
    >
      {FILTER_KEYS.map((key) => (
        <Select
          key={key}
          className="w-full"
          selectedKey={draft[key]}
          onSelectionChange={(k) =>
            k !== null && setDraft((d) => ({ ...d, [key]: String(k) }))
          }
        >
          <Label className="text-heading">{t(`reports.filter.${key}`)}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {view.filterOptions[key].map((o) => (
                <ListBox.Item key={o.id} id={o.id} textValue={o.label}>
                  {o.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      ))}
    </SheetFrame>
  );
}
