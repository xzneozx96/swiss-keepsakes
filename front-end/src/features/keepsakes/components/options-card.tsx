import { OptionIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { KeepsakeCard } from './keepsake-card'

/**
 * The Options card. E6.2 builds the options table and the options sheet N14 here, with an Add option button in
 * `trailing`. Until then a keepsake has no options and is sold as one variant.
 */
export function OptionsCard() {
  const { t } = useLocale()

  return (
    <KeepsakeCard icon={OptionIcon} id="options" title={t('keepsakes.options.title')}>
      <p className="text-sm text-pretty text-muted">{t('keepsakes.options.none')}</p>
    </KeepsakeCard>
  )
}
