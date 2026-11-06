import type { CSSProperties } from 'react'

/**
 * The curved tab of a card's top-right corner, as one mask over one element, so the tint and the blur are the same everywhere and no
 * seam can show (owner, 05.11.2026). The element is the block plus a 16 px strip on its left and under it; the mask keeps the block
 * with a 22 px curve at its inner corner, and two concave fillets that run it into the card's top and right edges. Each curve has a
 * 1 px soft edge, so there are no jaggies. Layers: the block without its curved corner (two rectangles), the curve, the two fillets.
 */
const FILLET = 'radial-gradient(circle at 0 100%, transparent 15.5px, #000 16.5px)'
const SOLID = 'linear-gradient(#000, #000)'
const TAB_MASK = {
  image: [SOLID, SOLID, 'radial-gradient(circle at 100% 0, #000 21.5px, transparent 22.5px)', FILLET, FILLET].join(', '),
  // Neighbouring layers overlap by 1 px (the rectangles reach 1 px into the curve's box, the fillets 1 px into the block), so no
  // device pixel at a seam is covered only partly by both; the mask is one element, so an overlap never darkens.
  size: 'calc(100% - 37px) calc(100% - 16px), calc(100% - 16px) calc(100% - 37px), 22px 22px, 17px 16px, 16px 17px',
  position: 'right top, right top, left 16px bottom 16px, left top, right bottom',
}
const TAB_STYLE: CSSProperties = {
  maskImage: TAB_MASK.image,
  maskSize: TAB_MASK.size,
  maskPosition: TAB_MASK.position,
  maskRepeat: 'no-repeat',
  WebkitMaskImage: TAB_MASK.image,
  WebkitMaskSize: TAB_MASK.size,
  WebkitMaskPosition: TAB_MASK.position,
  WebkitMaskRepeat: 'no-repeat',
}

/**
 * The home cards' corner notch (food status, event countdown): a frosted tab that hugs the card's top-right corner (the card's own
 * radius clips its outer corner; the mask curves the inner one). The big word leads, with a dot (`live` green and pulsing, `off` red,
 * none without); the small line under it is optional. Screen readers hear `say` instead of the pieces. Absolute, so it takes no room;
 * the card must be `relative` and clip its corners.
 */
export function CornerNotch({ state, detail, say, dot, kind }: { state: string, detail?: string | undefined, say: string, dot?: 'live' | 'off' | undefined, kind?: string }) {
  return (
    <>
      <span className="sr-only">{say}</span>
      <span aria-hidden className="absolute top-0 right-0 z-10 bg-black/55 pb-4 ps-4 text-white backdrop-blur-md" data-status={kind} style={TAB_STYLE}>
        <span className="flex flex-col items-end gap-1 py-3 ps-4 pe-[18px]">
          <span className="flex items-center gap-1.5 text-[19px] leading-6 font-extrabold tracking-[-0.01em]">
            {dot && <span className={`size-2 rounded-full ${dot === 'live' ? 'bg-[#4ade80] shadow-[0_0_0_3px_rgb(74_222_128/0.25)] motion-safe:animate-pulse' : 'bg-[#f87171]'}`} />}
            {state}
          </span>
          {detail && <span className="text-[12px] leading-4 font-semibold text-white/90 tabular-nums">{detail}</span>}
        </span>
      </span>
    </>
  )
}
