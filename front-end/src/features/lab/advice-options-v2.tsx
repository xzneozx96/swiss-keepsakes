/**
 * Lab, round 2: trip-advice call to action built from the subject itself (Luzerne, travel
 * paper, a shop owner who writes back). Compared on /lab/advice. Copy rules (spec §4.10):
 * no "AI", no promised reply time; the shop replies by email.
 */
import { ArrowRightIcon } from '@/components/icons'
import { Media } from '@/components/media'

export interface AdviceV2Props {
  language: 'en' | 'de'
  ownerName: string
}

const copy = {
  en: {
    postcardTo: 'To: you, somewhere in Luzerne',
    postcardNote:
      'Tell me how long you are staying and what you like. I will write back with a few ideas for your days here.',
    postcardSign: 'Sonja, from the shop in the old town',
    postcardAction: 'Write to the shop',
    stamp: 'LUZERN',
    ticketTitle: 'Your days in Luzerne',
    ticketFrom: 'From',
    ticketTo: 'To',
    ticketArrive: 'Arrive',
    ticketLeave: 'Leave',
    ticketInterests: 'You like',
    ticketBlank: '—',
    ticketAction: 'Fill in with the shop',
    ticketFoot: 'The shop replies by email',
    questionKicker: 'Question 1 of 7 · from the shop',
    question: 'How long are you in Luzerne?',
    answers: ['A few hours', '1–2 days', '3 days or more', 'Not sure yet'],
    questionFoot: 'Answer a few short questions; the shop replies by email.',
    mapTitle: 'Your route, drawn by a local',
    mapBody:
      'Tell the shop what you like. You get a short list of places, walks and gifts by email.',
    mapAction: 'Start',
    pins: ['Old town', 'Lake', 'Pilatus'],
    polaroidTitle: 'Not sure where to start?',
    polaroidBody:
      'The shop has lived here for years. Ask, and get a few personal tips by email.',
    polaroidAction: 'Ask Sonja',
    captions: ['the lake', 'Pilatus', 'old town'],
  },
  de: {
    postcardTo: 'An: Sie, irgendwo in Luzern',
    postcardNote:
      'Erzählen Sie mir, wie lange Sie bleiben und was Ihnen gefällt. Ich schreibe Ihnen ein paar Ideen für Ihre Tage hier.',
    postcardSign: 'Sonja, vom Laden in der Altstadt',
    postcardAction: 'Dem Laden schreiben',
    stamp: 'LUZERN',
    ticketTitle: 'Ihre Tage in Luzern',
    ticketFrom: 'Von',
    ticketTo: 'Nach',
    ticketArrive: 'Ankunft',
    ticketLeave: 'Abreise',
    ticketInterests: 'Sie mögen',
    ticketBlank: '—',
    ticketAction: 'Mit dem Laden ausfüllen',
    ticketFoot: 'Der Laden antwortet per E-Mail',
    questionKicker: 'Frage 1 von 7 · vom Laden',
    question: 'Wie lange sind Sie in Luzern?',
    answers: [
      'Ein paar Stunden',
      '1–2 Tage',
      '3 Tage oder mehr',
      'Noch unklar',
    ],
    questionFoot: 'Ein paar kurze Fragen; der Laden antwortet per E-Mail.',
    mapTitle: 'Ihre Route, von hier gezeichnet',
    mapBody:
      'Sagen Sie dem Laden, was Ihnen gefällt. Sie erhalten per E-Mail eine kurze Liste mit Orten, Spaziergängen und Geschenken.',
    mapAction: 'Starten',
    pins: ['Altstadt', 'See', 'Pilatus'],
    polaroidTitle: 'Wissen Sie nicht, wo anfangen?',
    polaroidBody:
      'Der Laden ist seit Jahren hier. Fragen Sie und erhalten Sie persönliche Tipps per E-Mail.',
    polaroidAction: 'Sonja fragen',
    captions: ['der See', 'Pilatus', 'Altstadt'],
  },
}

/** F · Postcard: the CTA is a postcard from the owner, with a photo stamp and a postmark. */
export function AdvicePostcard({ language }: AdviceV2Props) {
  const c = copy[language]

  return (
    <section className="relative rotate-[-1.2deg] rounded-xl bg-[#fffdf7] p-5 shadow-overlay">
      <div className="flex gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3 border-e border-dashed border-separator pe-4">
          <p className="font-serif text-[17px] leading-6 italic">
            {c.postcardNote}
          </p>
          <p className="font-serif text-sm text-muted italic">
            — {c.postcardSign}
          </p>
        </div>
        <div className="flex w-24 shrink-0 flex-col items-end gap-3">
          {/* Stamp: white border with a dotted perforation edge, Luzerne photo inside. */}
          <div className="relative rotate-3 bg-white p-1.5 shadow-surface outline-2 outline-offset-[-3px] outline-white outline-dotted">
            <Media
              alt=""
              className="h-20 w-16"
              photo="lucerne-kapellbruecke-1200"
            />
            <span className="absolute inset-x-1 bottom-1 bg-white/85 text-center text-[8px] font-semibold tracking-widest">
              {c.stamp}
            </span>
          </div>
          {/* Postmark */}
          <div className="-me-2 flex size-16 -rotate-12 flex-col items-center justify-center rounded-full border-2 border-muted/50 text-[8px] leading-3 font-semibold tracking-wider text-muted/80">
            <span>LUZERN</span>
            <span className="tabular-nums">13.10.26</span>
          </div>
          <p className="w-full border-b border-separator pb-1 text-[10px] text-muted">
            {c.postcardTo}
          </p>
        </div>
      </div>
      <span className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background">
        {c.postcardAction}
        <ArrowRightIcon size={16} />
      </span>
    </section>
  )
}

/** G · Travel ticket: a boat/train ticket with blanks to fill and a tear-off stub. */
export function AdviceTicket({ language }: AdviceV2Props) {
  const c = copy[language]

  return (
    <section className="relative flex overflow-hidden rounded-2xl bg-surface shadow-overlay">
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <p className="text-[10px] font-semibold tracking-[0.15em] text-muted uppercase">
          {c.ticketTitle}
        </p>
        <div className="flex items-end gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted uppercase">
              {c.ticketFrom}
            </span>
            <span className="font-serif text-title leading-none">LUZ</span>
          </div>
          <span
            aria-hidden
            className="mb-2 flex-1 border-t-2 border-dashed border-separator"
          />
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-muted uppercase">
              {c.ticketTo}
            </span>
            <span className="font-serif text-title leading-none">?</span>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-xs">
          {[c.ticketArrive, c.ticketLeave, c.ticketInterests].map(label => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="text-[10px] text-muted uppercase">{label}</dt>
              <dd className="border-b border-dotted border-muted/60 pb-1 text-muted">
                {c.ticketBlank}
              </dd>
            </div>
          ))}
        </dl>
        <span className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background">
          {c.ticketAction}
        </span>
      </div>
      {/* Tear-off stub with notches */}
      <div className="relative flex w-16 shrink-0 flex-col items-center justify-center border-s-2 border-dashed border-separator bg-hero-cream">
        <span className="absolute -start-2.5 -top-2.5 size-5 rounded-full bg-background" />
        <span className="absolute -start-2.5 -bottom-2.5 size-5 rounded-full bg-background" />
        <span className="rotate-90 text-[10px] font-semibold tracking-[0.2em] whitespace-nowrap text-muted uppercase">
          {c.ticketFoot}
        </span>
      </div>
    </section>
  )
}

/** H · First question inline: the questionnaire starts right here; one tap answers question 1. */
export function AdviceFirstQuestion({ language, ownerName }: AdviceV2Props) {
  const c = copy[language]

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-foreground p-5 text-background">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-hero-cream font-serif text-foreground">
          {ownerName.slice(0, 1)}
        </span>
        <span className="text-label text-background/70">
          {c.questionKicker}
        </span>
      </div>
      <h2 className="font-serif text-title">{c.question}</h2>
      <div className="grid grid-cols-2 gap-2">
        {c.answers.map(a => (
          <span
            key={a}
            className="flex h-12 items-center justify-center rounded-2xl bg-background/10 px-3 text-center text-sm font-medium"
          >
            {a}
          </span>
        ))}
      </div>
      {/* Progress: question 1 of 7 */}
      <div aria-hidden className="flex gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${i === 0 ? 'bg-background' : 'bg-background/20'}`}
          />
        ))}
      </div>
      <p className="text-label text-background/70">{c.questionFoot}</p>
    </section>
  )
}

/** I · Route sketch: three photo pins on a dashed route over a lake-blue ground. */
export function AdviceRouteSketch({ language }: AdviceV2Props) {
  const c = copy[language]
  const pins = [
    { photo: 'lucerne-old-town', x: '12%', y: '18%' },
    { photo: 'lake-steamboat', x: '46%', y: '50%' },
    { photo: 'pilatus', x: '76%', y: '14%' },
  ]

  return (
    <section className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface">
      <div className="relative h-44 bg-gradient-to-br from-hero-sky to-hero-cream">
        <svg
          aria-hidden
          className="absolute inset-0 size-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <path
            d="M 18 32 C 30 70, 40 70, 52 62 S 70 20, 82 28"
            fill="none"
            stroke="var(--foreground)"
            strokeDasharray="2 2.5"
            strokeLinecap="round"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {pins.map((pin, i) => (
          <div
            key={pin.photo}
            className="absolute flex flex-col items-center gap-1"
            style={{ left: pin.x, top: pin.y }}
          >
            <Media
              alt=""
              className="size-14 rounded-full ring-3 ring-white shadow-overlay"
              photo={pin.photo}
            />
            <span className="rounded-full bg-white px-2 text-[10px] font-semibold shadow-surface">
              {c.pins[i]}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-3 p-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="font-serif text-card-title">{c.mapTitle}</h2>
          <p className="text-sm text-muted">{c.mapBody}</p>
        </div>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
          <ArrowRightIcon size={20} />
        </span>
      </div>
    </section>
  )
}

/** J · Polaroid stack: three tilted snapshots with handwritten-style captions. */
export function AdvicePolaroids({ language }: AdviceV2Props) {
  const c = copy[language]
  const shots = [
    { photo: 'lake-steamboat', tilt: '-rotate-6', z: 'z-0', x: 'start-2' },
    { photo: 'pilatus', tilt: 'rotate-3', z: 'z-10', x: 'start-[30%]' },
    {
      photo: 'lucerne-old-town',
      tilt: '-rotate-2',
      z: 'z-20',
      x: 'start-[58%]',
    },
  ]

  return (
    <section className="flex flex-col gap-5 rounded-3xl bg-hero-cream px-5 pt-6 pb-5">
      <div className="relative h-40">
        {shots.map((s, i) => (
          <figure
            key={s.photo}
            className={`absolute top-0 ${s.x} ${s.tilt} ${s.z} flex w-[42%] flex-col gap-1 bg-white p-1.5 pb-2 shadow-overlay`}
          >
            <Media alt="" className="aspect-square" photo={s.photo} />
            <figcaption className="text-center font-serif text-xs italic">
              {c.captions[i]}
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-serif text-title">{c.polaroidTitle}</h2>
        <p className="text-sm text-foreground/75">{c.polaroidBody}</p>
      </div>
      <span className="inline-flex h-11 items-center gap-2 self-start rounded-full bg-foreground px-5 text-sm font-medium text-background">
        {c.polaroidAction}
        <ArrowRightIcon size={16} />
      </span>
    </section>
  )
}
