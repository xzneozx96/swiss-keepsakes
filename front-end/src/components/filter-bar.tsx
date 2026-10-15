import {
  Button,
  Checkbox,
  CheckboxGroup,
  Dropdown,
  Header,
  Label,
} from "@heroui/react";
import { useState } from "react";

import { CloseIcon, FilterIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { SheetFrame } from "@/features/merchant/order-detail/components/decision-block";
import { useIsWide } from "@/features/merchant/order-detail/hooks/use-is-wide";

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

/** One question the list can be narrowed by, with the options ticked now. */
export interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

/** A group whose option ids are a union type, so callers keep their types. */
export function filterGroup<Id extends string>(group: {
  id: string;
  label: string;
  options: (FilterOption & { id: Id })[];
  selected: Id[];
  onChange: (selected: Id[]) => void;
}): FilterGroup {
  return group as unknown as FilterGroup;
}

/** The ticked options' labels, or the "all" wording when nothing is ticked. */
export function selectedLabels(
  options: FilterOption[],
  selected: string[],
  allLabel: string,
) {
  return selected.length
    ? options
        .filter((o) => selected.includes(o.id))
        .map((o) => o.label)
        .join(", ")
    : allLabel;
}

const key = (group: FilterGroup, option: FilterOption) =>
  `${group.id}:${option.id}`;

const choiceCard =
  "rounded-2xl border border-separator p-3 data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground";

/** Phones: the same choices in a bottom sheet, ticked live; "Show" closes it. */
function FilterSheet({
  groups,
  onClose,
}: {
  groups: FilterGroup[];
  onClose: () => void;
}) {
  const { t } = useLocale();
  const active = groups.reduce((sum, g) => sum + g.selected.length, 0);

  return (
    <SheetFrame
      isOpen
      footer={
        <>
          <Button fullWidth onPress={onClose}>
            {t("reports.filter.apply")}
          </Button>
          <Button
            fullWidth
            isDisabled={!active}
            variant="tertiary"
            onPress={() => groups.forEach((g) => g.onChange([]))}
          >
            {t("reports.filter.clear")}
          </Button>
        </>
      }
      title={t("filter.title")}
      onClose={onClose}
    >
      {groups.map((g) => (
        <CheckboxGroup
          key={g.id}
          className="gap-2"
          value={g.selected}
          onChange={(ids) => g.onChange(ids)}
        >
          <Label className="text-heading">{g.label}</Label>
          {g.options.map((o) => (
            <Checkbox key={o.id} className={choiceCard} value={o.id}>
              <Checkbox.Content className="w-full flex-row items-center gap-3">
                <Checkbox.Control className="size-6 shrink-0 rounded-lg">
                  <Checkbox.Indicator className="size-4 [&_[data-slot$=checkmark]]:size-4" />
                </Checkbox.Control>
                <span className="flex-1 font-medium">{o.label}</span>
                {o.count !== undefined && (
                  <span className="text-sm text-muted tabular-nums">
                    {o.count}
                  </span>
                )}
              </Checkbox.Content>
            </Checkbox>
          ))}
        </CheckboxGroup>
      ))}
    </SheetFrame>
  );
}

/**
 * The one filter button of a list page: round, icon only, with the number of active choices.
 * It opens a menu (a bottom sheet on phones) with every group, any number ticked; nothing
 * ticked means no filter. Sits
 * at the end of the tabs row, or beside the search field. The active choices are shown by
 * `FilterChips`.
 */
export function FilterButton({ groups }: { groups: FilterGroup[] }) {
  const { t } = useLocale();
  const isWide = useIsWide();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const active = groups.reduce((sum, g) => sum + g.selected.length, 0);
  const label = active
    ? t("reports.filter.buttonCount", { count: active })
    : t("reports.filter.button");

  const trigger = (
    <div className="relative shrink-0">
      <Button
        isIconOnly
        aria-label={label}
        className="rounded-full"
        variant={active ? "secondary" : "tertiary"}
        onPress={isWide ? undefined : () => setSheetOpen(true)}
      >
        <FilterIcon aria-hidden size={18} />
      </Button>
      {active > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] leading-5 font-semibold text-accent-foreground tabular-nums"
        >
          {active}
        </span>
      )}
    </div>
  );

  if (!isWide) {
    return (
      <>
        {trigger}
        {isSheetOpen && (
          <FilterSheet groups={groups} onClose={() => setSheetOpen(false)} />
        )}
      </>
    );
  }

  return (
    <Dropdown>
      {trigger}
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          aria-label={t("reports.filter.button")}
          selectedKeys={
            new Set(
              groups.flatMap((g) =>
                g.options
                  .filter((o) => g.selected.includes(o.id))
                  .map((o) => key(g, o)),
              ),
            )
          }
          selectionMode="multiple"
          onSelectionChange={(keys) => {
            const ticked = keys === "all" ? null : keys;

            for (const g of groups) {
              const next = g.options
                .filter((o) => (ticked ? ticked.has(key(g, o)) : true))
                .map((o) => o.id);

              if (next.join() !== g.selected.join()) g.onChange(next);
            }
          }}
        >
          {groups.map((g) => (
            <Dropdown.Section key={g.id}>
              <Header>{g.label}</Header>
              {g.options.map((o) => (
                <Dropdown.Item
                  key={key(g, o)}
                  id={key(g, o)}
                  textValue={o.label}
                >
                  <Label className="flex-1">{o.label}</Label>
                  {o.count !== undefined && (
                    <span className="text-sm text-muted tabular-nums">
                      {o.count}
                    </span>
                  )}
                  <Dropdown.ItemIndicator />
                </Dropdown.Item>
              ))}
            </Dropdown.Section>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

/**
 * The filter row of a page without tabs or search: the active choices together in one line,
 * the button at the end of it.
 */
export function FilterToolbar({ groups }: { groups: FilterGroup[] }) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <FilterChips groups={groups} />
      </div>
      <FilterButton groups={groups} />
    </div>
  );
}

/**
 * Every active choice of every group, together in one line under the tabs or search, each
 * clearing with a tap. Nothing is drawn while nothing is ticked.
 */
export function FilterChips({ groups }: { groups: FilterGroup[] }) {
  const { t } = useLocale();
  const chips = groups.flatMap((g) =>
    g.options
      .filter((o) => g.selected.includes(o.id))
      .map((o) => ({ group: g, option: o })),
  );

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map(({ group, option }) => (
        <Button
          key={key(group, option)}
          size="sm"
          variant="secondary"
          onPress={() =>
            group.onChange(group.selected.filter((id) => id !== option.id))
          }
        >
          {option.label}
          <CloseIcon
            aria-label={t("reports.filter.remove", { filter: option.label })}
            size={14}
          />
        </Button>
      ))}
    </div>
  );
}
