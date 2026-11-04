import { useLocale } from '@/contexts/locale-context'
import { Hero } from '@/features/discovery/components/hero'

/** The shipped "Sky fade" hero with the copy of the home. Its search pill and its search icon open search; it does not depend on any answer. */
export function HomeHero({ ref }: { ref?: React.RefObject<HTMLDivElement | null> }) {
  const { t } = useLocale()

  return (
    <Hero
      ref={ref}
      appName={t('app.name')}
      hello={t('home.hello')}
      photoAlt={t('home.photoAlt')}
      searchLabel={t('search.open')}
      searchPrompt={t('home.searchPrompt')}
      title={t('home.heroTitle')}
    />
  )
}
