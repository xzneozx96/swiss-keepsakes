import type { Product } from '@sk/domain/catalog'
import type { StepView } from './step-shell'
import type { Language } from '@/contexts/locale-context'

import type { GiftStep } from '@/features/merchant/products/lib/search-params'
import {
  Button,
  Checkbox,
  CheckboxGroup,
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
  NumberField,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TextField,
} from '@heroui/react'
import { earliestPickupDate, languageStatus, storyText, zurichDate } from '@sk/domain/catalog'

import { firstPhoto, formatMoney, formatShortDate, isEmptyDoc, numberFormat, pickText } from '@sk/domain/shared'

import { Link } from '@tanstack/react-router'
import { useRef } from 'react'

import {
  ClockIcon,
  ContentIcon,
  EngraveIcon,
  OptionIcon,
  PartnersIcon,
  PayLaterIcon,
  PhotoAddIcon,
  PickupIcon,
  PlusIcon,
} from '@/components/icons'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { usePickupPlaces, useStoreSubcategories } from '@/features/catalog/api/queries'
import { categories } from '@/features/catalog/categories'
import { useDemoNow } from '@/features/demo'
import { DetailCard } from '@/features/merchant/order-detail/components/detail-card'
import {
  GIFT_STEPS,

} from '@/features/merchant/products/lib/search-params'
import { useGiftEditor } from '../hooks/use-gift-editor'
import {
  EditorHeader,
  LocalizedField,
  useFocusFirstInvalid,
} from './editor-parts'
import { PhotoField } from './photo-field'
import {
  ArchivedNotice,
  ReviewOverview,
  ReviewRow,
  ReviewSection,
  StepBar,
  StepBody,
  StepLayout,
  useStepBar,
} from './step-shell'
import { StoryCard } from './story-card'

/** Same choice card as M08 and the M04 sheets: ink frame when selected. */
const choiceCard
  = 'rounded-2xl border border-separator p-3 data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground'

/** A whole-number field (days, hours, units) in the M08 field style. */
function CountField({
  label,
  value,
  onChange,
  min,
  max,
  error,
  description,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  error?: string
  description?: string
}) {
  return (
    <NumberField
      fullWidth
      formatOptions={{ maximumFractionDigits: 0 }}
      isInvalid={error !== undefined}
      maxValue={max}
      minValue={min}
      value={value}
      onChange={onChange}
    >
      <Label>{label}</Label>
      <NumberField.Group>
        <NumberField.Input className="tabular-nums" />
      </NumberField.Group>
      {description && <Description>{description}</Description>}
      <FieldError>{error}</FieldError>
    </NumberField>
  )
}

type Editor = ReturnType<typeof useGiftEditor>

/** Step 1, in the step's language: the name and the short story (C02, C03). */
function BasicsTextCard({
  editor,
  language,
}: {
  editor: Editor
  language: Language
}) {
  const { t } = useLocale()
  const { draft, change } = editor

  return (
    <DetailCard icon={ContentIcon} title={t('products.basics.text')}>
      <LocalizedField
        error={
          editor.textError('name', language, draft.name) ?? editor.errors.name
        }
        label={t('products.field.name')}
        language={language}
        value={draft.name}
        onChange={name => change({ name })}
      />
      <LocalizedField
        error={editor.textError('story', language, draft.story)}
        label={t('products.field.story')}
        language={language}
        rows={4}
        value={draft.story}
        onChange={story => change({ story })}
      />
    </DetailCard>
  )
}

/**
 * Step 2: per option its name in the step's language, price, stock on hand and "for sale";
 * held units set the lowest stock. "Add option" adds one with a new id (old orders keep
 * theirs).
 */
function OptionsCard({
  editor,
  language,
}: {
  editor: Editor
  language: Language
}) {
  const { t } = useLocale()
  const { draft, changeVariant, held } = editor

  return (
    <DetailCard icon={OptionIcon} title={t('products.stock.title')}>
      <p className="text-sm text-pretty text-muted">
        {t('products.stock.intro')}
      </p>
      <ul className="flex flex-col divide-y divide-separator">
        {draft.variants.map((v, index) => {
          const name
            = pickText(v.label, language).text
              || t('products.field.option', { n: index + 1 })
          const errors = editor.variantErrors(v.id)
          const nameError = editor.textError('options', language, v.label)
          const available = Math.max(
            0,
            (Number.isFinite(v.stock) ? v.stock : 0) - held[v.id],
          )

          return (
            <li
              key={v.id}
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="min-w-0 font-medium break-words">{name}</h3>
                <Switch
                  className="shrink-0"
                  isSelected={v.forSale}
                  onChange={forSale => changeVariant(v.id, { forSale })}
                >
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    {t('products.stock.forSale')}
                    <span className="sr-only">: {name}</span>
                  </Switch.Content>
                </Switch>
              </div>
              <TextField
                fullWidth
                isInvalid={nameError !== undefined}
                value={v.label[language] ?? ''}
                onChange={text =>
                  changeVariant(v.id, {
                    label: { ...v.label, [language]: text },
                  })}
              >
                <Label>
                  {t(`products.stock.name.${language}`)}
                  <span className="sr-only">: {name}</span>
                </Label>
                <Input />
                <FieldError>{nameError}</FieldError>
              </TextField>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  fullWidth
                  formatOptions={{ style: 'currency', currency: 'CHF' }}
                  isInvalid={errors.price !== undefined}
                  minValue={0}
                  value={v.price}
                  onChange={price => changeVariant(v.id, { price })}
                >
                  <Label>
                    {t('products.stock.price')}
                    <span className="sr-only">: {name}</span>
                  </Label>
                  <NumberField.Group>
                    <NumberField.Input className="tabular-nums" />
                  </NumberField.Group>
                  <FieldError>{errors.price}</FieldError>
                </NumberField>
                <NumberField
                  fullWidth
                  formatOptions={{ maximumFractionDigits: 0 }}
                  isInvalid={errors.stock !== undefined}
                  maxValue={9999}
                  minValue={0}
                  value={v.stock}
                  onChange={stock => changeVariant(v.id, { stock })}
                >
                  <Label>
                    {t('products.stock.onHand')}
                    <span className="sr-only">: {name}</span>
                  </Label>
                  <NumberField.Group>
                    <NumberField.Input className="tabular-nums" />
                  </NumberField.Group>
                  <FieldError>{errors.stock}</FieldError>
                </NumberField>
              </div>
              <p className="text-xs text-pretty text-muted">
                {v.forSale
                  ? t('products.stock.held', { held: held[v.id], available })
                  : t('products.stock.notForSale')}
              </p>
            </li>
          )
        })}
      </ul>
      <Button
        className="w-fit"
        data-error-focus={editor.errors.options ? 'true' : undefined}
        size="sm"
        variant="tertiary"
        onPress={editor.addVariant}
      >
        <PlusIcon aria-hidden size={16} />
        {t('products.stock.add')}
      </Button>
      {editor.errors.options && (
        <p data-visible className="field-error" role="alert">
          {editor.errors.options}
        </p>
      )}
    </DetailCard>
  )
}

/** Step 4, in the step's language: the cancellation policy guests read on C03 and in orders. */
function CancellationCard({
  editor,
  language,
}: {
  editor: Editor
  language: Language
}) {
  const { t } = useLocale()
  const { draft, change } = editor

  return (
    <DetailCard icon={ContentIcon} title={t('products.field.cancellation')}>
      <LocalizedField
        error={editor.textError(
          'cancellation',
          language,
          draft.cancellationPolicy,
        )}
        label={t('products.field.cancellation')}
        language={language}
        rows={4}
        value={draft.cancellationPolicy}
        onChange={cancellationPolicy => change({ cancellationPolicy })}
      />
    </DetailCard>
  )
}

/** The main photo (lists, home, gallery) and the category C02 files the gift under. */
function PhotoCard({ editor }: { editor: Editor }) {
  const { t, language } = useLocale()
  const { draft, change, errors } = editor
  const subcategories = useStoreSubcategories(list =>
    list.filter(c => c.categoryId === 'keepsakes'),
  )

  return (
    <DetailCard
      icon={PhotoAddIcon}
      id="main-photo"
      title={t('products.photo.titleGift')}
    >
      <PhotoField
        error={errors.photo}
        help={t('products.photo.help.gift')}
        label={t('products.photo.label')}
        value={draft.photo}
        onChange={photo => change({ photo })}
      />
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="text-muted">{t('products.category.label')}</span>
        <span className="font-medium">
          {pickText(categories[0].name, language).text}
        </span>
      </div>
      <Select
        fullWidth
        isInvalid={!!errors.category}
        placeholder={t('products.subcategory.placeholder')}
        selectedKey={draft.subcategoryId}
        onSelectionChange={key =>
          key !== null && change({ subcategoryId: String(key) })}
      >
        <Label>{t('products.subcategory.label')}</Label>
        <Select.Trigger data-error-focus={errors.category ? 'true' : undefined}>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <FieldError>{errors.category}</FieldError>
        {!subcategories.length && (
          <Description>
            {t('products.subcategory.none')}
          </Description>
        )}
        <Select.Popover>
          <ListBox>
            {subcategories.map(c => (
              <ListBox.Item
                key={c.id}
                id={c.id}
                textValue={pickText(c.name, language).text}
              >
                {pickText(c.name, language).text}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </DetailCard>
  )
}

function EngravingCard({ editor }: { editor: Editor }) {
  const { t } = useLocale()
  const { draft, change, errors } = editor

  return (
    <DetailCard icon={EngraveIcon} title={t('products.engraving.title')}>
      <Switch
        isSelected={draft.engraving}
        onChange={engraving => change({ engraving })}
      >
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          {t('products.engraving.switch')}
        </Switch.Content>
        {!draft.engraving && (
          <Description>{t('products.engraving.off')}</Description>
        )}
      </Switch>
      {draft.engraving && (
        <CountField
          description={t('products.engraving.help')}
          error={errors.engravingMax}
          label={t('products.engraving.max')}
          max={40}
          min={1}
          value={draft.engravingMax}
          onChange={engravingMax => change({ engravingMax })}
        />
      )}
    </DetailCard>
  )
}

/** Preparation days and how they count, with the earliest pickup C03 would offer today. */
function PreparationCard({ editor }: { editor: Editor }) {
  const { t, intlLocale } = useLocale()
  const now = useDemoNow()
  const { draft, change, errors } = editor
  const days = draft.preparationDays
  const earliest
    = Number.isInteger(days) && days >= 0 && days <= 30
      ? earliestPickupDate(days, draft.dayMode, now)
      : undefined

  return (
    <DetailCard icon={ClockIcon} title={t('products.prep.title')}>
      <CountField
        description={
          earliest
            ? t('products.prep.preview', {
                date: formatShortDate(earliest, zurichDate(now), intlLocale),
              })
            : undefined
        }
        error={errors.preparationDays}
        label={t('products.prep.days')}
        max={30}
        min={0}
        value={days}
        onChange={preparationDays => change({ preparationDays })}
      />
      <RadioGroup
        value={draft.dayMode}
        onChange={v => change({ dayMode: v as typeof draft.dayMode })}
      >
        <Label>{t('products.prep.mode')}</Label>
        <Radio className={choiceCard} value="working-days">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            <span className="flex flex-col">
              {t('products.prep.working')}
              <span className="text-xs text-muted">
                {t('products.prep.workingHelp')}
              </span>
            </span>
          </Radio.Content>
        </Radio>
        <Radio className={choiceCard} value="calendar-days">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            {t('products.prep.calendar')}
          </Radio.Content>
        </Radio>
      </RadioGroup>
    </DetailCard>
  )
}

function PlacesCard({ editor }: { editor: Editor }) {
  const { t, language } = useLocale()
  const pickupPlaces = usePickupPlaces()
  const { draft, change, errors } = editor

  return (
    <DetailCard icon={PickupIcon} title={t('products.places.title')}>
      <CheckboxGroup
        isInvalid={errors.places !== undefined}
        value={draft.placeIds}
        onChange={placeIds => change({ placeIds })}
      >
        <Label>{t('products.places.label')}</Label>
        {pickupPlaces.map(place => (
          <Checkbox key={place.id} className={choiceCard} value={place.id}>
            <Checkbox.Content className="flex-row items-start gap-3">
              <Checkbox.Control className="mt-0.5 size-6 shrink-0 rounded-lg">
                <Checkbox.Indicator className="size-4 [&_[data-slot$=checkmark]]:size-4" />
              </Checkbox.Control>
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">
                  {pickText(place.name, language).text}
                </span>
                <span className="text-xs text-muted">
                  {place.address} ·{' '}
                  {pickText(place.openingHours, language).text}
                </span>
              </span>
            </Checkbox.Content>
          </Checkbox>
        ))}
        <FieldError>{errors.places}</FieldError>
      </CheckboxGroup>
      <Link
        className="w-fit rounded-lg text-sm font-medium underline underline-offset-4 outline-none focus-visible:focus-ring"
        to="/store/products/pickup"
      >
        {t('products.places.edit')}
      </Link>
    </DetailCard>
  )
}

/** R05: the first-payment deadline is set per gift; the order stores the exact time. */
function PaymentCard({ editor }: { editor: Editor }) {
  const { t } = useLocale()
  const { draft, change, errors } = editor
  const kinds = ['full', 'deposit', 'later'] as const

  return (
    <DetailCard icon={PayLaterIcon} title={t('products.payment.title')}>
      <RadioGroup
        value={draft.paymentKind}
        onChange={v => change({ paymentKind: v as typeof draft.paymentKind })}
      >
        <Label>{t('products.payment.kind')}</Label>
        {kinds.map(kind => (
          <Radio key={kind} className={choiceCard} value={kind}>
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {t(`products.payment.${kind}`)}
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
      {draft.paymentKind === 'deposit' && (
        <CountField
          error={errors.depositPercent}
          label={t('products.payment.depositPercent')}
          max={99}
          min={1}
          value={draft.depositPercent}
          onChange={depositPercent => change({ depositPercent })}
        />
      )}
      {draft.paymentKind !== 'later' && (
        <CountField
          description={t('products.payment.firstDueHelp')}
          error={errors.firstDueHours}
          label={t('products.payment.firstDue')}
          max={168}
          min={1}
          value={draft.firstDueHours}
          onChange={firstDueHours => change({ firstDueHours })}
        />
      )}
      {draft.paymentKind === 'deposit' && (
        <CountField
          error={errors.balanceDays}
          label={t('products.payment.balanceDays')}
          max={60}
          min={0}
          value={draft.balanceDays}
          onChange={balanceDays => change({ balanceDays })}
        />
      )}
      {draft.paymentKind === 'later' && (
        <CountField
          error={errors.laterDays}
          label={t('products.payment.laterDays')}
          max={60}
          min={0}
          value={draft.laterDays}
          onChange={laterDays => change({ laterDays })}
        />
      )}
    </DetailCard>
  )
}

/** Commission for referral partners (AC09); orders snapshot the rate (O08). */
export function CommissionCard({
  value,
  onChange,
  error,
}: {
  value: number
  onChange: (value: number) => void
  error?: string
}) {
  const { t } = useLocale()
  const step
    = 'size-12 shrink-0 rounded-full border-0 bg-surface-secondary text-foreground disabled:opacity-30 data-[pressed=true]:scale-95'

  return (
    <DetailCard icon={PartnersIcon} title={t('products.commission.title')}>
      <NumberField
        aria-label={t('products.commission.rate')}
        className="items-center gap-2"
        formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
        isInvalid={error !== undefined}
        maxValue={50}
        minValue={0}
        step={1}
        value={Math.round(value * 100)}
        onChange={(points) => {
          if (!Number.isNaN(points))
            onChange(points / 100)
        }}
      >
        <NumberField.Group className="flex h-auto items-center gap-4 overflow-visible border-0 bg-transparent shadow-none">
          <NumberField.DecrementButton className={step} />
          <NumberField.Input
            className="w-28 bg-transparent p-0 text-center text-5xl leading-none font-semibold tabular-nums shadow-none"
            inputMode="numeric"
          />
          <NumberField.IncrementButton className={step} />
        </NumberField.Group>
        <Description className="text-center">
          {t('products.commission.help')}
        </Description>
        <FieldError>{error}</FieldError>
      </NumberField>
    </DetailCard>
  )
}

/** Step 6: every step's facts and what it still needs, with "Edit"; then publish or save. */
function GiftReview({ editor, steps }: { editor: Editor, steps: StepView[] }) {
  const { t, language, intlLocale } = useLocale()
  const subcategories = useStoreSubcategories()
  const pickupPlaces = usePickupPlaces()
  const { draft } = editor
  const pick = (text: Partial<Record<Language, string>>) =>
    pickText(text, language).text
  const money = (chf: number) =>
    Number.isFinite(chf) ? formatMoney(chf, intlLocale) : '–'
  const category = subcategories.find(c => c.id === draft.subcategoryId)
  const places = pickupPlaces.filter(p => draft.placeIds.includes(p.id))
  const storyLanguages = (['en', 'de'] as const).filter(
    l => draft.storyBody[l] && !isEmptyDoc(draft.storyBody[l]),
  )
  const none = t('products.review.none')
  const section = (id: GiftStep, rows: React.ReactNode) => {
    const index = GIFT_STEPS.indexOf(id)
    const step = steps[index]

    return (
      <ReviewSection
        key={id}
        index={index}
        issues={editor.issuesOf(id)}
        step={step}
        onEdit={() => editor.go(id)}
      >
        {rows}
      </ReviewSection>
    )
  }

  return (
    <>
      <ReviewOverview
        description={t(
          editor.archived
            ? 'products.review.archived.gift'
            : editor.live
              ? 'products.visibility.on.gift'
              : 'products.review.draft.gift',
        )}
        missing={editor.missing}
      />
      {section(
        'basics',
        <>
          <ReviewRow label={t('products.photo.label')}>
            {draft.photo
              ? (
                  <Media
                    alt=""
                    className="ms-auto size-12 rounded-lg"
                    photo={draft.photo}
                  />
                )
              : (
                  none
                )}
          </ReviewRow>
          <ReviewRow label={t('products.field.name')}>
            {pick(draft.name) || none}
          </ReviewRow>
          <ReviewRow label={t('products.category.label')}>
            {pick(categories[0].name)}
          </ReviewRow>
          <ReviewRow label={t('products.subcategory.label')}>
            {category ? pick(category.name) : none}
          </ReviewRow>
          <ReviewRow label={t('products.field.story')}>
            <span className="line-clamp-2">{pick(draft.story) || none}</span>
          </ReviewRow>
        </>,
      )}
      {section(
        'options',
        <>
          {draft.variants.map((v, i) => (
            <ReviewRow
              key={v.id}
              label={pick(v.label) || t('products.field.option', { n: i + 1 })}
            >
              {v.forSale
                ? t('products.review.option', {
                    price: money(v.price),
                    stock: Number.isFinite(v.stock) ? v.stock : 0,
                  })
                : t('products.review.notForSale')}
            </ReviewRow>
          ))}
          <ReviewRow label={t('products.engraving.title')}>
            {draft.engraving
              ? t('products.review.engraving', { max: draft.engravingMax })
              : t('products.review.noEngraving')}
          </ReviewRow>
        </>,
      )}
      {section(
        'pickup',
        <>
          <ReviewRow label={t('products.places.title')}>
            {places.map(p => pick(p.name)).join(', ') || none}
          </ReviewRow>
          <ReviewRow label={t('products.prep.days')}>
            {`${draft.preparationDays} · ${t(
              draft.dayMode === 'working-days'
                ? 'products.prep.working'
                : 'products.prep.calendar',
            )}`}
          </ReviewRow>
        </>,
      )}
      {section(
        'payment',
        <>
          <ReviewRow label={t('products.payment.kind')}>
            {t(`products.payment.${draft.paymentKind}`)}
          </ReviewRow>
          {draft.paymentKind !== 'later' && (
            <ReviewRow label={t('products.payment.firstDue')}>
              {draft.firstDueHours}
            </ReviewRow>
          )}
          <ReviewRow label={t('products.commission.rate')}>
            {numberFormat(intlLocale, {
              style: 'percent',
              maximumFractionDigits: 1,
            }).format(draft.commissionRate)}
          </ReviewRow>
          <ReviewRow label={t('products.field.cancellation')}>
            <span className="line-clamp-2">
              {pick(draft.cancellationPolicy) || none}
            </span>
          </ReviewRow>
        </>,
      )}
      {section(
        'story',
        <>
          <ReviewRow label={t('products.story.storyTitle')}>
            {pick(draft.storyTitle) || none}
          </ReviewRow>
          <ReviewRow label={t('products.review.storyIn')}>
            {storyLanguages.map(l => t(`products.lang.${l}`)).join(', ')
              || none}
          </ReviewRow>
          {firstPhoto(draft.storyBody[storyLanguages[0] ?? 'en']) && (
            <ReviewRow label={t('products.review.storyPhoto')}>
              <Media
                alt=""
                className="ms-auto size-12 rounded-lg"
                photo={firstPhoto(draft.storyBody[storyLanguages[0] ?? 'en'])}
              />
            </ReviewRow>
          )}
        </>,
      )}
    </>
  )
}

/**
 * M12 Edit gift as a stepper (owner, revision 2): Basics, Options & stock, Pickup &
 * preparation, Payment & policies, Story, Review & publish. Creating ("Add gift") walks the
 * steps with Back and Next, Next checking that step; editing opens any step and saves from
 * any step. Header, step list, the step (with its EN | DE switch when it has text), the bar.
 */
export function GiftEditor({
  product,
  step,
  onStep,
}: {
  product: Product | null
  step: GiftStep
  onStep: (step: GiftStep) => void
}) {
  const { t, language } = useLocale()
  const subcategories = useStoreSubcategories()
  const editor = useGiftEditor(product, step, onStep)
  const rootRef = useRef<HTMLDivElement>(null)
  const { draft, change } = editor

  useFocusFirstInvalid(rootRef, editor.focusCount)

  const category = subcategories.find(c => c.id === draft.subcategoryId)
  const steps: StepView[] = GIFT_STEPS.map(id => ({
    id,
    label: t(`products.step.${id}`),
    status: editor.statusOf(id),
    missing: editor.stepMissing(id),
  }))
  const current = steps[GIFT_STEPS.indexOf(step)]
  const storyErrors = (lang: Language) => {
    const error = editor.textError(
      'longStory',
      lang,
      storyText({ title: draft.storyTitle, body: draft.storyBody }),
    )

    return {
      title:
        editor.errors.storyTitle
        ?? (error && !draft.storyTitle[lang]?.trim() ? error : undefined),
      body:
        error && (!draft.storyBody[lang] || isEmptyDoc(draft.storyBody[lang]))
          ? error
          : undefined,
    }
  }
  const render = (lang: Language) => {
    switch (step) {
      case 'basics':
        return (
          <>
            <BasicsTextCard editor={editor} language={lang} />
            <PhotoCard editor={editor} />
          </>
        )
      case 'options':
        return (
          <>
            <OptionsCard editor={editor} language={lang} />
            <EngravingCard editor={editor} />
          </>
        )
      case 'pickup':
        return (
          <>
            <PlacesCard editor={editor} />
            <PreparationCard editor={editor} />
          </>
        )
      case 'payment':
        return (
          <>
            <PaymentCard editor={editor} />
            <CancellationCard editor={editor} language={lang} />
            <CommissionCard
              error={editor.errors.commission}
              value={draft.commissionRate}
              onChange={commissionRate => change({ commissionRate })}
            />
          </>
        )
      case 'story': {
        const errors = storyErrors(lang)

        return (
          <StoryCard
            body={draft.storyBody}
            bodyError={errors.body}
            kind="gift"
            language={lang}
            title={draft.storyTitle}
            titleError={errors.title}
            onBody={(l, doc) => editor.changeStory(l, doc)}
            onTitle={storyTitle => change({ storyTitle })}
          />
        )
      }
      case 'review':
        return <GiftReview editor={editor} steps={steps} />
    }
  }
  const bar = useStepBar({
    isNew: editor.isNew,
    isReview: step === 'review',
    isFirst: step === GIFT_STEPS[0],
    live: editor.live,
    archived: editor.archived,
    isDirty: editor.isDirty,
    hasErrors: editor.hasErrors,
    publishRefused: editor.publishRefused,
    storageFull: editor.storageFull,
    justSaved: editor.justSaved,
    isSaving: editor.isSaving,
    actions: editor,
  })

  return (
    <div ref={rootRef} className="flex min-w-0 flex-col gap-5 lg:gap-6">
      <EditorHeader
        archived={editor.archived}
        languages={languageStatus(editor.missing)}
        published={editor.live}
        subtitle={[
          t('products.kind.gift'),
          category && pickText(category.name, language).text,
        ]
          .filter(Boolean)
          .join(' · ')}
        tab="gifts"
        title={
          pickText(draft.name, language).text
          || (product
            ? pickText(product.name, language).text
            : t('products.new.gift'))
        }
      />
      {editor.archived && (
        <ArchivedNotice
          text={t('products.archivedNotice.gift')}
          onRestore={editor.restore}
        />
      )}
      <StepLayout
        canGo={id => editor.canGo(id as GiftStep)}
        current={step}
        steps={steps}
        onGo={id => onStep(id as GiftStep)}
      >
        <StepBody
          language={editor.language}
          render={render}
          step={current}
          onLanguage={editor.setLanguage}
        />
        <StepBar {...bar} />
      </StepLayout>
    </div>
  )
}
