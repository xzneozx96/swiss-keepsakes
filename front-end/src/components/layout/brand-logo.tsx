import { Link } from "@tanstack/react-router";

import brandLogo from "@/assets/brand/swiss-keepsakes-logo.png";
import brandMark from "@/assets/brand/swiss-keepsakes-mark.png";

/** The app logo, linking to the discovery home: the mark on phones, the wordmark wider. */
export function BrandLogo({ label }: { label: string }) {
  return (
    <Link
      aria-label={label}
      className="inline-flex max-w-full rounded-lg outline-none focus-visible:focus-ring"
      to="/"
    >
      <svg
        aria-hidden
        className="h-11 w-auto sm:hidden"
        height={883}
        viewBox="79 173 1053 883"
        width={1053}
      >
        <image height={1254} href={brandMark} width={1254} />
      </svg>
      <svg
        aria-hidden
        className="hidden h-auto max-h-11 w-[232px] max-w-full sm:block"
        height={425}
        preserveAspectRatio="xMinYMid meet"
        viewBox="28 118 2101 425"
        width={2101}
      >
        <image height={724} href={brandLogo} width={2172} />
      </svg>
    </Link>
  );
}
