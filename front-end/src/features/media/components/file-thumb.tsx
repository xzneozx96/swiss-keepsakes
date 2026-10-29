import type { MediaItem } from '@sk/api-contract'

import { Spinner } from '@heroui/react'

import { FilePdfIcon, MusicIcon } from '@/components/icons'
import { thumbOf } from '../lib/rules'

/** A square preview: the photo, or the kind's icon on the hero ground; a spinner while the file is being built. */
export function FileThumb({ item, className = 'size-12 rounded-lg', width = 320, busy = false }: { item: MediaItem, className?: string, width?: number, busy?: boolean }) {
  const src = item.kind === 'image' && item.status !== 'processing' ? thumbOf(item, width) : null
  const Icon = item.kind === 'audio' ? MusicIcon : FilePdfIcon

  return (
    <span className={`relative block shrink-0 overflow-hidden bg-gradient-to-b from-hero-sky via-hero-cream to-surface-tertiary ${className} ${item.status === 'retired' ? 'opacity-50 grayscale' : ''}`}>
      {src && <img alt="" className="absolute inset-0 size-full object-cover" decoding="async" loading="lazy" src={src} />}
      {item.kind !== 'image' && (
        <span className="absolute inset-0 flex items-center justify-center text-foreground/70">
          <Icon aria-hidden size={22} />
        </span>
      )}
      {(item.status === 'processing' || busy) && (
        <span className="absolute inset-0 flex items-center justify-center bg-surface/60">
          <Spinner size="sm" />
        </span>
      )}
    </span>
  )
}
