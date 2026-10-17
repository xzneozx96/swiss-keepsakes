import type { DisclosureRootProps } from "@heroui/react";

import { Disclosure } from "@heroui/react";

interface CollapsibleProps extends Omit<
  DisclosureRootProps,
  "isExpanded" | "defaultExpanded" | "onExpandedChange"
> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Collapsible({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: CollapsibleProps) {
  return (
    <Disclosure.Root
      data-slot="collapsible"
      defaultExpanded={defaultOpen}
      isExpanded={open}
      onExpandedChange={onOpenChange}
      {...props}
    />
  );
}

export function CollapsibleTrigger(
  props: React.ComponentProps<typeof Disclosure.Trigger>,
) {
  return <Disclosure.Trigger data-slot="collapsible-trigger" {...props} />;
}

export function CollapsibleContent(
  props: React.ComponentProps<typeof Disclosure.Content>,
) {
  return <Disclosure.Content data-slot="collapsible-content" {...props} />;
}
