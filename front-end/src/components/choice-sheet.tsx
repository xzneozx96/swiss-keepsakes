import type { ButtonProps } from "@heroui/react";
import type { ReactNode } from "react";

import { Button, Drawer } from "@heroui/react";

/**
 * The bottom sheet where a guest makes a listing's choices and commits them with one full-width
 * button: C03 "Your gift" (Add to cart · CHF) and C10 departure and group (Review booking · CHF).
 */
export function ChoiceSheet({
  title,
  closeLabel,
  action,
  isOpen,
  onOpenChange,
  children,
}: {
  title: string;
  closeLabel: string;
  action: {
    label: string;
    isDisabled?: boolean;
    onPress: ButtonProps["onPress"];
  };
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Drawer.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
        <Drawer.Dialog className="flex max-h-[92dvh] flex-col">
          <Drawer.Handle />
          <Drawer.Header className="flex items-center justify-between">
            <Drawer.Heading className="font-serif text-title">
              {title}
            </Drawer.Heading>
            <Drawer.CloseTrigger aria-label={closeLabel} />
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-7 overflow-y-auto">
            {children}
          </Drawer.Body>
          <Drawer.Footer className="pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
            <Button
              fullWidth
              className="h-14 text-base"
              isDisabled={action.isDisabled}
              size="lg"
              onPress={action.onPress}
            >
              {action.label}
            </Button>
          </Drawer.Footer>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
