import type { PickupDateFieldProps } from "./pickup-date-field";
import type { ListingReviewsProps } from "@/components/listings/listing-reviews";
import type { SellerRowProps } from "./seller-row";
import type { StoryView } from "./story-sheet";
import type { IconComponent } from "@/components/icons";
import type { PhotoGalleryLabels } from "@/components/photo-gallery";
import type { Key } from "@heroui/react";

import {
  Accordion,
  Button,
  Description,
  FieldError,
  InputGroup,
  Label,
  Radio,
  RadioGroup,
  Tag,
  TagGroup,
  TextField,
  buttonVariants,
} from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { PickupDateField } from "./pickup-date-field";
import { SellerRow } from "./seller-row";
import { StorySheet } from "./story-sheet";

import { ChoiceSheet } from "@/components/choice-sheet";
import {
  EngraveIcon,
  InfoIcon,
  PayLaterIcon,
  PickupIcon,
  SelectedIcon,
  StatusSuccessIcon,
} from "@/components/icons";
import {
  BackButton,
  CartButton,
  CompactBar,
} from "@/components/layout/cart-button";
import { flyToCart } from "@/components/fly-to-cart";
import {
  ListingDetailHeader,
  ListingFavouriteButton,
} from "@/components/listings/listing-detail-header";
import { ListingReviews } from "@/components/listings/listing-reviews";
import { Media } from "@/components/media";
import { PhotoGallery } from "@/components/photo-gallery";
import { QuantityStepper } from "@/components/quantity-stepper";
import { StatusChip } from "@/components/status-chip";
import { useScrolledPast } from "@/hooks/use-scrolled-past";
import { photoUrl } from "@/lib/photos";
import { firstPhoto, openingText } from "@/lib/rich-text";

type Stat = { value: string; label: string };

export interface GiftDetailProps {
  name: string;
  photos: string[];
  galleryLabels: PhotoGalleryLabels;
  /** Muted line under the title: category, then the option names, joined by " · ". */
  subtitle: string;
  story: string;
  /** The long, illustrated story behind the gift, when it has one. */
  longStory?: StoryView & { readLabel: string; closeLabel: string };
  /** Shown when the product text is only in the other language (R02, AC30). */
  languageNotice?: string;
  stats: {
    /** Earliest pickup, or "Sold out". */
    pickup: Stat;
    /** Average rating, or "New" when there are no reviews yet. */
    rating: Stat;
    ratingValue: number;
    hasRating: boolean;
    reviews: Stat;
  };
  seller: SellerRowProps;
  highlights: {
    icon: "engrave" | "pickup" | "pay";
    title: string;
    body: string;
  }[];
  favourite: { isSaved: boolean; onToggle: () => void; label: string };
  soldOut?: {
    label: string;
    message: string;
    actionLabel: string;
    subcategory?: string;
  };
  sheet: { title: string; closeLabel: string; addLabel: string };
  variant: {
    label: string;
    /** `reason` set = cannot be chosen (sold out or not on sale), shown in words. */
    options: { id: string; label: string; price: string; reason?: string }[];
    value: string | null;
    onChange: (id: string) => void;
    error?: string;
  };
  quantity: {
    label: string;
    value: number;
    max: number;
    /** "4 available". */
    hint?: string;
    onChange: (value: number) => void;
  };
  engraving?: {
    label: string;
    description: string;
    maxLength: number;
    counterLabel: string;
    value: string;
    onChange: (value: string) => void;
  };
  date: PickupDateFieldProps;
  /** "This is the date you request. The seller confirms before you pay." */
  note: string;
  place: {
    label: string;
    options: { id: string; name: string; address: string; hours: string }[];
    value: string | null;
    onChange: (id: string) => void;
    error?: string;
  };
  sections: {
    aboutTitle: string;
    placesTitle: string;
    /** "Pickup date" row: earliest date, or the chosen date and place. */
    dateRow: { title: string; value: string; action: string };
    paymentTitle: string;
    payment: string;
    cancellationTitle: string;
    cancellation: string;
    cancellationNote?: string;
  };
  reviews: ListingReviewsProps;
  bar: {
    price: string;
    /** Chosen date and place, or a prompt to choose them. */
    summary: string;
    chip: string;
    addLabel: string;
    /** Set right after adding; the bar then also offers "View cart". */
    addedLabel?: string;
    viewCartLabel: string;
  };
  /** Adds the line; false when a choice is missing (errors are then shown in the sheet). */
  onAdd: () => boolean;
  /** Called when the sheet opens: clears the "added" confirmation. */
  onSheetOpen: () => void;
  backLabel: string;
  onBack: () => void;
}

const highlightIcon: Record<
  GiftDetailProps["highlights"][number]["icon"],
  IconComponent
> = {
  engrave: EngraveIcon,
  pickup: PickupIcon,
  pay: PayLaterIcon,
};

/**
 * C03 Gift detail in the order of the Airbnb listing page (owner references, Airbnb iOS
 * Jun 2025, screens 36, 38, 42, 45): photos; title; stats row with the laurel badge;
 * seller; highlights; translation notice; About; reviews (laurel rating, swipeable
 * cards, "Show all" opens the reviews sheet); where to pick it up; then the things to know
 * (pickup date row, cancellation policy, payment). Every choice is made in a bottom
 * sheet opened from the sticky price bar or the pickup date row.
 */
export function GiftDetail(props: GiftDetailProps) {
  const {
    name,
    photos,
    galleryLabels,
    subtitle,
    story,
    longStory,
    languageNotice,
    stats,
    seller,
    highlights,
    favourite,
    soldOut,
    place,
    sections,
    reviews,
    bar,
    backLabel,
    onBack,
    onSheetOpen,
  } = props;
  const [photoEnd, scrolledPast] = useScrolledPast<HTMLDivElement>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);

  const openSheet = () => {
    onSheetOpen();
    setSheetOpen(true);
  };

  const heart = (tone: "pill" | "bar") => (
    <ListingFavouriteButton favourite={favourite} tone={tone} />
  );

  return (
    <div className="flex flex-1 flex-col">
      <CompactBar
        leading={<BackButton label={backLabel} onPress={onBack} />}
        visible={scrolledPast}
      >
        <span className="flex-1" />
        {heart("bar")}
        <CartButton tone="bar" />
      </CompactBar>

      <PhotoGallery
        className="aspect-[4/3.4]"
        labels={galleryLabels}
        photos={photos}
      >
        <div className="pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+12px)] z-10 flex items-center gap-2 [&>*]:pointer-events-auto">
          <BackButton label={backLabel} tone="pill" onPress={onBack} />
          <span className="flex-1" />
          {heart("pill")}
          <CartButton tone="pill" />
        </div>
      </PhotoGallery>
      <div ref={photoEnd} aria-hidden className="h-px" />

      <div className="relative -mt-6 flex flex-1 flex-col rounded-t-3xl bg-background px-6 pt-7 pb-4">
        {/* 1. Title (screen 36) */}
        <ListingDetailHeader
          name={name}
          stats={{ ...stats, primary: stats.pickup }}
          subtitle={subtitle}
        />

        {/* 3. Seller: Airbnb host row; contacts in a small sheet (Lab option B) */}
        <section className="py-5">
          <SellerRow {...seller} />
        </section>

        {/* 4. Highlights (screen 38) */}
        <ul className="flex flex-col gap-5 border-t border-separator py-7">
          {highlights.map((h) => {
            const Icon = highlightIcon[h.icon];

            return (
              <li key={h.icon} className="flex gap-4">
                <Icon aria-hidden className="mt-0.5 shrink-0" size={26} />
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">{h.title}</span>
                  <span className="text-sm text-muted">{h.body}</span>
                </div>
              </li>
            );
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
          className={`flex flex-col gap-3 py-7 ${languageNotice ? "" : "border-t border-separator"}`}
        >
          <h2 className="font-serif text-title">{sections.aboutTitle}</h2>
          <p className="text-body">{story}</p>
          {longStory && (
            <>
              {/* Story teaser: first chapter's photo and opening, the rest in a sheet. */}
              <button
                className="mt-2 flex flex-col gap-3 rounded-3xl text-start outline-none focus-visible:focus-ring"
                type="button"
                onClick={() => setStoryOpen(true)}
              >
                <Media
                  alt=""
                  className="aspect-[16/9] w-full rounded-3xl"
                  photo={firstPhoto(longStory.body)}
                />
                <span className="text-label tracking-wide text-muted uppercase">
                  {longStory.label}
                </span>
                <span className="font-serif text-title text-balance">
                  {longStory.title}
                </span>
                <span className="line-clamp-3 text-body text-muted">
                  {openingText(longStory.body)}
                </span>
              </button>
              <Button
                fullWidth
                className="mt-1"
                size="lg"
                variant="secondary"
                onPress={() => setStoryOpen(true)}
              >
                {longStory.readLabel}
              </Button>
              <StorySheet
                closeLabel={longStory.closeLabel}
                isOpen={storyOpen}
                story={longStory}
                onOpenChange={setStoryOpen}
              />
            </>
          )}
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
                  {place.options.map((p) => (
                    <li key={p.id} className="flex flex-col">
                      <span className="font-semibold text-foreground">
                        {p.name}
                      </span>
                      <span className="text-sm">{p.address}</span>
                      <span className="text-sm">{p.hours}</span>
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
                  <span className="flex flex-1 flex-col items-start gap-0.5 text-start">
                    <span className="font-serif text-card-title">
                      {sections.dateRow.title}
                    </span>
                    <span className="text-sm font-normal text-muted">
                      {sections.dateRow.value}
                    </span>
                  </span>
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className="flex flex-col items-start gap-3">
                  <p className="text-sm">{props.note}</p>
                  <Button size="sm" variant="secondary" onPress={openSheet}>
                    {sections.dateRow.action}
                  </Button>
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
        {soldOut ? (
          <>
            <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
              <StatusChip tone="neutral">{soldOut.label}</StatusChip>
              <span className="text-xs text-muted">{soldOut.message}</span>
            </div>
            <Link
              className={buttonVariants({ size: "lg", variant: "secondary" })}
              search={
                soldOut.subcategory ? { subcategory: soldOut.subcategory } : {}
              }
              to="/gifts"
            >
              {soldOut.actionLabel}
            </Link>
          </>
        ) : (
          <>
            <div
              aria-live="polite"
              className="flex min-w-0 flex-1 flex-col items-start"
            >
              {bar.addedLabel ? (
                <>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
                    <StatusSuccessIcon aria-hidden size={18} />
                    {bar.addedLabel}
                  </span>
                  <Link
                    className="rounded text-sm font-semibold underline underline-offset-4 outline-none focus-visible:focus-ring"
                    to="/cart"
                  >
                    {bar.viewCartLabel}
                  </Link>
                </>
              ) : (
                <>
                  <span className="text-lg font-semibold underline underline-offset-4 tabular-nums">
                    {bar.price}
                  </span>
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
            {/* Stays available after adding, for another engraving, date or quantity. */}
            <Button size="lg" onPress={openSheet}>
              {bar.addLabel}
            </Button>
          </>
        )}
      </div>

      {!soldOut && (
        <GiftSheet {...props} isOpen={sheetOpen} onOpenChange={setSheetOpen} />
      )}
    </div>
  );
}

/** Add-to-cart sheet: option, quantity, engraving, pickup date and place. */
function GiftSheet({
  sheet,
  photos,
  variant,
  quantity,
  engraving,
  date,
  note,
  place,
  onAdd,
  isOpen,
  onOpenChange,
}: GiftDetailProps & {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const onVariant = (keys: "all" | Set<Key>) => {
    const [first] = keys === "all" ? [] : [...keys];

    if (first !== undefined) variant.onChange(String(first));
  };
  const blocked = variant.options.filter((o) => o.reason);

  return (
    <ChoiceSheet
      action={{
        label: sheet.addLabel,
        onPress: (e) => {
          if (!onAdd()) return;
          // Read the button's place before the sheet starts closing.
          flyToCart(e.target, photoUrl(photos[0]));
          onOpenChange(false);
        },
      }}
      closeLabel={sheet.closeLabel}
      isOpen={isOpen}
      title={sheet.title}
      onOpenChange={onOpenChange}
    >
      {variant.options.length > 1 && (
        <TagGroup
          disabledKeys={blocked.map((o) => o.id)}
          id="gift-variant"
          selectedKeys={variant.value ? new Set([variant.value]) : new Set()}
          selectionMode="single"
          size="lg"
          onSelectionChange={onVariant}
        >
          <Label className="text-heading">{variant.label}</Label>
          {/* Option cards: name over price, three to a row. Chosen = red border and a
              check on the top edge, clear of long names (owner, round 3); the fill stays. */}
          <TagGroup.List className="grid grid-cols-3 gap-2 pt-2">
            {variant.options.map((o) => (
              <Tag
                key={o.id}
                className={`group relative h-auto items-start justify-start rounded-2xl border-2 border-transparent px-2.5 py-2 before:hidden data-[selected=true]:border-accent data-[selected=true]:bg-default data-[selected=true]:hover:bg-default-hover ${o.reason ? "line-through" : ""}`}
                id={o.id}
                textValue={`${o.label}, ${o.price}`}
              >
                <span className="flex flex-col items-start leading-5">
                  <span className="font-semibold">{o.label}</span>
                  <span className="text-xs tabular-nums opacity-80">
                    {o.price}
                  </span>
                </span>
                <SelectedIcon
                  aria-hidden
                  className="absolute -end-1 -top-1 hidden size-4.5 rounded-full bg-surface text-accent group-data-[selected=true]:block"
                  weight="Filled"
                />
              </Tag>
            ))}
          </TagGroup.List>
          {blocked.map((o) => (
            <Description key={o.id}>
              {o.label}: {o.reason}
            </Description>
          ))}
          {variant.error && (
            <p data-visible className="field-error" role="alert">
              {variant.error}
            </p>
          )}
        </TagGroup>
      )}

      <QuantityStepper
        hint={quantity.hint}
        label={quantity.label}
        max={quantity.max}
        value={quantity.value}
        onChange={quantity.onChange}
      />

      {engraving && (
        <TextField
          fullWidth
          maxLength={engraving.maxLength}
          value={engraving.value}
          onChange={engraving.onChange}
        >
          <Label className="text-heading">{engraving.label}</Label>
          <InputGroup>
            <InputGroup.Input />
            <InputGroup.Suffix
              aria-hidden
              className="text-xs text-muted tabular-nums"
            >
              {engraving.value.length}/{engraving.maxLength}
            </InputGroup.Suffix>
          </InputGroup>
          {/* The counter reaches screen readers through the field's description. */}
          <Description>
            {engraving.description}
            <span className="sr-only"> {engraving.counterLabel}</span>
          </Description>
        </TextField>
      )}

      <PickupDateField {...date} />

      {/* No "*": every sheet field is needed except engraving, which says
          "(optional)" (TextField card). Missing choices show an error on add. */}
      <RadioGroup
        id="gift-place"
        isInvalid={place.error !== undefined}
        value={place.value}
        onChange={place.onChange}
      >
        <Label className="text-heading">{place.label}</Label>
        {place.options.map((p) => (
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
        <FieldError>{place.error}</FieldError>
      </RadioGroup>

      <p className="flex items-start gap-2 text-sm">
        <InfoIcon
          aria-hidden
          className="mt-0.5 shrink-0 text-muted"
          size={16}
        />
        {note}
      </p>
    </ChoiceSheet>
  );
}
