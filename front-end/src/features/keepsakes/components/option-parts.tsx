import type { Media, ProductOption } from '@sk/api-contract'

import { Label, Tag, TagGroup } from '@heroui/react'

import { SelectedIcon, StatusDangerIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { labelOf, shortLabel } from '../lib/option-rules'
import { KeepsakePhoto } from './keepsake-photo'

/** The app's selected option (as the story editor's tags): a red border and the mark. */
const ACCENT_TAG = 'group relative h-auto min-h-11 items-center justify-start gap-2 rounded-2xl border-2 border-transparent px-3 py-2 before:hidden data-[selected=true]:border-accent data-[selected=true]:bg-default data-[selected=true]:hover:bg-default-hover'

/** A colour dot. The colour is data (`product_option_values.swatch`), so it is set at runtime. */
export function Swatch({ color, className = 'size-4' }: { color: string | null, className?: string }) {
  return color ? <span aria-hidden className={`inline-block shrink-0 rounded-full border border-separator ${className}`} style={{ backgroundColor: color }} /> : null
}

/** A refusal at its control: the danger-soft alert with an icon. */
export function RefusalAlert({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-danger-soft p-3 text-sm text-pretty text-danger-soft-foreground" role="alert">
      <StatusDangerIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
      <span>{children}</span>
    </p>
  )
}

/**
 * One value of one option as chips in the app's selected style. A value with no name yet is left out: its chip would be
 * an empty capsule (the options sheet adds one empty value to a new option).
 */
export function ValueChips({ option, value, onChange, small = false, hideLabel = false }: {
  option: Pick<ProductOption, 'name' | 'values'>
  value: string | undefined
  onChange: (valueId: string) => void
  small?: boolean
  hideLabel?: boolean
}) {
  const { language } = useLocale()
  const name = labelOf(option.name, language)

  return (
    <TagGroup
      aria-label={name}
      selectedKeys={value ? new Set([value]) : new Set()}
      selectionMode="single"
      size="lg"
      onSelectionChange={(keys) => {
        const [first] = keys === 'all' ? [] : Array.from(keys, String)

        if (first)
          onChange(first)
      }}
    >
      <Label className={hideLabel ? 'sr-only' : 'text-sm font-medium'}>{name}</Label>
      <TagGroup.List className="flex flex-wrap gap-2">
        {option.values.filter(v => labelOf(v.label)).map(v => (
          <Tag key={v.id} className={`${ACCENT_TAG} ${small ? 'min-h-10 px-2.5 py-1.5 text-sm' : ''}`} id={v.id} textValue={labelOf(v.label, language)}>
            <Swatch color={v.swatch} />
            <span className="font-medium">{labelOf(v.label, language)}</span>
            <SelectedIcon aria-hidden className="absolute -end-1 -top-1 hidden size-4.5 rounded-full bg-surface text-accent group-data-[selected=true]:block" weight="Filled" />
          </Tag>
        ))}
      </TagGroup.List>
    </TagGroup>
  )
}

/** A value as a small badge (the details of a variant). */
export function ValueBadge({ option, valueId }: { option: ProductOption, valueId: string | undefined }) {
  const { t, language } = useLocale()
  const value = option.values.find(v => v.id === valueId)

  return value
    ? (
        <span className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-default px-2.5 text-xs font-medium">
          <Swatch className="size-3" color={value.swatch} />
          <span className="truncate">{shortLabel(value.label, language)}</span>
        </span>
      )
    : <span className="text-xs text-danger">{t('keepsakes.variant.missing')}</span>
}

/** The keepsake's cover with the variant's colour on its corner, if the keepsake has a colour option. */
export function VariantThumb({ cover, options, values }: { cover: Media | undefined, options: ProductOption[], values: Record<string, string> }) {
  const colour = options.find(option => option.values.some(value => value.swatch))
  const swatch = colour?.values.find(value => value.id === values[colour.id])?.swatch ?? null

  return (
    <KeepsakePhoto className="size-11 shrink-0 rounded-xl" media={cover} width={160}>
      {swatch && <Swatch className="absolute end-0.5 bottom-0.5 size-3.5 border-2 border-surface" color={swatch} />}
    </KeepsakePhoto>
  )
}
