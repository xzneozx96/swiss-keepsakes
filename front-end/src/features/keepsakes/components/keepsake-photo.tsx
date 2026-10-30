import type { Media } from '@sk/api-contract'

import { photoSrc } from '../lib/keepsake-rules'

/** A keepsake photo on the app's card ground (the hero gradient, which also shows while the file loads). */
export function KeepsakePhoto({ media, width, alt = '', className = '', children }: {
  media: Pick<Media, 'publicUrl' | 'variants'> | null | undefined
  /** The width the box shows, to pick a resized copy. */
  width: number
  alt?: string
  className?: string
  children?: React.ReactNode
}) {
  const src = media ? photoSrc(media, width) : undefined

  return (
    <div className={`relative overflow-hidden bg-gradient-to-b from-hero-sky via-hero-cream to-surface-tertiary ${className}`}>
      {src && <img alt={alt} className="absolute inset-0 size-full object-cover" decoding="async" loading="lazy" src={src} />}
      {children}
    </div>
  )
}
