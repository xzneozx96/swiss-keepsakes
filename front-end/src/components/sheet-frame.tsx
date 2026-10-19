import { Drawer } from "@heroui/react";

import { useSheetExit } from "@/components/sheet-exit";
import { useLocale } from "@/contexts/locale-context";

export function SheetFrame({
  title,
  isOpen,
  onClose,
  children,
  footer,
}: {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const { t } = useLocale();
  const markerRef = useSheetExit();

  return (
    <Drawer.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
    >
      <Drawer.Content className="mx-auto max-w-[560px]" placement="bottom">
        <Drawer.Dialog className="flex sheet-max flex-col">
          <span ref={markerRef} hidden />
          <Drawer.Handle />
          <Drawer.Header className="flex items-center justify-between">
            <Drawer.Heading className="text-title">{title}</Drawer.Heading>
            <Drawer.CloseTrigger aria-label={t("merchantOrder.sheet.close")} />
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-6 overflow-y-auto">
            {children}
          </Drawer.Body>
          <Drawer.Footer className="flex flex-col gap-2 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
            {footer}
          </Drawer.Footer>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
