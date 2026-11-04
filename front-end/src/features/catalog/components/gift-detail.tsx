import type { Key } from '@heroui/react'
import type { RichNode } from '@sk/domain/shared'
import type { ChoiceOption, ChoiceVariant, Chosen } from '../lib/variant-choice'
import type { PickupDateFieldProps } from './pickup-date-field'
import type { IconComponent } from '@/components/icons'
import type { ListingReviewsProps } from '@/components/listings/listing-reviews'
import type { PhotoGalleryLabels } from '@/components/photo-gallery'

import {
  Accordion,
  Button,
  buttonVariants,
  Description,
  FieldError,
  Label,
  Radio,
  RadioGroup,
  Skeleton,
  Tag,
  TagGroup,
} from '@heroui/react'
import { Link } from '@tanstack/react-router'

import { useState } from 'react'
import { ChoiceSheet } from '@/components/choice-sheet'
import { flyToCart } from '@/components/fly-to-cart'

import {
  InfoIcon,
  PayLaterIcon,
  PickupIcon,
  SelectedIcon,
  StatusSuccessIcon,
} from '@/components/icons'
import {
  BackButton,
  CartButton,
  CompactBar,
} from '@/components/layout/cart-button'
import { LanguageButton } from '@/components/layout/language-button'
import {
  ListingDetailHeader,
  ListingFavouriteButton,
} from '@/components/listings/listing-detail-header'
import { ListingReviews } from '@/components/listings/listing-reviews'
import { PhotoGallery } from '@/components/photo-gallery'
import { QuantityStepper } from '@/components/quantity-stepper'
import { Stars } from '@/components/rating'
import { RichText } from '@/components/rich-text'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { useScrolledPast } from '@/hooks/use-scrolled-past'
import { photoUrl } from '@/lib/photos'
import { PickupDateField } from './pickup-date-field'

/** What the guest page and the editor's preview both show: the keepsake itself and the choice of its options. */
export interface GiftPageProps {
  name: string
  photos: string[]
  galleryLabels: PhotoGalleryLabels
  /** The keepsake's rich-text description (Tiptap JSON); empty = the About section shows no text. */
  description?: RichNode
  /** Shown when the product text is only in the other language (R02, AC30). */
  languageNotice?: string
  /**
   * One quiet line under the name: "New · No reviews yet", or the stars, average and count once ratings exist (E5.5).
   * Owner, 2026-11-02: no pickup date and no stats row here.
   */
  rating: { summary: string, average?: number, label: string }
  highlights: {
    icon: 'pickup' | 'pay'
    title: string
    body: string
  }[]
  sheet: { title: string, closeLabel: string }
  variant: {
    /** One choice per option; none (a single variant) = the sheet shows no choice. */
    options: ChoiceOption[]
    variants: ChoiceVariant[]
    /** The chosen value per option id. */
    chosen: Chosen
    /** Why a value cannot be picked with the other chosen values, per option and value id. */
    reasons: Record<string, Record<string, string>>
    onChange: (optionId: string, valueId: string) => void
    error?: string
  }
  /** "This is the date you request. The seller confirms before you pay." */
  note: string
  place: {
    /** An empty address or hours line is not shown. */
    options: { id: string, name: string, address: string, hours: string }[]
  }
  sections: {
    aboutTitle: string
    placesTitle: string
    /** "Pickup date" row: earliest date, or the chosen date and place. */
    /** The "Pickup date" fold-out: its title and the button in it (owner 2026-11-02: no date line under the title). */
    dateRow: { title: string, action: string }
    paymentTitle: string
    payment: string
    cancellationTitle: string
    cancellation: string
    cancellationNote?: string
  }
  reviews: ListingReviewsProps
  bar: {
    price: string
    /** Chosen date and place, or a prompt to choose them. */
    summary: string
    chip: string
    addLabel: string
    /**
     * The price comes from a read the browser makes after the page has loaded (AC54): `loading` shows a skeleton in its
     * place, an error shows its message with a retry. Absent = the price is known and `price` shows.
     */
    priceState?: 'loading' | { error: string, retryLabel: string, onRetry: () => void }
    /** The button that opens the sheet cannot be pressed (nothing can be chosen yet). */
    addDisabled?: boolean
  }
}

/** What only a guest has: the cart, the pickup date and place, the favourite and the way back. */
export interface GiftShopperProps {
  favourite: { isSaved: boolean, onToggle: () => void, label: string }
  soldOut?: {
    label: string
    message: string
    actionLabel: string
  }
  sheet: { addLabel: string, /** The sheet's add button cannot be pressed: the choice is not one that can be bought. */ addDisabled?: boolean }
  quantity: {
    label: string
    value: number
    max: number
    /** "4 available". */
    hint?: string
    onChange: (value: number) => void
  }
  /** The guest's own pickup date and place, chosen in the sheet. Absent while pickup is chosen at checkout (E6.6). */
  pickup?: {
    date: PickupDateFieldProps
    place: {
      label: string
      value: string | null
      onChange: (id: string) => void
      error?: string
    }
  }
  bar: {
    /** Set right after adding; the bar then also offers "View cart". */
    addedLabel?: string
    viewCartLabel: string
  }
  /** Adds the line; false when a choice is missing (errors are then shown in the sheet). */
  onAdd: () => boolean
  /** Called when the sheet opens: clears the "added" confirmation. */
  onSheetOpen: () => void
  backLabel: string
  onBack: () => void
}

export type GiftDetailProps = GiftPageProps & GiftShopperProps

/**
 * The editor's preview of the page (E6, owner 2026-11-02): the same page, inert. No back, favourite, language or cart
 * buttons, no links and no adding; the options can still be chosen, in a panel that stays inside the phone.
 */
export type GiftPreviewProps = GiftPageProps & { preview: true }

const highlightIcon: Record<
  GiftDetailProps['highlights'][number]['icon'],
  IconComponent
> = {
  pickup: PickupIcon,
  pay: PayLaterIcon,
}

/**
 * C03 Gift detail in the order of the Airbnb listing page (owner references, Airbnb iOS
 * Jun 2025, screens 36, 38, 42, 45): photos; title and one rating line;
 * highlights; translation notice; About; reviews (laurel rating, swipeable
 * cards, "Show all" opens the reviews sheet); where to pick it up; then the things to know
 * (pickup date row, cancellation policy, payment). Every choice is made in a bottom
 * sheet opened from the sticky price bar or the pickup date row.
 */
export function GiftDetail(props: GiftDetailProps | GiftPreviewProps) {
  const { language } = useLocale()
  const {
    name,
    photos,
    galleryLabels,
    description,
    languageNotice,
    rating,
    highlights,
    place,
    sections,
    reviews,
    bar,
  } = props
  // The preview has none of the guest's parts: no back, favourite, language or cart buttons, no adding.
  const shopper = 'preview' in props ? null : props
  const soldOut = shopper?.soldOut
  const [photoEnd, scrolledPast] = useScrolledPast<HTMLDivElement>()
  const [sheetOpen, setSheetOpen] = useState(false)

  const openSheet = () => {
    shopper?.onSheetOpen()
    setSheetOpen(true)
  }

  const heart = (guest: GiftShopperProps, tone: 'pill' | 'bar') => (
    <ListingFavouriteButton favourite={guest.favourite} tone={tone} />
  )

  return (
    <div className="flex flex-1 flex-col">
      {shopper && (
        <CompactBar
          leading={<BackButton label={shopper.backLabel} onPress={shopper.onBack} />}
          visible={scrolledPast}
        >
          <span className="flex-1" />
          {heart(shopper, 'bar')}
          <LanguageButton tone="bar" />
          <CartButton tone="bar" />
        </CompactBar>
      )}

      <PhotoGallery
        className="aspect-[4/3.4]"
        labels={galleryLabels}
        noViewer={!shopper}
        photos={photos}
      >
        {shopper && (
          <div className="pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+12px)] z-10 flex items-center gap-2 [&>*]:pointer-events-auto">
            <BackButton label={shopper.backLabel} tone="pill" onPress={shopper.onBack} />
            <span className="flex-1" />
            {heart(shopper, 'pill')}
            <LanguageButton tone="pill" />
            <CartButton tone="pill" />
          </div>
        )}
      </PhotoGallery>
      <div ref={photoEnd} aria-hidden className="h-px" />

      <div className="relative -mt-6 flex flex-1 flex-col rounded-t-3xl bg-background px-6 pt-7 pb-4">
        {/* 1. Title (screen 36) */}
        <ListingDetailHeader name={name} />
        {shopper
          ? (
              <a
                className="-mt-4 mb-6 flex items-center justify-center gap-2 self-center rounded text-sm text-muted outline-none focus-visible:focus-ring"
                href="#gift-reviews"
              >
                {rating.average !== undefined && <Stars label={rating.label} rating={rating.average} size={14} />}
                <span>{rating.summary}</span>
              </a>
            )
          : (
              <p className="-mt-4 mb-6 flex items-center justify-center gap-2 self-center text-sm text-muted">
                <span>{rating.summary}</span>
              </p>
            )}

        {/* 4. Highlights (screen 38) */}
        <ul className="flex flex-col gap-5 border-t border-separator py-7">
          {highlights.map((h) => {
            const Icon = highlightIcon[h.icon]

            return (
              <li key={h.icon} className="flex gap-4">
                <Icon aria-hidden className="mt-0.5 shrink-0" size={26} />
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">{h.title}</span>
                  <span className="text-sm text-muted">{h.body}</span>
                </div>
              </li>
            )
          })}
        </ul>

        {/* 5. Translation notice, then About */}
        {languageNotice && (
          <p className="flex items-start gap-2 border-t border-separator pt-7 text-sm">
            <InfoIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
            {languageNotice}
          </p>
        )}
        <section
          className={`flex flex-col gap-3 py-7 ${languageNotice ? '' : 'border-t border-separator'}`}
        >
          <h2 className="font-serif text-title">{sections.aboutTitle}</h2>
          {description && <RichText doc={description} />}
        </section>

        {/* 6. Reviews (screen 42) */}
        <ListingReviews id="gift-reviews" reviews={reviews} />

        {/* 7–8. Where to pick it up and the things to know, collapsed to save space. */}
        <Accordion
          allowsMultipleExpanded
          className="border-t border-separator [&_.accordion\_\_body-inner]:px-0 [&_.accordion\_\_trigger]:px-0 [&_.accordion\_\_trigger]:py-5"
        >
          <Accordion.Item id="places">
            <Accordion.Heading>
              <Accordion.Trigger>
                <span className="flex-1 text-start font-serif text-card-title">
                  {sections.placesTitle}
                </span>
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body>
                <ul className="flex flex-col gap-4">
                  {place.options.map(p => (
                    <li key={p.id} className="flex flex-col">
                      <span className="font-semibold text-foreground">
                        {p.name}
                      </span>
                      {p.address && <span className="text-sm">{p.address}</span>}
                      {p.hours && <span className="text-sm">{p.hours}</span>}
                    </li>
                  ))}
                </ul>
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>

          {!soldOut && (
            <Accordion.Item id="date">
              <Accordion.Heading>
                <Accordion.Trigger>
                  <span className="flex-1 text-start font-serif text-card-title">
                    {sections.dateRow.title}
                  </span>
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className="flex flex-col items-start gap-3">
                  <p className="text-sm">{props.note}</p>
                  {shopper && sections.dateRow.action && (
                    <Button size="sm" variant="secondary" onPress={openSheet}>
                      {sections.dateRow.action}
                    </Button>
                  )}
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          )}

          <Accordion.Item id="cancellation">
            <Accordion.Heading>
              <Accordion.Trigger>
                <span className="flex-1 text-start font-serif text-card-title">
                  {sections.cancellationTitle}
                </span>
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="flex flex-col gap-1 text-sm">
                {sections.cancellationNote && (
                  <span className="text-xs">{sections.cancellationNote}</span>
                )}
                {sections.cancellation}
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item id="payment">
            <Accordion.Heading>
              <Accordion.Trigger>
                <span className="flex-1 text-start font-serif text-card-title">
                  {sections.paymentTitle}
                </span>
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="text-sm">
                {sections.payment}
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>

      <div className="sticky bottom-0 z-30 flex items-center gap-3 border-t border-separator bg-background px-6 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
        {soldOut
          ? (
              <>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                  <StatusChip tone="neutral">{soldOut.label}</StatusChip>
                  <span className="text-xs text-muted">{soldOut.message}</span>
                </div>
                <Link
                  className={buttonVariants({ size: 'lg', variant: 'secondary' })}
                  to="/$lang/gifts"
                  params={{ lang: language }}
                >
                  {soldOut.actionLabel}
                </Link>
              </>
            )
          : (
              <>
                <div
                  aria-live="polite"
                  className="flex min-w-0 flex-1 flex-col items-start"
                >
                  {shopper?.bar.addedLabel
                    ? (
                        <>
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
                            <StatusSuccessIcon aria-hidden size={18} />
                            {shopper.bar.addedLabel}
                          </span>
                          <Link
                            className="rounded text-sm font-semibold underline underline-offset-4 outline-none focus-visible:focus-ring"
                            to="/cart"
                          >
                            {shopper.bar.viewCartLabel}
                          </Link>
                        </>
                      )
                    : (
                        <>
                          <BarPrice bar={bar} />
                          <span className="truncate text-xs text-muted">
                            {bar.summary}
                          </span>
                          <span className="mt-1 flex items-center gap-1 rounded-full bg-surface-secondary px-2 py-0.5 text-xs whitespace-nowrap">
                            <StatusSuccessIcon aria-hidden size={12} />
                            {bar.chip}
                          </span>
                        </>
                      )}
                </div>
                {/* Stays available after adding, for another option, date or quantity. */}
                <Button isDisabled={bar.addDisabled} size="lg" onPress={openSheet}>
                  {bar.addLabel}
                </Button>
              </>
            )}
      </div>

      {shopper && !soldOut && (
        <GiftSheet {...shopper} isOpen={sheetOpen} onOpenChange={setSheetOpen} />
      )}
      {!shopper && sheetOpen && (
        <PreviewSheet
          sheet={props.sheet}
          variant={props.variant}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  )
}

/** The price in the bar: the amount, a skeleton while the browser reads it, or the error with a retry. */
function BarPrice({ bar }: { bar: GiftPageProps['bar'] }) {
  const state = bar.priceState

  if (state === 'loading')
    return <Skeleton aria-hidden className="h-7 w-24 rounded-lg" data-skeleton="price" />
  if (state) {
    return (
      <span className="flex items-center gap-2" role="alert">
        <span className="text-sm text-danger">{state.error}</span>
        <Button size="sm" variant="secondary" onPress={state.onRetry}>{state.retryLabel}</Button>
      </span>
    )
  }

  return (
    <span className="text-lg font-semibold underline underline-offset-4 tabular-nums">
      {bar.price}
    </span>
  )
}

/** Add-to-cart sheet: one choice per option, quantity, and the pickup date and place when the guest chooses them here. */
function GiftSheet({
  sheet,
  photos,
  variant,
  quantity,
  pickup,
  note,
  place: pickupPlaces,
  onAdd,
  isOpen,
  onOpenChange,
}: GiftDetailProps & {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <ChoiceSheet
      action={{
        label: sheet.addLabel,
        isDisabled: sheet.addDisabled,
        onPress: (e) => {
          if (!onAdd())
            return
          // Read the button's place before the sheet starts closing.
          flyToCart(e.target, photoUrl(photos[0]))
          onOpenChange(false)
        },
      }}
      closeLabel={sheet.closeLabel}
      isOpen={isOpen}
      title={sheet.title}
      onOpenChange={onOpenChange}
    >
      <VariantChoices variant={variant} />

      <QuantityStepper
        hint={quantity.hint}
        label={quantity.label}
        max={quantity.max}
        value={quantity.value}
        onChange={quantity.onChange}
      />

      {pickup && (
        <>
          <PickupDateField {...pickup.date} />

          {/* No "*": every sheet field is needed. Missing choices show an error on add. */}
          <RadioGroup
            id="gift-place"
            isInvalid={pickup.place.error !== undefined}
            value={pickup.place.value}
            onChange={pickup.place.onChange}
          >
            <Label className="text-heading">{pickup.place.label}</Label>
            {pickupPlaces.options.map(p => (
              <Radio key={p.id} value={p.id}>
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  {p.name}
                </Radio.Content>
                <Description>
                  {p.address} · {p.hours}
                </Description>
              </Radio>
            ))}
            <FieldError>{pickup.place.error}</FieldError>
          </RadioGroup>
        </>
      )}

      <p className="flex items-start gap-2 text-sm">
        <InfoIcon
          aria-hidden
          className="mt-0.5 shrink-0 text-muted"
          size={16}
        />
        {note}
      </p>
    </ChoiceSheet>
  )
}

/** One choice per option, as value cards; a value that cannot be picked is struck through with its reason below. */
function VariantChoices({ variant }: { variant: GiftPageProps['variant'] }) {
  if (variant.options.length === 0)
    return null

  return (
    <div className="flex flex-col gap-4" id="gift-variant">
      {variant.options.map((option) => {
        const reasons = variant.reasons[option.id] ?? {}
        const blocked = option.values.filter(v => reasons[v.id])

        return (
          <TagGroup
            key={option.id}
            disabledKeys={blocked.map(v => v.id)}
            selectedKeys={
              variant.chosen[option.id]
                ? new Set([variant.chosen[option.id]])
                : new Set()
            }
            selectionMode="single"
            size="lg"
            onSelectionChange={(keys: 'all' | Set<Key>) => {
              const [first] = keys === 'all' ? [] : [...keys]

              if (first !== undefined)
                variant.onChange(option.id, String(first))
            }}
          >
            <Label className="text-heading">{option.label}</Label>
            {/* Value cards: name over hint, three to a row. Chosen = red border and a
                check on the top edge, clear of long names (owner, round 3); the fill stays. */}
            <TagGroup.List className="grid grid-cols-3 gap-2 pt-2">
              {option.values.map(v => (
                <Tag
                  key={v.id}
                  className={`group relative h-auto items-start justify-start rounded-2xl border-2 border-transparent px-2.5 py-2 before:hidden data-[selected=true]:border-accent data-[selected=true]:bg-default data-[selected=true]:hover:bg-default-hover ${reasons[v.id] ? 'line-through' : ''}`}
                  id={v.id}
                  textValue={v.hint ? `${v.label}, ${v.hint}` : v.label}
                >
                  <span className="flex flex-col items-start leading-5">
                    <span className="font-semibold">{v.label}</span>
                    {v.hint && (
                      <span className="text-xs tabular-nums opacity-80">
                        {v.hint}
                      </span>
                    )}
                  </span>
                  <SelectedIcon
                    aria-hidden
                    className="absolute -end-1 -top-1 hidden size-4.5 rounded-full bg-surface text-accent group-data-[selected=true]:block"
                    weight="Filled"
                  />
                </Tag>
              ))}
            </TagGroup.List>
            {blocked.map(v => (
              <Description key={v.id}>
                {v.label}: {reasons[v.id]}
              </Description>
            ))}
          </TagGroup>
        )
      })}
      {variant.error && (
        <p data-visible className="field-error" role="alert">
          {variant.error}
        </p>
      )}
    </div>
  )
}

/**
 * The preview's choices, in a panel that sits at the bottom of the phone instead of a portalled sheet (which would
 * open over the whole window, outside the mockup). Zero height and sticky, so it stays at the foot of the screen
 * whatever the page scrolls to; the panel grows upwards from there.
 */
function PreviewSheet({ sheet, variant, onClose }: { sheet: GiftPageProps['sheet'], variant: GiftPageProps['variant'], onClose: () => void }) {
  return (
    <div className="sticky bottom-0 z-40 h-0">
      <section
        aria-label={sheet.title}
        className="absolute inset-x-0 bottom-0 flex max-h-[520px] flex-col gap-5 overflow-y-auto rounded-t-3xl bg-background px-6 pt-5 pb-6 shadow-[0_-8px_32px_rgb(0_0_0/0.18)]"
      >
        <h2 className="font-serif text-title">{sheet.title}</h2>
        <VariantChoices variant={variant} />
        <Button fullWidth variant="secondary" onPress={onClose}>
          {sheet.closeLabel}
        </Button>
      </section>
    </div>
  )
}
