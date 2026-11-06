import { useLocale } from '@/contexts/locale-context'
import { AdviceBanner } from '@/features/discovery/components/advice-banner'

/**
 * The fixed tail of the home: a thread with one handing-over line that ends on a red dot, then the shipped advice banner (it
 * opens the demo advice form). The thread above the line drops from the Victorinox lake blue only when the showcase stands right
 * above it; after any other section the ending starts with the line. The page's section gap is cancelled under the showcase so the
 * thread touches it.
 */
export function HomeEnding({ afterShowcase }: { afterShowcase: boolean }) {
  const { t } = useLocale()

  return (
    <div className={`flex flex-col ${afterShowcase ? '-mt-10' : ''}`}>
      <div className="flex flex-col items-center px-10">
        {/* The thread hangs from the showcase only; under another section it would hang from nothing (owner, 06.11.2026). */}
        {afterShowcase && <span aria-hidden className="h-8 w-px bg-[linear-gradient(to_bottom,#173f52,var(--separator))]" />}
        <p className="py-2 text-center font-serif text-[17px] leading-6 text-balance italic">{t('homePage.ending.line')}</p>
        <span aria-hidden className="h-6 w-px bg-separator" />
        <span aria-hidden className="size-2 rounded-full bg-accent" />
      </div>
      <AdviceBanner
        action={t('home.advice.action')}
        body={t('home.advice.body')}
        captions={[t('home.advice.caption1'), t('home.advice.caption2'), t('home.advice.caption3')]}
        title={t('home.advice.title')}
      />
    </div>
  )
}
