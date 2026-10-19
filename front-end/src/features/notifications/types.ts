import type { Language } from '@/contexts/locale-context'

/** Email templates from UX spec §6. Flow 1 sends N01–N08, N12, N15, N21 and N23. */
export type MailTemplate
  = | 'N01'
    | 'N02'
    | 'N03'
    | 'N04'
    | 'N05'
    | 'N06'
    | 'N07'
    | 'N08'
    | 'N09'
    | 'N10'
    | 'N11'
    | 'N12'
    | 'N13'
    | 'N14'
    | 'N15'
    | 'N16'
    | 'N17'
    | 'N18'
    | 'N19'
    | 'N20'
    | 'N21'
    | 'N22'
    | 'N23'

/** Values a template fills in: money in Rappen, dates as ISO strings, the rest as text. */
export type MailParams = Record<string, string | number>

/**
 * An email the prototype would send. Nothing leaves the browser: the Mail panel in the
 * prototype bar lists these per recipient (outline §3). Rendering is step 1.6.
 */
export interface Mail {
  id: string
  at: string
  to: 'guest' | 'staff' | 'partner'
  guestId?: string
  /** Partner mail (N19, step 5.6). */
  partnerId?: string
  /** Guest mail: the language the guest ordered in. Staff mail: the staff UI language (spec §6). */
  language: Language
  template: MailTemplate
  orderId?: string
  /** Tour booking mail (flow 2); rendered by the tour templates. */
  bookingId?: string
  /**
   * Staff mail to one address or person rather than the whole staff (step 4.17): the
   * M19 request address for N16, or the Owner or the Manager for N17. Shown as the To line.
   */
  recipient?: string
  params: MailParams
}
