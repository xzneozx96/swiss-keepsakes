import { AlertDialog, Button } from '@heroui/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'

export interface ConfirmOptions {
  /** A question naming the thing: "Remove Pocket knife · M?". */
  title: string
  /** One sentence saying what happens, with the money consequence if there is one. */
  body: string
  /** Names the action, never "OK" or "Yes": "Remove from cart", "Cancel order". */
  confirmLabel: string
  /** Defaults to "Cancel" (`confirm.cancel`). */
  cancelLabel?: string
  /** `danger` (default): soft brick icon and the ink destructive button. */
  tone?: 'danger'
  /**
   * The write the button starts. While it runs the button shows a spinner and the dialog cannot be
   * closed; when it resolves the dialog closes and `confirm` resolves true; when it rejects the dialog
   * stays open and says why (`problem`). Without `run` the button closes the dialog at once.
   */
  run?: () => Promise<unknown>
  /** The words for a refusal of `run`, from the feature's own problem map (`api-feedback.md`). */
  problem?: (error: unknown) => string
}

export interface ConfirmDialogProps extends ConfirmOptions {
  isOpen: boolean
  /** May return a promise: the dialog then waits for it (spinner, not closable) and shows `problem` when it rejects. */
  onConfirm: () => void | Promise<unknown>
  /** Cancel button, Esc or a backdrop tap. */
  onCancel: () => void
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
 *
 * A confirm that writes to the server returns the write's promise (owner decision, 1.11.2026): the
 * destructive button spins and the dialog stays until the server answers, so the row never lingers
 * after the dialog closed. The caller closes it when the promise resolves; a rejection shows
 * `problem(error)` in the dialog and re-enables both buttons.
 */
export function ConfirmDialog({
  isOpen,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = 'danger',
  problem,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useLocale()
  const [isPending, setIsPending] = useState(false)
  const [refusal, setRefusal] = useState<string>()

  const cancel = () => {
    if (!isPending)
      onCancel()
  }
  const confirm = () => {
    const result = onConfirm()

    if (!(result instanceof Promise))
      return
    setRefusal(undefined)
    setIsPending(true)
    result.then(
      () => setIsPending(false),
      (error: unknown) => {
        setIsPending(false)
        setRefusal(problem?.(error) ?? t('confirm.failed'))
      },
    )
  }

  return (
    <AlertDialog.Backdrop
      isDismissable={!isPending}
      isKeyboardDismissDisabled={isPending}
      isOpen={isOpen}
      onOpenChange={open => !open && cancel()}
    >
      <AlertDialog.Container size="sm">
        <AlertDialog.Dialog>
          <AlertDialog.Header>
            <AlertDialog.Icon status={tone} />
            <AlertDialog.Heading>{title}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <p>{body}</p>
            {refusal && <p className="mt-3 rounded-2xl bg-danger-soft p-3 text-sm text-danger-soft-foreground" role="alert">{refusal}</p>}
          </AlertDialog.Body>
          <AlertDialog.Footer className="flex-col-reverse sm:flex-row">
            <Button
              // WAI-ARIA alertdialog: focus starts on the least destructive action.
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              className="w-full sm:w-auto"
              isDisabled={isPending}
              variant="tertiary"
              onPress={cancel}
            >
              {cancelLabel ?? t('confirm.cancel')}
            </Button>
            <Button
              className="w-full sm:w-auto"
              isPending={isPending}
              variant={tone}
              onPress={confirm}
            >
              {confirmLabel}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  )
}

/**
 * Asks before a destructive action. Render `dialog` once anywhere in the component, then
 * `await confirm(options)`: true after the confirm button, false after Cancel, Esc, a
 * backdrop tap or unmount. With `options.run` (a write), true comes after the write succeeded and
 * the dialog waits for it, see {@link ConfirmOptions}.
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
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [opened, setOpened] = useState(0)
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null)

  const settle = useCallback((confirmed: boolean) => {
    resolveRef.current?.(confirmed)
    resolveRef.current = null
    setIsOpen(false)
  }, [])

  const confirm = useCallback(
    (next: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolveRef.current?.(false)
        resolveRef.current = resolve
        setOptions(next)
        // A new key: a refusal of the last dialog or its pending state does not carry over.
        setOpened(count => count + 1)
        setIsOpen(true)
      }),
    [],
  )

  useEffect(() => () => resolveRef.current?.(false), [])

  // The options stay after closing so the text does not vanish during the exit animation.
  const dialog = options
    ? (
        <ConfirmDialog
          key={opened}
          {...options}
          isOpen={isOpen}
          onCancel={() => settle(false)}
          onConfirm={() => options.run ? options.run().then(() => settle(true)) : settle(true)}
        />
      )
    : null

  return { confirm, dialog }
}
