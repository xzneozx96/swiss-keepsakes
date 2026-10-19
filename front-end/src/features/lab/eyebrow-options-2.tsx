import type { Part } from "./eyebrow-options";

import { PickupIcon } from "@/components/icons";
import { Media } from "@/components/media";

const title = "font-serif text-[24px] leading-[30px] font-medium text-balance";
const sub = "text-sm text-muted";
const hand = { fontFamily: "Caveat, cursive" };

function Text({ part, className = "" }: { part: Part; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <h2 className={title}>{part.title}</h2>
      <p className={sub}>{part.subtitle}</p>
    </div>
  );
}

/** F1 · Handwritten: the label in a handwriting font with a drawn swoosh, like the client's card. */
export function EyebrowHandwritten({ part }: { part: Part }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p
        className="relative inline-flex -rotate-2 self-start text-[28px] leading-8 font-semibold"
        style={{ ...hand, color: part.color }}
      >
        {part.number}. {part.label}
        <svg
          aria-hidden
          className="absolute -bottom-1.5 left-0 h-2.5 w-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 10"
        >
          <path
            d="M2 7 C 25 2, 55 2, 98 5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </p>
      <Text part={part} />
    </div>
  );
}

/** F2 · Washi tape: the label on a strip of coloured paper tape, as if taped into a travel journal. */
export function EyebrowTape({ part }: { part: Part }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span
        className="-rotate-3 self-start px-4 py-1 text-[22px] leading-7 font-semibold text-foreground"
        style={{
          ...hand,
          backgroundColor: `color-mix(in oklab, ${part.color} 28%, transparent)`,
          clipPath: "polygon(2% 0, 98% 4%, 100% 50%, 97% 100%, 3% 96%, 0 52%)",
        }}
      >
        {part.label}
      </span>
      <Text part={part} />
    </div>
  );
}

/** F3 · Postage stamp: a small perforated stamp with the part's photo and number beside the title. */
export function EyebrowStamp({ part }: { part: Part }) {
  return (
    <div className="flex items-center gap-4">
      <span className="shrink-0 rotate-[-4deg] [filter:drop-shadow(0_3px_6px_rgba(51,49,46,0.25))]">
        <span className="block border-[5px] border-dotted border-white bg-white bg-clip-padding p-1">
          <Media alt="" className="h-[72px] w-[58px]" photo={part.photo}>
            <span className="absolute top-1 left-1 font-serif text-[15px] leading-none font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
              {part.number}
            </span>
            <span
              className="absolute inset-x-0 bottom-0 py-0.5 text-center text-[9px] font-bold tracking-[0.12em] text-white uppercase"
              style={{ backgroundColor: part.color }}
            >
              {part.label}
            </span>
          </Media>
        </span>
      </span>
      <Text className="min-w-0" part={part} />
    </div>
  );
}

/** F4 · Postmark: a round ink postmark "LUZERN" with the step number, stamped over the corner. */
export function EyebrowPostmark({ part }: { part: Part }) {
  const id = `pm-${part.number}`;

  return (
    <div className="relative">
      <svg
        aria-hidden
        className="absolute -top-3 right-0 size-[84px] rotate-[-14deg] opacity-80"
        style={{ color: part.color }}
        viewBox="0 0 100 100"
      >
        <defs>
          <path
            d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0"
            id={id}
          />
        </defs>
        <circle
          cx="50"
          cy="50"
          fill="none"
          r="46"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <circle
          cx="50"
          cy="50"
          fill="none"
          r="27"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <text
          fill="currentColor"
          fontFamily="Inter, sans-serif"
          fontSize="11"
          fontWeight="700"
          letterSpacing="3"
        >
          <textPath href={`#${id}`} lengthAdjust="spacing" textLength="222">
            LUZERN · LUCERNE · SWISS ·
          </textPath>
        </text>
        <text
          fill="currentColor"
          fontFamily="Source Serif 4, serif"
          fontSize="30"
          fontWeight="600"
          textAnchor="middle"
          x="50"
          y="61"
        >
          {part.number}
        </text>
      </svg>
      <div className="flex flex-col gap-1.5 pr-24">
        <p className="text-[13px] font-semibold" style={{ color: part.color }}>
          {part.label}
        </p>
        <Text part={part} />
      </div>
    </div>
  );
}

/** F5 · Trail pin: the dotted path from "How I'll show you Luzerne" arrives at a map pin for each stop. */
export function EyebrowTrailPin({ part }: { part: Part }) {
  return (
    <div className="relative flex gap-3 pt-9">
      <svg
        aria-hidden
        className="absolute top-0 left-[15px] h-9 w-0.5 overflow-visible"
      >
        <line
          stroke="var(--accent)"
          strokeDasharray="2 5"
          strokeLinecap="round"
          strokeWidth="2.5"
          x1="1"
          x2="1"
          y1="0"
          y2="36"
        />
      </svg>
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-white shadow-[0_4px_10px_-4px_rgba(51,49,46,0.5)]"
        style={{ backgroundColor: part.color }}
      >
        <PickupIcon size={18} />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p
          className="pt-1.5 text-[13px] font-semibold"
          style={{ color: part.color }}
        >
          {part.step} · {part.label}
        </p>
        <Text part={part} />
      </div>
    </div>
  );
}

/** F6 · Photo band: a short panorama of the part's place with the number and label on it. */
export function EyebrowPhotoBand({ part }: { part: Part }) {
  return (
    <div className="flex flex-col gap-3">
      <Media alt="" className="aspect-[7/2] rounded-2xl" photo={part.photo}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
        <span className="absolute inset-y-0 left-4 flex items-center gap-2.5 text-white">
          <span className="font-serif text-[40px] leading-none font-light">
            {part.number}
          </span>
          <span className="text-[20px] leading-6 font-semibold" style={hand}>
            {part.label}
          </span>
        </span>
      </Media>
      <Text part={part} />
    </div>
  );
}

/** F7 · Ribbon: the label on a small notched ribbon in the step's colour, like a gift tag. */
export function EyebrowRibbon({ part }: { part: Part }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span
        className="inline-flex items-center gap-2 self-start py-1 pr-6 pl-3 text-[13px] font-semibold text-white"
        style={{
          backgroundColor: part.color,
          clipPath:
            "polygon(0 0, 100% 0, calc(100% - 10px) 50%, 100% 100%, 0 100%)",
        }}
      >
        <span className="font-serif text-[15px]">{part.number}</span>
        <span aria-hidden className="h-3.5 w-px bg-white/50" />
        {part.label}
      </span>
      <Text part={part} />
    </div>
  );
}
