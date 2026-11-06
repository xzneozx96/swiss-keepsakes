import { useLocale } from '@/contexts/locale-context'
import { AdviceBanner } from '@/features/discovery/components/advice-banner'

/**
 * The fixed tail of the home: a thread with one handing-over line that ends on a red dot, then the shipped advice banner (it
 * opens the demo advice form). The page's section gap is cancelled, so the thread above the line starts at the foot of whatever
 * section stands above: from the Victorinox lake blue under the showcase, from the separator colour under any other section.
 */
export function HomeEnding({ afterShowcase }: { afterShowcase: boolean }) {
  const { t } = useLocale()

  return (
    <div className="-mt-10 flex flex-col">
      <div className="flex flex-col items-center px-10">
        {/* The thread always hangs from the section above (owner, 06.11.2026): the page gap is cancelled so it starts at that section's
            foot, from the lake blue under the showcase and from the separator colour under any other section. */}
        <span aria-hidden data-thread className={`w-px ${afterShowcase ? 'h-8 bg-[linear-gradient(to_bottom,#173f52,var(--separator))]' : 'h-10 bg-separator'}`} />
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
