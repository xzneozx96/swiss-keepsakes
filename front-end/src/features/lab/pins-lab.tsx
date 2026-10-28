import type { Pin as MerchantPin } from './pins-merchant-data'
import type { PinsLabSearch } from './pins-merchant-search-params'
import type { GuestView } from '@/features/lab/map-guest-lab'

import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { guestPins, isOnMap, toGuestPin } from '@/features/lab/map-guest-data'
import { GuestPanel, TourRoutePanel } from '@/features/lab/map-guest-lab'
import { onLabMessage, postToFrame } from './pins-lab-sync'
import { seedPins } from './pins-merchant-data'
import { DashboardPanel, frameSrc } from './pins-merchant-lab'

/**
 * The phone's pins. "What guests see now" is the saved list. The preview swaps in the form
 * being edited and draws it even before it is published, so every edit shows on the map.
 */
function phonePins(pins: MerchantPin[], draft: MerchantPin | null, view: GuestView) {
  if (view === 'live' || !draft)
    return guestPins(pins)
  const rest = guestPins(pins.filter(p => p.id !== draft.id))
  const drawn = toGuestPin(draft)

  return drawn ? [...rest, drawn] : rest
}

function viewNote(draft: MerchantPin | null, view: GuestView) {
  if (view === 'live')
    return 'Saved and published pins only, as a guest sees them now.'
  if (!draft)
    return 'Open a pin in the dashboard: its unsaved edits show here as you type.'
  if (draft.lat === null || draft.lng === null)
    return 'The pin you are editing has no location yet, so it is not on the map.'
  if (!isOnMap(draft))
    return 'Your edits are drawn, including this pin, which guests cannot see yet (draft, hidden or past its last date).'

  return 'Your unsaved edits are drawn; guests see them after you save.'
}

/**
 * Lab, slice S4: the merchant's pins list and editor (N16, N17) beside the guest's Map tab
 * and pin card (N02, N03), on one list of pins. Edit a pin and watch it on the map.
 */
export function PinsLab({ search, onChange }: {
  search: PinsLabSearch
  onChange: (patch: Partial<PinsLabSearch>) => void
}) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [pins, setPins] = useState<MerchantPin[]>(seedPins)
  const [draft, setDraft] = useState<MerchantPin | null>(null)
  const [view, setView] = useState<GuestView>('preview')
  // A reloaded dashboard starts without an open form (adjusted during render).
  const src = frameSrc(search)
  const [shownSrc, setShownSrc] = useState(src)

  if (src !== shownSrc) {
    setShownSrc(src)
    setDraft(null)
  }

  useEffect(() => onLabMessage((message) => {
    if (message.type === 'pins')
      setPins(message.pins)
    else if (message.type === 'draft')
      setDraft(message.pin)
  }), [])

  const placed = draft && draft.lat !== null && draft.lng !== null

  return (
    <div className="flex flex-1 flex-col gap-6 bg-default/40 px-4 py-6 lg:px-8">
      <div className="flex max-w-3xl flex-col gap-1">
        <Link className="self-start text-label text-muted underline underline-offset-4" to="/lab">Lab</Link>
        <h1 className="text-heading">Pins: edit a pin, see it on the map (S4)</h1>
        <p className="text-sm text-muted">
          The merchant’s dashboard (N16 list, N17 editor) on the left and the guest’s Map tab
          (N02 map, N03 pin card) on the right share one list of pins. Edit a pin and the guest
          phone follows as you type; save, hide or delete and the guests’ map changes. Mock data,
          today is Wed 28 Oct 2026 in Lucerne. Nothing is stored.
        </p>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_375px]">
        <DashboardPanel frameRef={frameRef} search={search} onChange={onChange} />
        <GuestPanel
          focus={view === 'preview' && placed ? draft.id : undefined}
          pins={phonePins(pins, draft, view)}
          view={view}
          viewNote={viewNote(draft, view)}
          onEdit={id => postToFrame(frameRef.current, { type: 'edit', id })}
          onView={setView}
        />
      </div>

      <TourRoutePanel />
    </div>
  )
}
