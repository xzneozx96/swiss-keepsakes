import type { Key } from '@heroui/react'
import type { CardId } from './story-editor-cards'
import type { Interest, StayTag } from './story-editor-data'
import type { StoryEditorModel } from './story-editor-state'
import type { IconComponent } from '@/components/icons'

import { Button, Description, Input, Label, Radio, RadioGroup, Switch, Tag, TagGroup, TextField } from '@heroui/react'
import { formatShortDate } from '@sk/domain/shared'
import { useState } from 'react'

import {
  ChevronDownIcon,
  CloseIcon,
  ContentIcon,
  GiftIcon,
  LinkIcon,
  OptionIcon,
  PickupIcon,
  RatingIcon,
  SelectedIcon,
  StatusDangerIcon,
  StatusWarningIcon,
  TravelGroupIcon,
} from '@/components/icons'
import { Media } from '@/components/media'
import { cardAnchor } from './story-editor-cards'
import { CategoryField } from './story-editor-categories'
import { blogCategories, INTERESTS, keepsakes, LAB_TODAY, LANG_NAME, otherStories, pinById } from './story-editor-data'
import { OrderedRows } from './story-editor-ordered'
import { MAX_KEEPSAKES, MAX_RELATED, pinLinksIn, slugify } from './story-editor-rules'
import { KeepsakeSheet, PinPickerSheet, RelatedSheet } from './story-editor-sheets'

/**
 * Details, on the Review and publish screen: one collapsible card per block, in the style of the
 * pin editor's cards. A card opens by default when it holds a problem, and shows a one-line
 * summary of its value when closed. Everything here is shared by both languages; the language
 * switch sits on the publish card.
 */

const choiceCard
  = 'rounded-2xl border border-separator p-3 data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground'
/** The app's selected option (copied from the pin editor's tags). */
const accentTag
  = 'group relative h-auto min-h-11 items-center justify-start rounded-2xl border-2 border-transparent px-3 py-2 before:hidden data-[selected=true]:border-accent data-[selected=true]:bg-default data-[selected=true]:hover:bg-default-hover'

function TagCheck() {
  return <SelectedIcon aria-hidden className="absolute -end-1 -top-1 hidden size-4.5 rounded-full bg-surface text-accent group-data-[selected=true]:block" weight="Filled" />
}

const keysOf = (keys: 'all' | Set<Key>) => (keys === 'all' ? [] : Array.from(keys, String))

const STAY: { id: StayTag, label: string, hint: string }[] = [
  { id: 'short_stay', label: 'Short stay', hint: 'In Lucerne for a few hours or a day' },
  { id: 'multi_day', label: 'Multi-day', hint: 'Staying one night or more' },
  { id: 'both', label: 'Both', hint: 'Everyone' },
]
const INTEREST_LABEL: Record<Interest, string> = {
  'history-culture': 'History and culture',
  'food-drink': 'Food and drink',
  'lake-mountains': 'Lake and mountains',
  'shopping-keepsakes': 'Shopping and keepsakes',
  'local-activities': 'Local activities',
}

/** A chosen item where order does not count (places): picture, name, and remove. */
function ChosenRow({ photo, name, note, onRemove }: {
  photo: string
  name: string
  note?: string
  onRemove: () => void
}) {
  return (
    <li className="flex items-center gap-2 py-1.5">
      <Media alt="" className="size-11 shrink-0 rounded-xl" photo={photo || undefined}>
        {!photo && <PickupIcon aria-hidden className="absolute inset-0 m-auto text-foreground/60" size={18} />}
      </Media>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{name}</span>
        {note && <span className="truncate text-xs text-muted">{note}</span>}
      </span>
      <Button isIconOnly aria-label={`Remove ${name}`} className="max-lg:size-11" size="sm" variant="ghost" onPress={onRemove}>
        <CloseIcon aria-hidden size={16} />
      </Button>
    </li>
  )
}

/** The pin editor's card (`DetailCard`), with its header as the open and close control. */
function Card({ id, domId = cardAnchor(id), icon: Icon, title, summary, problem, open, onToggle, children }: {
  id: CardId
  /** Another DOM id, when the same card shows more than once on a page (the lab's options). */
  domId?: string
  icon: IconComponent
  title: string
  summary: string
  problem?: 'danger' | 'warning'
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const bodyId = `${domId}-body`

  return (
    <section aria-labelledby={`${domId}-title`} className="flex scroll-mt-36 flex-col rounded-3xl bg-surface shadow-surface" id={domId}>
      <button aria-controls={bodyId} aria-expanded={open} className="flex min-h-14 w-full items-center gap-3 rounded-3xl p-4 text-start outline-none focus-visible:focus-ring lg:px-5" type="button" onClick={onToggle}>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-secondary text-muted">
          <Icon aria-hidden size={18} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2 text-base font-semibold" id={`${domId}-title`}>
            {title}
            {problem === 'danger' && <StatusDangerIcon aria-label="Stops publishing" className="shrink-0 text-danger" size={16} />}
            {problem === 'warning' && <StatusWarningIcon aria-label="To look at" className="shrink-0 text-warning" size={16} />}
          </span>
          {!open && <span className="truncate text-sm text-muted">{summary}</span>}
        </span>
        <ChevronDownIcon aria-hidden className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} size={18} />
      </button>
      {open && <div className="flex flex-col gap-4 px-4 pb-4 lg:px-5 lg:pb-5" id={bodyId}>{children}</div>}
    </section>
  )
}

export function DetailsCards({ model, open, onToggle, startCategories = false }: {
  model: StoryEditorModel
  open: Record<CardId, boolean>
  onToggle: (id: CardId) => void
  startCategories?: boolean
}) {
  const { story, checks } = model
  const [sheet, setSheet] = useState<'pins' | 'review-pin' | 'keepsakes' | 'related' | null>(null)
  const linkedOnly = pinLinksIn(model.version.body).filter(id => !story.pins.includes(id))
  const reviewPin = story.review.pinId ? pinById.get(story.review.pinId) : undefined
  const title = story.versions.en.title || story.versions.de.title
  const problem = (id: CardId) => checks.blocking.some(c => c.target === id) ? 'danger' as const : checks.warnings.some(c => c.target === id) ? 'warning' as const : undefined
  const names = (ids: string[]) => ids.map(id => blogCategories.find(c => c.id === id)?.name.en).filter(Boolean).join(', ')
  const card = (id: CardId) => ({ id, open: open[id], problem: problem(id), onToggle: () => onToggle(id) })

  return (
    <div className="flex flex-col gap-4">
      <Card {...card('link')} icon={LinkIcon} summary={story.slug ? `/stories/${story.slug}` : 'Not set'} title="Link">
        <TextField fullWidth isRequired value={story.slug} onChange={slug => model.patchStory({ slug: slugify(slug) })}>
          <Label>Link</Label>
          <div className="flex items-center gap-1">
            <span className="shrink-0 text-sm text-muted">/en|de/stories/</span>
            <Input className="min-w-0 flex-1 max-lg:h-11" placeholder="musegg-morning" />
          </div>
          <Description>
            {story.slug ? 'The same link for English and German.' : 'Needed to publish.'}
            {!story.slug && title && (
              <button className="ms-2 underline underline-offset-4" type="button" onClick={() => model.patchStory({ slug: slugify(title) })}>
                {`Use “${slugify(title)}”`}
              </button>
            )}
          </Description>
        </TextField>
      </Card>

      <Card
        {...card('review')}
        icon={RatingIcon}
        summary={story.kind !== 'review' ? 'No, a story' : `${reviewPin?.name ?? 'No place yet'} · ${story.review.checkedOn ? `checked ${formatShortDate(story.review.checkedOn, LAB_TODAY, 'en-CH')}` : 'no check date'}`}
        title="Editorial review"
      >
        <Switch isSelected={story.kind === 'review'} onChange={on => model.patchStory({ kind: on ? 'review' : 'story' })}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Label>This is an editorial review</Label>
          </Switch.Content>
          <Description>Your review of one place. It names who checked the facts and when, and the place’s card on the map links to it.</Description>
        </Switch>
        {story.kind === 'review' && (
          <div className="flex flex-col gap-4 rounded-2xl bg-surface-secondary p-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                Place reviewed
                <span className="text-danger"> *</span>
              </span>
              {reviewPin
                ? (
                    <div className="flex items-center gap-3">
                      <Media alt="" className="size-11 shrink-0 rounded-xl" photo={reviewPin.photo || undefined} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{reviewPin.name}</span>
                      <Button className="max-lg:h-11" size="sm" variant="secondary" onPress={() => setSheet('review-pin')}>Change</Button>
                    </div>
                  )
                : <Button className="self-start max-lg:h-11" size="sm" variant="secondary" onPress={() => setSheet('review-pin')}>Choose the place</Button>}
            </div>
            <TextField fullWidth value={story.review.writer} onChange={writer => model.patchStory({ review: { ...story.review, writer } })}>
              <Label>Checked by</Label>
              <Input className="max-lg:h-11" placeholder={story.author} />
            </TextField>
            <TextField fullWidth isRequired value={story.review.checkedOn} onChange={checkedOn => model.patchStory({ review: { ...story.review, checkedOn } })}>
              <Label>Facts checked on</Label>
              <Input className="max-lg:h-11" max={LAB_TODAY} type="date" />
            </TextField>
          </div>
        )}
      </Card>

      <Card {...card('categories')} icon={OptionIcon} summary={names(story.categories) || 'None'} title="Blog categories">
        <CategoryField startOpen={startCategories} value={story.categories} onChange={categories => model.patchStory({ categories })} />
      </Card>

      <Card {...card('pins')} icon={PickupIcon} summary={story.pins.map(id => pinById.get(id)?.name).filter(Boolean).join(', ') || 'None'} title="Places">
        <p className="text-sm text-pretty text-muted">The pins this story is about. Their cards on the map list it.</p>
        {story.pins.length > 0 && (
          <ul className="flex flex-col divide-y divide-separator">
            {story.pins.map((id) => {
              const p = pinById.get(id)

              return p && (
                <ChosenRow key={id} name={p.name} note={p.status === 'published' ? undefined : 'Not published'} photo={p.photo} onRemove={() => model.patchStory({ pins: story.pins.filter(x => x !== id) })} />
              )
            })}
          </ul>
        )}
        <Button className="self-start max-lg:h-11" size="sm" variant="secondary" onPress={() => setSheet('pins')}>{story.pins.length ? 'Change places' : 'Choose places'}</Button>
        {linkedOnly.length > 0 && (
          <p className="text-xs text-muted">{`Linked in the text but not tagged: ${linkedOnly.map(id => pinById.get(id)?.name).join(', ')}. A pin link does not tag the place.`}</p>
        )}
      </Card>

      <Card {...card('stay')} icon={TravelGroupIcon} summary={STAY.find(s => s.id === story.stay)!.label} title="Stay">
        <RadioGroup aria-label="Stay" value={story.stay} onChange={v => model.patchStory({ stay: v as StayTag })}>
          <Description>Orders lists for each guest; nothing is hidden.</Description>
          {/* HeroUI puts 16 px above every radio of a vertical group; the grid gap spaces the cards instead. */}
          <div className="grid gap-2 [&_[data-slot=radio]]:mt-0">
            {STAY.map(s => (
              <Radio key={s.id} className={choiceCard} value={s.id}>
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <span className="flex flex-col">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-xs text-muted">{s.hint}</span>
                  </span>
                </Radio.Content>
              </Radio>
            ))}
          </div>
        </RadioGroup>
      </Card>

      <Card {...card('interests')} icon={ContentIcon} summary={story.interests.map(i => INTEREST_LABEL[i]).join(', ') || 'None'} title="Interests">
        <TagGroup aria-label="Interests" selectedKeys={new Set(story.interests)} selectionMode="multiple" size="lg" onSelectionChange={keys => model.patchStory({ interests: keysOf(keys) as Interest[] })}>
          <TagGroup.List className="grid grid-cols-2 gap-2">
            {INTERESTS.map(i => (
              <Tag key={i} className={accentTag} id={i} textValue={INTEREST_LABEL[i]}>
                <span className="font-medium">{INTEREST_LABEL[i]}</span>
                <TagCheck />
              </Tag>
            ))}
          </TagGroup.List>
        </TagGroup>
      </Card>

      <Card {...card('keepsakes')} icon={GiftIcon} summary={`${story.keepsakes.length} of ${MAX_KEEPSAKES}`} title="Keepsakes">
        <p className="text-sm text-pretty text-muted">{`Up to ${MAX_KEEPSAKES} published keepsakes, in your order, shown without prices.`}</p>
        {story.keepsakes.length > 0 && (
          <OrderedRows
            items={story.keepsakes.flatMap((id) => {
              const k = keepsakes.find(x => x.id === id)

              return k ? [{ id, name: k.name, photo: k.photo, note: k.published ? undefined : 'Not published: hidden on the story' }] : []
            })}
            label="Keepsakes, in order"
            onChange={ids => model.patchStory({ keepsakes: ids })}
          />
        )}
        <Button className="self-start max-lg:h-11" size="sm" variant="secondary" onPress={() => setSheet('keepsakes')}>
          {`Choose keepsakes · ${story.keepsakes.length} of ${MAX_KEEPSAKES}`}
        </Button>
      </Card>

      <Card {...card('related')} icon={ContentIcon} summary={`${story.related.length} of ${MAX_RELATED}${story.related.length ? '' : ' · the newest stories'}`} title="More to discover">
        <p className="text-sm text-pretty text-muted">{`Up to ${MAX_RELATED} stories at the end. With none, guests see the newest. A story without the reader’s language is hidden.`}</p>
        {story.related.length > 0 && (
          <OrderedRows
            items={story.related.flatMap((slug) => {
              const r = otherStories.find(x => x.slug === slug)

              return r ? [{ id: slug, name: r.title, photo: r.photo, note: (['en', 'de'] as const).filter(l => !r.versions[l]).map(l => `No ${LANG_NAME[l]}: hidden for those readers`)[0] }] : []
            })}
            label="More to discover, in order"
            onChange={ids => model.patchStory({ related: ids })}
          />
        )}
        <Button className="self-start max-lg:h-11" size="sm" variant="secondary" onPress={() => setSheet('related')}>
          {`Choose stories · ${story.related.length} of ${MAX_RELATED}`}
        </Button>
      </Card>

      {sheet === 'pins' && (
        <PinPickerSheet
          multiple
          note="Tag the places this story is about. Any of your pins; unpublished ones show once they are published."
          selected={story.pins}
          title="Places in this story"
          onClose={() => setSheet(null)}
          onDone={(ids) => {
            model.patchStory({ pins: ids })
            setSheet(null)
          }}
        />
      )}
      {sheet === 'review-pin' && (
        <PinPickerSheet
          selected={story.review.pinId ? [story.review.pinId] : []}
          title="Place reviewed"
          onClose={() => setSheet(null)}
          onDone={(ids) => {
            const pinId = ids[0] ?? null

            model.patchStory({ review: { ...story.review, pinId }, pins: pinId && !story.pins.includes(pinId) ? [pinId, ...story.pins] : story.pins })
            setSheet(null)
          }}
        />
      )}
      {sheet === 'keepsakes' && (
        <KeepsakeSheet
          selected={story.keepsakes}
          onClose={() => setSheet(null)}
          onDone={(ids) => {
            model.patchStory({ keepsakes: ids })
            setSheet(null)
          }}
        />
      )}
      {sheet === 'related' && (
        <RelatedSheet
          selected={story.related}
          onClose={() => setSheet(null)}
          onDone={(ids) => {
            model.patchStory({ related: ids })
            setSheet(null)
          }}
        />
      )}
    </div>
  )
}
