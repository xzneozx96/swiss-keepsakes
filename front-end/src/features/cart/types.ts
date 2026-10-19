/**
 * One gift in the cart, as chosen on C03. The cart holds no stock (AC05) and no
 * prices: C04 lists the lines with current catalogue prices; C06 groups the selected
 * lines into orders (R12).
 */
export interface CartLine {
  id: string
  productId: string
  variantId: string
  quantity: number
  engraving?: string
  /** Requested pickup date, YYYY-MM-DD (a Zurich calendar day). */
  pickupDate: string
  pickupPlaceId: string
  /** Ticked on C04: only selected lines go to C06 and are sent. Never set on add. */
  selected?: boolean
}
