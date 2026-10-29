import type { Pin } from '@sk/api-contract'
import type { FormErrors, PlaceForm } from '../lib/form'
import type { MessageKey } from '@/i18n/en'

/** What every step gets: the form, how to change it, the checks, and the pin as it was last saved. */
export interface StepProps {
  form: PlaceForm
  /** Takes the changes, or a function of the latest form: an upload that ends seconds later must not overwrite what was typed meanwhile. */
  patch: (changes: Partial<PlaceForm> | ((current: PlaceForm) => Partial<PlaceForm>)) => void
  errors: FormErrors
  storeId: string
  pin: Pin | undefined
  /** The API said another pin uses this map link. */
  slugTaken: boolean
  /** Opens a step, for the review's Edit buttons. */
  go?: (step: string) => void
  notice?: MessageKey
}
