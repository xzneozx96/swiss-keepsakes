import type { IconComponent } from "@/components/icons";

import { Button, Dropdown, Label } from "@heroui/react";

import { MoreIcon } from "@/components/icons";

export interface RowAction<Id extends string = string> {
  id: Id;
  label: string;
  icon: IconComponent;
  /** Opens a page instead of calling `onAction`. */
  href?: string;
  isDisabled?: boolean;
  /** Turns the icon upside down, e.g. one chevron for both "up" and "down". */
  flip?: boolean;
}

/**
 * The ⋯ menu of a table row or list card: the actions that change or leave the row sit in a
 * menu, so a tap on the row itself never archives or deletes anything.
 */
export function RowActions<Id extends string>({
  label,
  actions,
  onAction,
}: {
  /** Accessible name of the button and the menu, e.g. "Actions for Hotel am See". */
  label: string;
  actions: RowAction<Id>[];
  onAction?: (id: Id) => void;
}) {
  return (
    <Dropdown>
      <Button isIconOnly aria-label={label} size="sm" variant="tertiary">
        <MoreIcon size={18} />
      </Button>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          aria-label={label}
          disabledKeys={actions.filter((a) => a.isDisabled).map((a) => a.id)}
          onAction={(key) => onAction?.(key as Id)}
        >
          {actions.map((action) => (
            <Dropdown.Item
              key={action.id}
              href={action.href}
              id={action.id}
              textValue={action.label}
            >
              <action.icon
                aria-hidden
                className={action.flip ? "rotate-180" : ""}
                size={16}
              />
              <Label>{action.label}</Label>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
