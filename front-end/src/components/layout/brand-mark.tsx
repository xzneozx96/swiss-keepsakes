import brandMark from '@/assets/brand/swiss-keepsakes-mark.png'

/** The shop's mark, cropped to its drawing, for the sidebar of the merchant and admin shells. */
export function BrandMark() {
  return (
    <svg
      aria-hidden
      className="h-9 w-auto shrink-0"
      height={883}
      viewBox="79 173 1053 883"
      width={1053}
    >
      <image height={1254} href={brandMark} width={1254} />
    </svg>
  )
}
