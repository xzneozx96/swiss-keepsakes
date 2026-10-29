import { useEffect, useRef, useState } from 'react'

/**
 * An iPhone 16 Pro drawn in CSS for the editors' guest previews: a titanium band, the black
 * bezel, the Dynamic Island, a status bar, the home indicator and the side buttons. The screen is
 * 402 × 874 points as on the device; the page scrolls inside the screen, under the status bar.
 */

/** Points of the 16 Pro screen, and the band and bezel around it. */
const SCREEN = { width: 402, height: 874 }
const FRAME = 3 + 11

/** Signal, Wi-Fi and battery as on iOS, drawn small in the current text colour. */
function StatusIcons() {
  return (
    <span aria-hidden className="flex items-center gap-1.5">
      <svg fill="currentColor" height="11" viewBox="0 0 17 11" width="17">
        <rect height="3.5" rx="1" width="3" y="7.5" />
        <rect height="5.5" rx="1" width="3" x="4.5" y="5.5" />
        <rect height="8" rx="1" width="3" x="9" y="3" />
        <rect height="11" rx="1" width="3" x="13.5" />
      </svg>
      <svg fill="currentColor" height="11" viewBox="0 0 16 11" width="16">
        <path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.1-1.2A10.2 10.2 0 0 0 8 .6C5.3.6 2.8 1.6.9 3.4L2 4.6a8.6 8.6 0 0 1 6-2.4Zm0 3.2c1.4 0 2.6.5 3.6 1.4l1.1-1.2A6.9 6.9 0 0 0 8 3.8c-1.8 0-3.4.7-4.7 1.8l1.1 1.2c1-.9 2.2-1.4 3.6-1.4Zm0 3.2c-.6 0-1.1.2-1.5.6L8 10.8l1.5-1.6c-.4-.4-.9-.6-1.5-.6Z" />
      </svg>
      <svg height="12" viewBox="0 0 27 12" width="27">
        <rect fill="none" height="11" opacity=".4" rx="3.5" stroke="currentColor" width="23" x=".5" y=".5" />
        <rect fill="currentColor" height="8" rx="2" width="18" x="2" y="2" />
        <path d="M25 4v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2Z" fill="currentColor" opacity=".5" />
      </svg>
    </span>
  )
}

/** One side button: a short titanium bar outside the band. */
function SideButton({ side, top, height }: { side: 'start' | 'end', top: number, height: number }) {
  return (
    <span
      aria-hidden
      className={`absolute w-[3px] bg-[#9c9a94] ${side === 'start' ? '-start-[3px] rounded-s-[2px]' : '-end-[3px] rounded-e-[2px]'}`}
      style={{ top, height }}
    />
  )
}

/**
 * The phone at its real size (the screen is 402 points wide, as on the device, so the page lays
 * out as guests see it), scaled down as one piece to fit its column and the window height minus
 * `reserve` pixels. Scaling the whole drawing keeps the island, status bar and buttons in place.
 */
export function IPhoneMockup({ children, label, reserve = 0 }: {
  children: React.ReactNode
  label: string
  reserve?: number
}) {
  const width = SCREEN.width + 2 * FRAME
  const height = SCREEN.height + 2 * FRAME
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const box = ref.current
    if (!box)
      return
    const fit = () => setScale(Math.min(1, box.clientWidth / width, (window.innerHeight - reserve) / height))
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    window.addEventListener('resize', fit)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [width, height, reserve])

  return (
    <div ref={ref} className="w-full">
      <div className="relative mx-auto" style={{ width: width * scale, height: height * scale }}>
        <div className="absolute start-0 top-0 origin-top-left" style={{ width, height, transform: `scale(${scale})` }}>
          <SideButton side="start" top={118} height={34} />
          <SideButton side="start" top={178} height={62} />
          <SideButton side="start" top={252} height={62} />
          <SideButton side="end" top={200} height={96} />
          <SideButton side="end" top={560} height={56} />
          {/* Titanium band, then the black bezel, then the screen. */}
          <div className="size-full rounded-[64px] bg-linear-to-br from-[#d9d7d1] via-[#9e9c96] to-[#c9c7c1] p-[3px] shadow-[0_24px_48px_-16px_rgb(0_0_0/0.35)]">
            <div className="size-full rounded-[61px] bg-[#0b0b0c] p-[11px]">
              <div className="relative flex size-full flex-col overflow-hidden rounded-[50px] bg-background">
                <div className="relative z-10 flex h-[54px] shrink-0 items-center justify-between bg-background px-8 pt-1 text-[15px] font-semibold text-foreground">
                  <span>9:41</span>
                  <StatusIcons />
                  <span aria-hidden className="absolute start-1/2 top-[11px] h-[36px] w-[124px] -translate-x-1/2 rounded-full bg-black" />
                </div>
                <div aria-label={label} className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-preview-scroll="" role="region">
                  {children}
                </div>
                <span aria-hidden className="pointer-events-none absolute start-1/2 bottom-2 z-10 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-foreground/80" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
