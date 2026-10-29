import { Drawer, Modal } from '@heroui/react'

import { useSheetExit } from '@/components/sheet-exit'
import { useLocale } from '@/contexts/locale-context'
import { useIsWide } from '@/hooks/use-is-wide'

/**
 * The merchant (/store) and Super Admin (/admin) screens. There a sheet opens as a centered dialog
 * from 1024 px; every other screen, the guest ones above all, keeps the bottom sheet.
 */
const operatorArea = /^\/(?:store|admin)(?:\/|$)/

function inOperatorArea() {
  // /store and /admin are `ssr: false`, so the server never decides; guard for any other render.
  if (typeof window === 'undefined')
    return false

  return operatorArea.test(window.location.pathname)
}

export function SheetFrame({
  title,
  isOpen,
  onClose,
  children,
  footer,
  container,
  tightBottom = false,
}: {
  title: string
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  footer: React.ReactNode
  /** Where the sheet renders; the page by default. The design lab passes its phone frame, and a sheet in a frame stays a bottom sheet. */
  container?: Element
  /** Less space under the footer, for a sheet whose content needs the room (lab, 28.10.2026). */
  tightBottom?: boolean
}) {
  const { t } = useLocale()
  const markerRef = useSheetExit()
  const wide = useIsWide()

  if (wide && !container && inOperatorArea()) {
    return (
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={open => !open && onClose()}
      >
        <Modal.Container placement="center">
          <Modal.Dialog className="max-h-[min(720px,calc(var(--visual-viewport-height,100dvh)-80px))] w-[560px] max-w-full">
            <span ref={markerRef} hidden />
            <Modal.Header className="flex flex-row items-center justify-between pe-10">
              <Modal.Heading className="text-title">{title}</Modal.Heading>
              <Modal.CloseTrigger aria-label={t('merchantOrder.sheet.close')} />
            </Modal.Header>
            <Modal.Body className="mt-4 flex flex-col gap-6 overflow-y-auto">
              {children}
            </Modal.Body>
            <Modal.Footer className="mt-6 flex flex-row-reverse justify-start gap-2 [&>*]:w-auto!">
              {footer}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    )
  }

  return (
    <Drawer.Backdrop
      isOpen={isOpen}
      UNSTABLE_portalContainer={container}
      onOpenChange={open => !open && onClose()}
    >
      <Drawer.Content className="mx-auto max-w-[560px]" placement="bottom">
        <Drawer.Dialog className={`flex sheet-max flex-col ${tightBottom ? 'pb-0' : ''}`}>
          <span ref={markerRef} hidden />
          <Drawer.Handle />
          <Drawer.Header className="flex items-center justify-between">
            <Drawer.Heading className="text-title">{title}</Drawer.Heading>
            <Drawer.CloseTrigger aria-label={t('merchantOrder.sheet.close')} />
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-6 overflow-y-auto">
            {children}
          </Drawer.Body>
          <Drawer.Footer className={`flex flex-col gap-2 pt-3 ${tightBottom ? 'mt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]' : 'pb-[calc(env(safe-area-inset-bottom,0px)+16px)]'}`}>
            {footer}
          </Drawer.Footer>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}
