import { AlertDialog, Button } from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useLocale } from "@/contexts/locale-context";

export interface ConfirmOptions {
  /** A question naming the thing: "Remove Pocket knife · M?". */
  title: string;
  /** One sentence saying what happens, with the money consequence if there is one. */
  body: string;
  /** Names the action, never "OK" or "Yes": "Remove from cart", "Cancel order". */
  confirmLabel: string;
  /** Defaults to "Cancel" (`confirm.cancel`). */
  cancelLabel?: string;
  /** `danger` (default): soft brick icon and the ink destructive button. */
  tone?: "danger";
}

export interface ConfirmDialogProps extends ConfirmOptions {
  isOpen: boolean;
  onConfirm: () => void;
  /** Cancel button, Esc or a backdrop tap. */
  onCancel: () => void;
}

/**
 * Shared confirmation before every delete, remove or cancel action (owner rule,
 * 13.10.2026). Design-system AlertDialog card: bottom-anchored card on phones, centred
 * from `sm`; focus starts on Cancel; Esc and a backdrop tap cancel. On phones the
 * buttons stack full width with the destructive one on top (German labels do not fit
 * side by side at 375px, and labels never wrap).
 *
 * Controlled; most callers want {@link useConfirm} instead:
 *
 * ```tsx
 * <ConfirmDialog
 *   isOpen={open}
 *   title={t("orders.cancel.title")}
 *   body={t("orders.cancel.body", { amount })}
 *   confirmLabel={t("orders.cancel.confirm")}
 *   onCancel={() => setOpen(false)}
 *   onConfirm={() => { cancelOrder(); setOpen(false); }}
 * />
 * ```
 */
export function ConfirmDialog({
  isOpen,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useLocale();

  return (
    <AlertDialog.Backdrop
      isDismissable
      isKeyboardDismissDisabled={false}
      isOpen={isOpen}
      onOpenChange={(open) => !open && onCancel()}
    >
      <AlertDialog.Container size="sm">
        <AlertDialog.Dialog>
          <AlertDialog.Header>
            <AlertDialog.Icon status={tone} />
            <AlertDialog.Heading>{title}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <p>{body}</p>
          </AlertDialog.Body>
          <AlertDialog.Footer className="flex-col-reverse sm:flex-row">
            <Button
              // WAI-ARIA alertdialog: focus starts on the least destructive action.
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              className="w-full sm:w-auto"
              variant="tertiary"
              onPress={onCancel}
            >
              {cancelLabel ?? t("confirm.cancel")}
            </Button>
            <Button
              className="w-full sm:w-auto"
              variant={tone}
              onPress={onConfirm}
            >
              {confirmLabel}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}

/**
 * Asks before a destructive action. Render `dialog` once anywhere in the component, then
 * `await confirm(options)`: true after the confirm button, false after Cancel, Esc, a
 * backdrop tap or unmount.
 *
 * ```tsx
 * const { confirm, dialog } = useConfirm();
 *
 * const onRemove = async () => {
 *   if (await confirm({ title, body, confirmLabel })) remove(id);
 * };
 *
 * return <>{list}{dialog}</>;
 * ```
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setIsOpen(false);
  }, []);

  const confirm = useCallback(
    (next: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolveRef.current?.(false);
        resolveRef.current = resolve;
        setOptions(next);
        setIsOpen(true);
      }),
    [],
  );

  useEffect(() => () => resolveRef.current?.(false), []);

  // The options stay after closing so the text does not vanish during the exit animation.
  const dialog = options ? (
    <ConfirmDialog
      {...options}
      isOpen={isOpen}
      onCancel={() => settle(false)}
      onConfirm={() => settle(true)}
    />
  ) : null;

  return { confirm, dialog };
}
