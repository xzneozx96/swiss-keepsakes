import type { CostRow } from "../hooks/use-cost-data";
import type { CostType, CostValue } from "../types";

import {
  Button,
  Checkbox,
  Description,
  Label,
  NumberField,
  toast,
} from "@heroui/react";
import { useState } from "react";

import { useCostActions } from "../hooks/use-cost-actions";
import { COST_TYPES } from "../types";

import { useLocale } from "@/contexts/locale-context";
import { SheetFrame } from "@/components/sheet-frame";

type Draft = Record<CostType, { amount: number; notApplicable: boolean }>;

const toDraft = (costs: CostRow["costs"]): Draft =>
  Object.fromEntries(
    COST_TYPES.map((type) => {
      const value = costs[type];

      return [
        type,
        value && "amount" in value
          ? { amount: value.amount / 100, notApplicable: false }
          : { amount: Number.NaN, notApplicable: !!value },
      ];
    }),
  ) as Draft;

/**
 * M24 cost entry for one transaction (spec §4.13, R14) in the M08 sheet frame. Each cost is
 * an actual amount or "does not apply" (saved as 0); a field left empty stays missing and
 * is never read as 0. No estimates or defaults. Mount only while open.
 */
export function CostSheet({
  row,
  onClose,
}: {
  row: CostRow;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const actions = useCostActions();
  const [draft, setDraft] = useState<Draft>(() => toDraft(row.costs));

  const set = (type: CostType, next: Partial<Draft[CostType]>) =>
    setDraft((d) => ({ ...d, [type]: { ...d[type], ...next } }));
  const missing = COST_TYPES.filter(
    (type) => !draft[type].notApplicable && Number.isNaN(draft[type].amount),
  );

  const save = () => {
    const costs: Partial<Record<CostType, CostValue>> = {};

    for (const type of COST_TYPES) {
      const { amount, notApplicable } = draft[type];

      if (notApplicable) costs[type] = { notApplicable: true };
      else if (!Number.isNaN(amount))
        costs[type] = { amount: Math.round(amount * 100) };
    }
    actions.save(row.transaction, costs);
    toast.success(
      missing.length
        ? t(
            missing.length === 1
              ? "costData.saved.missingOne"
              : "costData.saved.missingOther",
            { ref: row.ref, count: missing.length },
          )
        : t("costData.saved.complete", { ref: row.ref }),
    );
    onClose();
  };

  return (
    <SheetFrame
      isOpen
      footer={
        <>
          <Button fullWidth isDisabled={!actions.canEdit} onPress={save}>
            {t("costData.save")}
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>
            {t("merchantOrder.sheet.back")}
          </Button>
        </>
      }
      title={t("costData.sheet.title", { ref: row.ref })}
      onClose={onClose}
    >
      <div className="flex items-center justify-between gap-4 rounded-3xl bg-surface-secondary px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs text-muted">{row.meta}</span>
          <span className="text-title text-foreground tabular-nums">
            {row.value}
          </span>
        </div>
        <span className="max-w-40 text-end text-xs text-muted">
          {missing.length
            ? t(
                missing.length === 1
                  ? "costData.sheet.missingOne"
                  : "costData.sheet.missingOther",
                { count: missing.length },
              )
            : t("costData.sheet.complete")}
        </span>
      </div>

      {COST_TYPES.map((type) => {
        const { amount, notApplicable } = draft[type];
        const isMissing = !notApplicable && Number.isNaN(amount);

        return (
          <div key={type} className="flex flex-col gap-2">
            <NumberField
              fullWidth
              formatOptions={{ style: "currency", currency: "CHF" }}
              isDisabled={notApplicable}
              minValue={0}
              value={notApplicable ? 0 : amount}
              onChange={(v) => set(type, { amount: v })}
            >
              <Label className="text-heading">
                {t(`costData.type.${type}`)}
              </Label>
              <NumberField.Group>
                <NumberField.Input className="tabular-nums" />
              </NumberField.Group>
              <Description className={isMissing ? "text-warning" : ""}>
                {isMissing
                  ? t("costData.sheet.empty")
                  : t(`costData.help.${type}`)}
              </Description>
            </NumberField>
            <Checkbox
              isSelected={notApplicable}
              onChange={(selected) => set(type, { notApplicable: selected })}
            >
              <Checkbox.Content className="flex-row items-center gap-2">
                <Checkbox.Control className="size-6 rounded-lg">
                  <Checkbox.Indicator className="size-4" />
                </Checkbox.Control>
                <Label>{t("costData.notApplicable")}</Label>
              </Checkbox.Content>
            </Checkbox>
          </div>
        );
      })}
    </SheetFrame>
  );
}
