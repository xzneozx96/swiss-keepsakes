/**
 * Lab: F1 Guided, the full-screen guest onboarding (N01) chosen on 28.10.2026. Segmented
 * progress, a big centred title with one line under it, one full-width button. Every choice
 * is the app's option card: red border and a check on the top edge, the fill stays.
 */
import type { Key } from '@heroui/react'
import type { Language, Segment } from '@/features/lab/onboarding-data'
import type { ScreensProps, Step } from '@/features/lab/onboarding-fs-data'

import { Button, Tag, TagGroup } from '@heroui/react'
import { useState } from 'react'

import { ChevronLeftIcon, CloseIcon, PlusIcon, SelectedIcon } from '@/components/icons'
import { copy, interests, segmentPhotos, segments } from '@/features/lab/onboarding-data'
import { applyInterests, closeAction, fsCopy } from '@/features/lab/onboarding-fs-data'
import { photoUrl } from '@/lib/photos'

/** A TagGroup of option cards; the step heading names it. Reports the chosen keys. */
function ChoiceGroup({
  labelledBy,
  multiple = false,
  selected,
  onSelect,
  children,
}: {
  labelledBy: string
  multiple?: boolean
  selected: string[]
  onSelect: (keys: string[]) => void
  children: React.ReactNode
}) {
  return (
    <TagGroup
      aria-labelledby={labelledBy}
      selectedKeys={new Set(selected)}
      selectionMode={multiple ? 'multiple' : 'single'}
      size="lg"
      onSelectionChange={(keys: 'all' | Set<Key>) => onSelect(keys === 'all' ? [] : Array.from(keys, String))}
    >
      {/* One full-width card per row: nothing moves or resizes when a card is chosen. */}
      <TagGroup.List className="flex flex-col gap-3">{children}</TagGroup.List>
    </TagGroup>
  )
}

/**
 * The app's option card, as on the gift detail's variant cards: chosen = red border and a check
 * on the top edge; the fill stays, so selection never relies on hue alone.
 */
function OptionTag({
  id,
  textValue,
  className,
  children,
}: {
  id: string
  textValue: string
  className: string
  children: React.ReactNode
}) {
  return (
    <Tag
      className={`group relative h-auto w-full justify-start rounded-2xl border-2 border-transparent text-start before:hidden data-[selected=true]:border-accent data-[selected=true]:bg-default data-[selected=true]:hover:bg-default-hover ${className}`}
      id={id}
      textValue={textValue}
    >
      {children}
      <SelectedIcon
        aria-hidden
        className="absolute -end-1 -top-1 hidden size-4.5 rounded-full bg-surface text-accent group-data-[selected=true]:block"
        weight="Filled"
      />
    </Tag>
  )
}

/** Step heading: labels the dialog, takes focus on each step and says "1 of 2" to screen readers. */
function Heading({ id, step, language, children }: { id: string, step: Step, language: Language, children: React.ReactNode }) {
  return (
    <h2 className="font-serif text-[30px] leading-9 tracking-[-0.02em] text-balance outline-none" id={id} tabIndex={-1}>
      <span className="sr-only">{`${fsCopy[language].stepOf(step)}. `}</span>
      {children}
    </h2>
  )
}

/** F1 · Guided: the two steps, the Back, Skip and close controls and the main button. */
export function FullscreenGuided({ flow, language, step, setStep, editing, titleId, end }: ScreensProps) {
  const c = copy[language]
  const f = fsCopy[language]
  const [segment, setSegment] = useState<Segment | null>(flow.answers.segment)
  const picked = flow.answers.interests.length > 0

  return (
    <div className="flex h-full flex-col px-5 pt-6 pb-6">
      <div aria-hidden className="flex gap-1.5">
        {[1, 2].map(n => (
          <span key={n} className="h-1.5 flex-1 overflow-hidden rounded-full bg-default">
            <span
              className={`block h-full rounded-full bg-foreground transition-[width] duration-500 motion-reduce:transition-none ${n <= step ? 'w-full' : 'w-0'}`}
            />
          </span>
        ))}
      </div>

      <div className="-mx-2 mt-2 flex h-11 items-center">
        {step === 2 && (
          <Button isIconOnly aria-label={c.back} className="size-11" variant="ghost" onPress={() => setStep(1)}>
            <ChevronLeftIcon size={20} />
          </Button>
        )}
        <span className="flex-1" />
        {/* Skip: step 1 moves on without saving a stay; step 2 ends and keeps the stay. */}
        {!editing && (
          <Button
            className="h-11"
            variant="ghost"
            onPress={() => {
              if (step === 2) {
                end('skip-interests')

                return
              }
              setSegment(flow.answers.segment)
              setStep(2)
            }}
          >
            {c.skip}
          </Button>
        )}
        <Button isIconOnly aria-label={c.close} className="size-11" variant="ghost" onPress={() => end(closeAction(step, editing))}>
          <CloseIcon size={20} />
        </Button>
      </div>

      <div key={step} className="flex min-h-0 flex-1 animate-rise flex-col pt-5">
        <div className="text-center">
          <Heading id={titleId} language={language} step={step}>
            {step === 1 ? c.stayQuestion : c.interestQuestion}
          </Heading>
          <p className="mt-2 text-body text-muted">{step === 1 ? c.intro : c.interestHint}</p>
        </div>

        {/* Five interest cards can outgrow a short phone: only the cards scroll, the heading and the button stay. */}
        <div className="-mx-1 mt-8 min-h-0 overflow-y-auto px-1 py-1">
          {step === 1
            ? (
                <ChoiceGroup
                  labelledBy={titleId}
                  selected={segment ? [segment] : []}
                  onSelect={([key]) => {
                    if (!key)
                      return
                    setSegment(key as Segment)
                    // First run: Continue saves the stay. Changing answers: a tap saves it, so × keeps it.
                    if (editing)
                      flow.chooseSegment(key as Segment)
                  }}
                >
                  {segments.map(s => (
                    <OptionTag key={s} className="gap-3 p-2.5" id={s} textValue={c.stay[s].label}>
                      <img alt="" className="size-16 shrink-0 rounded-xl object-cover" src={photoUrl(segmentPhotos[s])} />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-base font-semibold">{c.stay[s].label}</span>
                        <span className="text-label font-normal text-muted">{c.stay[s].hint}</span>
                      </span>
                    </OptionTag>
                  ))}
                </ChoiceGroup>
              )
            : (
                <ChoiceGroup
                  multiple
                  labelledBy={titleId}
                  selected={flow.answers.interests}
                  onSelect={keys => applyInterests(flow, keys)}
                >
                  {interests.map(interest => (
                    <OptionTag key={interest} className="min-h-13 gap-2.5 px-4 text-base" id={interest} textValue={c.interests[interest]}>
                      {/* The plus keeps its slot when hidden, so the label never shifts. */}
                      <PlusIcon className="size-5 group-data-[selected=true]:invisible" />
                      {c.interests[interest]}
                    </OptionTag>
                  ))}
                </ChoiceGroup>
              )}
        </div>
      </div>

      <div className="mt-auto flex flex-col items-center gap-3">
        <p className="text-label text-muted">{c.privacy}</p>
        {editing && step === 2 && (
          <Button size="sm" variant="ghost" onPress={() => end('forget')}>
            {c.forget}
          </Button>
        )}
        {step === 1
          ? (
              <Button
                fullWidth
                isDisabled={!segment}
                size="lg"
                onPress={() => {
                  if (!segment)
                    return
                  flow.chooseSegment(segment)
                  setStep(2)
                }}
              >
                {f.continue}
              </Button>
            )
          : (
              <Button fullWidth isDisabled={!picked && !editing} size="lg" onPress={() => end('finish')}>
                {editing ? f.save : f.show}
              </Button>
            )}
      </div>
    </div>
  )
}
