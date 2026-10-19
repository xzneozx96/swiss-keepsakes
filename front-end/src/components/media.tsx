import { photoUrl } from '@/lib/photos'

interface MediaProps {
  photo?: string
  alt: string
  className?: string
  children?: React.ReactNode
}

/**
 * Card media (Card card): the approved hero gradient as the ground, with the photo on
 * top when it exists. The gradient also shows while a lazy photo is still loading.
 * Children (e.g. a Chip) sit on top, positioned by the caller.
 */
export function Media({ photo, alt, className = '', children }: MediaProps) {
  const src = photoUrl(photo)

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-b from-hero-sky via-hero-cream to-surface-tertiary ${className}`}
    >
      {src && (
        <img
          alt={alt}
          className="absolute inset-0 size-full object-cover"
          decoding="async"
          loading="lazy"
          src={src}
        />
      )}
      {children}
    </div>
  )
}
