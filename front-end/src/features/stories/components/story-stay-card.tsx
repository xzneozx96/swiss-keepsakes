import type { StoryGroupDetail } from '@sk/api-contract'
import type { GroupFields } from '../lib/group-fields'

import { Description, Radio, RadioGroup } from '@heroui/react'

import { choiceCard } from '@/components/choice-card'
import { TravelGroupIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { staySummary } from '../lib/details-summary'
import { CollapsibleCard } from './story-details-panel'

const STAYS = ['short_stay', 'multi_day', 'both'] as const

/** Who the story is recommended to by length of stay. It orders lists for each guest and hides nothing (design section 6). */
export function StayCard({ group, onChange }: { group: StoryGroupDetail, onChange: (patch: Partial<GroupFields>) => void }) {
  const { t } = useLocale()

  return (
    <CollapsibleCard icon={TravelGroupIcon} id="stay" summary={staySummary(t, group.stayTag)} title={t('storyDetails.stay.title')}>
      <RadioGroup aria-label={t('storyDetails.stay.title')} value={group.stayTag} onChange={stayTag => onChange({ stayTag: stayTag as GroupFields['stayTag'] })}>
        <Description>{t('storyDetails.stay.help')}</Description>
        {/* HeroUI puts 16 px above every radio of a vertical group; the grid gap spaces the cards instead. */}
        <div className="grid gap-2 [&_[data-slot=radio]]:mt-0">
          {STAYS.map(id => (
            <Radio key={id} className={choiceCard} value={id}>
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <span className="flex flex-col">
                  <span className="font-medium">{t(`storyDetails.stay.${id}`)}</span>
                  <span className="text-xs text-muted">{t(`storyDetails.stay.${id}.hint`)}</span>
                </span>
              </Radio.Content>
            </Radio>
          ))}
        </div>
      </RadioGroup>
    </CollapsibleCard>
  )
}
