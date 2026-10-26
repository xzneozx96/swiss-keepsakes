import type { TourSection, TourSectionItem } from '@sk/domain/bookings'

import { pickText, safeHref } from '@sk/domain/shared'
import { CallIcon, EmailIcon, InfoIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { formatCalendarDay } from '@/lib/shop-dates'

const BLANK_LINE = /\n{2,}/
const WHITESPACE = /\s/g

function Contact({
  contact,
}: {
  contact: NonNullable<TourSectionItem['contact']>
}) {
  const { t } = useLocale()
  const url = contact.url && safeHref(contact.url)
  const link
    = 'inline-flex min-h-8 items-center gap-1.5 rounded-lg text-sm font-medium underline underline-offset-4 outline-none focus-visible:focus-ring'

  return (
    <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
      {contact.address && (
        <span className="text-sm text-muted">{contact.address}</span>
      )}
      {contact.phone && (
        <a className={link} href={`tel:${contact.phone.replace(WHITESPACE, '')}`}>
          <CallIcon aria-hidden size={16} />
          {contact.phone}
        </a>
      )}
      {contact.email && (
        <a className={link} href={`mailto:${contact.email}`}>
          <EmailIcon aria-hidden size={16} />
          {contact.email}
        </a>
      )}
      {url && (
        <a className={link} href={url} rel="noreferrer" target="_blank">
          {t('tourDiscovery.sections.website')}
        </a>
      )}
    </span>
  )
}

function ItemBody({ item }: { item: TourSectionItem }) {
  const { t, language } = useLocale()
  const text = (value: TourSectionItem['text']) =>
    pickText(value, language).text

  return (
    <>
      <span>{text(item.text)}</span>
      {item.optional && (
        <span className="ms-2 rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-medium text-muted">
          {t('tourDiscovery.sections.optional')}
        </span>
      )}
      {item.detail && (
        <span className="mt-0.5 block text-sm text-muted">
          {text(item.detail)}
        </span>
      )}
      {item.contact && <Contact contact={item.contact} />}
    </>
  )
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(BLANK_LINE)
        .filter(p => p.trim())
        .map((p, index) => (
          <p key={index} className="text-body text-pretty">
            {p.trim()}
          </p>
        ))}
    </>
  )
}

function Items({ section }: { section: TourSection }) {
  const { language } = useLocale()
  const items = section.items ?? []

  if (!items.length)
    return null
  const label = (item: TourSectionItem) =>
    item.label ? pickText(item.label, language).text : ''

  switch (section.layout) {
    case 'facts':
      return (
        <dl className="flex flex-col gap-3 text-sm">
          {items.map(item => (
            <div key={item.id} className="flex justify-between gap-4">
              <dt className="max-w-[40%] shrink-0 text-muted">{label(item)}</dt>
              <dd className="min-w-0 flex-1 text-end">
                <ItemBody item={item} />
              </dd>
            </div>
          ))}
        </dl>
      )
    case 'timeline':
      return (
        <ol className="flex flex-col">
          {items.map((item, index) => (
            <li key={item.id} className="relative flex gap-4 pb-5 last:pb-0">
              {index < items.length - 1 && (
                <span
                  aria-hidden
                  className="absolute start-[7.3rem] top-3 -bottom-1 w-px bg-separator"
                />
              )}
              <span className="w-24 shrink-0 pt-0.5 text-sm font-semibold whitespace-nowrap tabular-nums">
                {label(item)}
              </span>
              <span
                aria-hidden
                className="relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full bg-foreground"
              />
              <span className="min-w-0 flex-1 text-sm">
                <ItemBody item={item} />
              </span>
            </li>
          ))}
        </ol>
      )
    default:
      return (
        <ul className="list-disc space-y-3 ps-5 text-body">
          {items.map(item => (
            <li key={item.id}>
              {label(item) && (
                <span className="font-semibold">{label(item)}: </span>
              )}
              <ItemBody item={item} />
            </li>
          ))}
        </ul>
      )
  }
}

/**
 * The tour's free-form content (R21 data model): each guest section as a titled block. The
 * layout only changes how the items are drawn; an unknown layout renders as a plain list.
 */
export function TourSections({
  sections,
  checkedOn,
}: {
  sections: TourSection[] | undefined
  checkedOn?: string
}) {
  const { t, language, intlLocale } = useLocale()
  const visible = sections ?? []

  if (!visible.length)
    return null

  return (
    <>
      {visible.map((section) => {
        const title = pickText(section.title, language).text
        const body = section.body ? pickText(section.body, language).text : ''
        const notice = section.layout === 'notice'

        return (
          <section
            key={section.id}
            className="flex flex-col gap-3 border-t border-separator py-7"
          >
            <h2 className="font-serif text-title text-balance">{title}</h2>
            {notice
              ? (
                  <div className="flex flex-col gap-2 rounded-2xl bg-surface-secondary p-4 text-sm">
                    <span className="flex items-start gap-2">
                      <InfoIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
                      <span className="flex flex-col gap-2">
                        {body && <Paragraphs text={body} />}
                      </span>
                    </span>
                    <Items section={section} />
                  </div>
                )
              : (
                  <>
                    {body && <Paragraphs text={body} />}
                    <Items section={section} />
                  </>
                )}
          </section>
        )
      })}
      {checkedOn && (
        <p className="border-t border-separator pt-5 pb-2 text-xs text-muted">
          {t('tourDiscovery.sections.checkedOn', {
            date: formatCalendarDay(checkedOn, intlLocale),
          })}
        </p>
      )}
    </>
  )
}
