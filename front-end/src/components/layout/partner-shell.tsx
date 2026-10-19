import { useLocale } from '@/contexts/locale-context'
import { shop } from '@/features/catalog/seed'

/** Partner report frame (UX spec §3.3): one page, no navigation; P01 and P02 share it. */
export function PartnerShell({
  partnerName,
  isWide = false,
  children,
}: {
  /** Absent on an invalid link, where nobody is known yet. */
  partnerName?: string
  /** The P02 dashboard: a wider frame for its two-column widgets; P01 stays narrow. */
  isWide?: boolean
  children: React.ReactNode
}) {
  const { t } = useLocale()
  const width = isWide ? 'max-w-6xl' : 'max-w-3xl'

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-separator bg-surface">
        <div className={`mx-auto flex ${width} flex-col gap-0.5 px-4 py-4`}>
          <span className="text-label text-muted">{shop.name}</span>
          <h1 className="text-heading">
            {partnerName
              ? `${partnerName} · ${t('partner.reportTitle')}`
              : t('partner.reportTitle')}
          </h1>
        </div>
      </header>
      <main className={`mx-auto w-full ${width} flex-1 px-4 py-6`}>
        {children}
      </main>
    </div>
  )
}
