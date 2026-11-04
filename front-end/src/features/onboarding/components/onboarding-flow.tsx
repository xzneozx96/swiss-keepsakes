import type { Key } from '@heroui/react'
import type { InterestCode } from '@sk/domain/content'
import type { Stay } from '../lib/record'

import { Button, Modal, Tag, TagGroup } from '@heroui/react'
import { interestCodes } from '@sk/domain/content'
import { useState } from 'react'

import { ChevronLeftIcon, CloseIcon, PlusIcon, SelectedIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { photoUrl } from '@/lib/photos'
import { useOnboardingRecord } from '../hooks/use-onboarding-record'
import { forgetAnswers, getRecord, markDismissed, saveInterests, saveStay } from '../lib/answers-store'

type Step = 1 | 2

const STAYS: readonly { stay: Stay, photo: string }[] = [
  { stay: 'short_stay', photo: 'lucerne-swan' },
  { stay: 'multi_day', photo: 'rigi-kaltbad' },
]

/**
 * N01, the two-step full-screen flow (docs/ux/onboarding-design.md §2). `first` is the first run: Skip, and the stay is
 * saved by Continue. `change` is the reopened flow: pre-filled, a tapped stay saves at once, interests save on Save.
 * Every ending calls `onClose`. The answers go to the store only; nothing here makes a request (ADR-006).
 * Loaded lazily by the host, so nothing may import it eagerly.
 */
export default function OnboardingFlow({ mode, onClose }: { mode: 'first' | 'change', onClose: () => void }) {
  const { t } = useLocale()
  const record = useOnboardingRecord()
  const changing = mode === 'change'
  const [step, setStep] = useState<Step>(1)
  // First run only: a tapped stay waits for Continue. In change mode the store holds it.
  const [tapped, setTapped] = useState<Stay | null>(null)
  const [interests, setInterests] = useState<InterestCode[]>(() => changing ? getRecord().interests : [])
  const stay = changing ? record.segment : tapped

  // × and Escape: a first run counts as skipped and keeps a stay already saved; a change keeps what was changed.
  function close() {
    if (!changing)
      markDismissed()
    onClose()
  }

  function chooseStay(next: Stay) {
    setTapped(next)
    if (changing)
      saveStay(next)
  }

  function skip() {
    if (step === 2) {
      close()

      return
    }
    setTapped(null)
    setStep(2)
  }

  function next() {
    if (step === 1) {
      if (stay && !changing)
        saveStay(stay)
      setStep(2)

      return
    }
    saveInterests(interests)
    onClose()
  }

  function forget() {
    forgetAnswers()
    onClose()
  }

  const mainLabel = step === 1 ? t('onboarding.stay.continue') : changing ? t('onboarding.interests.save') : t('onboarding.interests.show')
  const mainDisabled = step === 1 ? !changing && !stay : !changing && interests.length === 0

  return (
    <Modal.Backdrop isDismissable={false} isOpen variant="opaque" onOpenChange={open => !open && close()}>
      <Modal.Container size="full">
        <Modal.Dialog className="flex h-full flex-col gap-0 rounded-none bg-background px-5 pt-6 pb-6 shadow-none">
          <Progress step={step} />
          <div className="-mx-2 mt-2 flex h-11 items-center">
            {step === 2 && (
              <Button isIconOnly aria-label={t('onboarding.back')} className="size-11" variant="ghost" onPress={() => setStep(1)}>
                <ChevronLeftIcon size={20} />
              </Button>
            )}
            <span className="flex-1" />
            {!changing && (
              <Button className="h-11" variant="ghost" onPress={skip}>
                {t('onboarding.skip')}
              </Button>
            )}
            <Button isIconOnly aria-label={t('onboarding.close')} className="size-11" variant="ghost" onPress={close}>
              <CloseIcon size={20} />
            </Button>
          </div>

          <div key={step} className="flex min-h-0 flex-1 animate-rise flex-col pt-5">
            <div className="text-center">
              <Modal.Heading
                ref={node => node?.focus()}
                className="font-serif text-[30px] leading-9 tracking-[-0.02em] text-balance outline-none"
                level={2}
                tabIndex={-1}
              >
                <span className="sr-only">{`${t('onboarding.step', { step })}.`}</span>
                {' '}
                {step === 1 ? t('onboarding.stay.title') : t('onboarding.interests.title')}
              </Modal.Heading>
              <p className="mt-2 text-body font-normal text-muted">
                {step === 1 ? t('onboarding.stay.subtitle') : t('onboarding.interests.subtitle')}
              </p>
            </div>
            {/* Five interest cards can outgrow a short phone: only the cards scroll, the heading and the button stay. */}
            <div className="-mx-1 mt-8 min-h-0 overflow-y-auto px-1 py-1">
              {step === 1
                ? <StayChoices selected={stay} onSelect={chooseStay} />
                : <InterestChoices selected={interests} onSelect={setInterests} />}
            </div>
          </div>

          <div className="mt-auto flex flex-col items-center gap-3 pt-4">
            <p className="text-label text-muted">{t('onboarding.privacy')}</p>
            {changing && step === 2 && (
              <Button size="sm" variant="ghost" onPress={forget}>
                {t('onboarding.forget')}
              </Button>
            )}
            <Button fullWidth isDisabled={mainDisabled} size="lg" onPress={next}>
              {mainLabel}
            </Button>
          </div>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}

/** Two segments; the fill does not animate under reduced motion. */
function Progress({ step }: { step: Step }) {
  return (
    <div aria-hidden className="flex gap-1.5">
      {([1, 2] as const).map(n => (
        <span key={n} className="h-1.5 flex-1 overflow-hidden rounded-full bg-default">
          <span className={`block h-full rounded-full bg-foreground transition-[width] duration-500 motion-reduce:transition-none ${n <= step ? 'w-full' : 'w-0'}`} />
        </span>
      ))}
    </div>
  )
}

function StayChoices({ selected, onSelect }: { selected: Stay | null, onSelect: (stay: Stay) => void }) {
  const { t } = useLocale()

  return (
    <Choices
      label={t('onboarding.stay.title')}
      mode="single"
      selected={selected ? [selected] : []}
      onSelect={([key]) => key && onSelect(key as Stay)}
    >
      {STAYS.map(({ stay, photo }) => (
        <OptionCard
          key={stay}
          className="gap-3 p-2.5"
          id={stay}
          textValue={`${t(`onboarding.stay.${stay}.label`)}, ${t(`onboarding.stay.${stay}.hint`)}`}
        >
          <img alt="" className="size-16 shrink-0 rounded-xl object-cover" src={photoUrl(photo)} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-base font-semibold">{t(`onboarding.stay.${stay}.label`)}</span>
            <span className="text-label font-normal text-muted">{t(`onboarding.stay.${stay}.hint`)}</span>
          </span>
        </OptionCard>
      ))}
    </Choices>
  )
}

function InterestChoices({ selected, onSelect }: { selected: InterestCode[], onSelect: (interests: InterestCode[]) => void }) {
  const { t } = useLocale()

  return (
    <Choices
      label={t('onboarding.interests.title')}
      mode="multiple"
      selected={selected}
      onSelect={keys => onSelect(interestCodes.filter(code => keys.includes(code)))}
    >
      {interestCodes.map(code => (
        <OptionCard key={code} className="min-h-13 gap-2.5 px-4 text-base" id={code} textValue={t(`places.interest.${code}`)}>
          {/* The plus keeps its slot when selected, so the label never moves. */}
          <PlusIcon aria-hidden className="size-5 group-data-[selected=true]:invisible" />
          {t(`places.interest.${code}`)}
        </OptionCard>
      ))}
    </Choices>
  )
}

/** A TagGroup of option cards, one per row, the pattern of the gift detail's variant cards. */
function Choices({ label, mode, selected, onSelect, children }: {
  label: string
  mode: 'single' | 'multiple'
  selected: readonly string[]
  onSelect: (keys: string[]) => void
  children: React.ReactNode
}) {
  return (
    <TagGroup
      aria-label={label}
      // Escape closes the dialog; by default it would first clear the chosen cards.
      escapeKeyBehavior="none"
      selectedKeys={new Set(selected)}
      selectionMode={mode}
      size="lg"
      onSelectionChange={(keys: 'all' | Set<Key>) => onSelect(keys === 'all' ? [] : Array.from(keys, String))}
    >
      <TagGroup.List className="flex flex-col gap-3">{children}</TagGroup.List>
    </TagGroup>
  )
}

/** Chosen = red border and a check on the top edge; the fill stays, so nothing moves and colour is not the only sign. */
function OptionCard({ id, textValue, className, children }: { id: string, textValue: string, className: string, children: React.ReactNode }) {
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
