import { Link } from '@tanstack/react-router'

import brandLogo from '@/assets/brand/swiss-keepsakes-logo.png'
import brandMark from '@/assets/brand/swiss-keepsakes-mark.png'

/** The app logo, linking to the discovery home: the mark on phones, the wordmark wider. */
export function BrandLogo({ label }: { label: string }) {
  return (
    <Link
      aria-label={label}
      className="inline-flex max-w-full rounded-lg outline-none focus-visible:focus-ring"
      to="/"
    >
      <img
        alt=""
        className="h-11 w-auto sm:hidden"
        decoding="async"
        height={459}
        src={brandMark}
        width={628}
      />
      <img
        alt=""
        className="hidden h-auto max-h-11 w-[232px] max-w-full object-contain object-left sm:block"
        decoding="async"
        height={467}
        src={brandLogo}
        width={2016}
      />
    </Link>
  )
}
