import type { StoryGroupDetail } from '@sk/api-contract'
import type { GroupFields } from '../lib/group-fields'

import { Tag, TagGroup } from '@heroui/react'
import { interestCodes } from '@sk/domain/content'

import { ContentIcon, SelectedIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { ACCENT_TAG } from '@/features/keepsakes/components/option-parts'
import { interestsSummary } from '../lib/details-summary'
import { CollapsibleCard } from './story-details-panel'

/** The five fixed interests as selectable tags in two columns; the saved list keeps the order of the five. */
export function InterestsCard({ group, onChange }: { group: StoryGroupDetail, onChange: (patch: Partial<GroupFields>) => void }) {
  const { t } = useLocale()

  return (
    <CollapsibleCard icon={ContentIcon} id="interests" summary={interestsSummary(t, group.interests)} title={t('storyDetails.interests.title')}>
      <TagGroup
        aria-label={t('storyDetails.interests.title')}
        selectedKeys={new Set(group.interests)}
        selectionMode="multiple"
        size="lg"
        onSelectionChange={keys => onChange({ interests: interestCodes.filter(code => keys === 'all' || keys.has(code)) })}
      >
        <TagGroup.List className="grid grid-cols-2 gap-2">
          {interestCodes.map(code => (
            <Tag key={code} className={ACCENT_TAG} id={code} textValue={t(`storyDetails.interest.${code}`)}>
              <span className="font-medium">{t(`storyDetails.interest.${code}`)}</span>
              <SelectedIcon aria-hidden className="absolute -end-1 -top-1 hidden size-4.5 rounded-full bg-surface text-accent group-data-[selected=true]:block" weight="Filled" />
            </Tag>
          ))}
        </TagGroup.List>
      </TagGroup>
    </CollapsibleCard>
  )
}
