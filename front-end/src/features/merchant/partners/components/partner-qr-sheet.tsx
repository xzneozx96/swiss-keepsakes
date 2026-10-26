import { Button, toast } from '@heroui/react'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import { useRef } from 'react'

import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'

/** The partner's public referral link, on this deployment's origin. */
export function referralUrl(code: string) {
  return `${window.location.origin}/r/${code}`
}

/**
 * A partner's QR code in the M08 sheet frame: scan target, the link under it, then
 * "Download PNG" (printable, 1024px) and "Copy link". Mount only while open.
 */
export function PartnerQrSheet({
  name,
  code,
  onClose,
}: {
  name: string
  code: string
  onClose: () => void
}) {
  const { t } = useLocale()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const url = referralUrl(code)

  const download = () => {
    const png = canvasRef.current?.toDataURL('image/png')

    if (!png)
      return
    const a = document.createElement('a')

    a.href = png
    a.download = `qr-${code.toLowerCase()}.png`
    a.click()
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('merchantPartners.qr.copied'))
    }
    catch {
      toast.danger(t('merchantPartners.qr.copyFailed'))
    }
  }

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth onPress={download}>
            {t('merchantPartners.qr.download')}
          </Button>
          <Button fullWidth variant="tertiary" onPress={() => void copy()}>
            {t('merchantPartners.qr.copy')}
          </Button>
        </>
      )}
      title={t('merchantPartners.qr.title', { name })}
      onClose={onClose}
    >
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-5 text-center">
        <QRCodeSVG
          aria-label={t('merchantPartners.qr.label', { name })}
          className="h-auto w-full max-w-56"
          level="M"
          marginSize={2}
          role="img"
          size={224}
          value={url}
        />
        <p className="max-w-full text-xs break-all text-muted">{url}</p>
      </div>
      <p className="text-sm text-muted">
        {t('merchantPartners.qr.help', { code })}
      </p>
      {/* Print-size source for "Download PNG"; never shown. */}
      <QRCodeCanvas
        ref={canvasRef}
        aria-hidden
        className="hidden"
        level="M"
        marginSize={4}
        size={1024}
        value={url}
      />
    </SheetFrame>
  )
}
