import { buttonVariants } from "@heroui/react";

import { ArrowRightIcon, TravelGroupIcon } from "@/components/icons";
import { Media } from "@/components/media";

/** Lab: private-tour call-to-action options, in the family of the home "Polaroid stack". */
export interface PrivateTourOptionProps {
  title: string;
  body: string;
  action: string;
  /** The three short facts: group size, dates, planned by the team. */
  facts: [string, string, string];
  language: "en" | "de";
}

const pill = `${buttonVariants({ variant: "primary" })} transition-transform active:scale-[0.98]`;

function Action({ label }: { label: string }) {
  return (
    <a className={pill} href="#/tours/private-tour">
      {label}
      <ArrowRightIcon aria-hidden size={18} />
    </a>
  );
}

function Heading({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex max-w-[30ch] flex-col gap-1.5">
      <h3 className="font-serif text-title text-balance">{title}</h3>
      <p className="text-sm text-foreground/75">{body}</p>
    </div>
  );
}

const shell =
  "flex flex-col items-center gap-5 rounded-3xl bg-hero-cream px-5 pt-6 pb-6 text-center";

/** A · Group polaroids: three snapshots, captions about the guest's own trip. */
export function PrivatePolaroids({
  title,
  body,
  action,
  language,
}: PrivateTourOptionProps) {
  const captions =
    language === "de"
      ? ["eure Gruppe", "eure Daten", "euer Tempo"]
      : ["your group", "your dates", "your pace"];
  const shots = [
    { photo: "lucerne-old-town", tilt: "-rotate-6", x: "start-[2%]", z: "z-0" },
    { photo: "lake-steamboat", tilt: "rotate-3", x: "start-[29%]", z: "z-10" },
    { photo: "musegg-wall", tilt: "-rotate-2", x: "start-[56%]", z: "z-20" },
  ];

  return (
    <section className={shell}>
      <div aria-hidden className="relative h-40 w-full">
        {shots.map((s, i) => (
          <figure
            key={s.photo}
            className={`absolute top-0 ${s.x} ${s.tilt} ${s.z} flex w-[42%] flex-col gap-1 bg-white p-1.5 pb-2 shadow-overlay`}
          >
            <Media alt="" className="aspect-square" photo={s.photo} />
            <figcaption className="font-serif text-xs italic">
              {captions[i]}
            </figcaption>
          </figure>
        ))}
      </div>
      <Heading body={body} title={title} />
      <Action label={action} />
    </section>
  );
}

/** B · Group pass: a ticket for "your group" with blanks, and a tear-off stub. */
export function PrivatePass({
  title,
  body,
  action,
  facts,
  language,
}: PrivateTourOptionProps) {
  const de = language === "de";

  return (
    <section className={shell}>
      <div
        aria-hidden
        className="flex w-full -rotate-2 overflow-hidden rounded-2xl bg-white text-start shadow-overlay"
      >
        <div className="flex flex-1 flex-col gap-3 p-4">
          <span className="text-[10px] font-semibold tracking-[0.2em] text-accent uppercase">
            {de ? "Private Tour · Gruppenpass" : "Private tour · group pass"}
          </span>
          <div className="flex flex-col gap-2 font-serif text-sm">
            <span className="flex items-end gap-2">
              {de ? "Gruppe" : "Group"}
              <span className="flex-1 border-b border-dashed border-muted/60 pb-0.5 text-start italic text-muted">
                {de ? "2 – 50 Personen" : "2 – 50 people"}
              </span>
            </span>
            <span className="flex items-end gap-2">
              {de ? "Daten" : "Dates"}
              <span className="flex-1 border-b border-dashed border-muted/60 pb-0.5 text-start italic text-muted">
                {de ? "eure Wahl" : "your choice"}
              </span>
            </span>
          </div>
        </div>
        <div className="flex w-24 flex-col items-center justify-center gap-1 border-s-2 border-dashed border-separator bg-hero-cream/60 p-2">
          <TravelGroupIcon className="text-accent" size={26} />
          <span className="font-serif text-xs italic">{facts[2]}</span>
        </div>
      </div>
      <Heading body={body} title={title} />
      <Action label={action} />
    </section>
  );
}

/** C · One big polaroid with a taped sticky note of the facts. */
export function PrivateStickyNote({
  title,
  body,
  action,
  facts,
  language,
}: PrivateTourOptionProps) {
  return (
    <section className={shell}>
      <div aria-hidden className="relative h-48 w-full">
        <figure className="absolute start-[8%] top-0 flex w-[66%] -rotate-3 flex-col gap-1 bg-white p-2 pb-3 shadow-overlay">
          <Media
            alt=""
            className="aspect-[4/3]"
            photo="lucerne-kapellbruecke-1200"
          />
          <figcaption className="font-serif text-sm italic">
            {language === "de" ? "nur eure Gruppe" : "just your group"}
          </figcaption>
        </figure>
        <div className="absolute end-[4%] top-16 flex w-[38%] rotate-6 flex-col gap-1 bg-[#fdf2a8] p-3 text-start font-serif text-xs italic shadow-overlay">
          <span
            aria-hidden
            className="absolute -top-2 start-1/2 h-4 w-10 -translate-x-1/2 -rotate-3 bg-white/70"
          />
          {facts.map((f) => (
            <span key={f}>· {f}</span>
          ))}
        </div>
      </div>
      <Heading body={body} title={title} />
      <Action label={action} />
    </section>
  );
}

/** D · Headcount: overlapping round photos with a "+50" bubble, the facts inline. */
export function PrivateHeadcount({
  title,
  body,
  action,
  facts,
}: PrivateTourOptionProps) {
  const photos = [
    "lucerne-old-town",
    "pilatus",
    "lake-steamboat",
    "lion-monument",
    "lucerne-water-tower",
  ];

  return (
    <section className={shell}>
      <div aria-hidden className="flex items-center">
        {photos.map((p, i) => (
          <span
            key={p}
            className="-ms-3 size-14 overflow-hidden rounded-full border-[3px] border-hero-cream shadow-surface first:ms-0"
            style={{ zIndex: photos.length - i }}
          >
            <Media alt="" className="size-full" photo={p} />
          </span>
        ))}
        <span className="-ms-3 flex size-14 items-center justify-center rounded-full border-[3px] border-hero-cream bg-accent font-serif text-base font-semibold text-accent-foreground">
          +50
        </span>
      </div>
      <Heading body={body} title={title} />
      <p className="text-xs font-medium text-muted">{facts.join(" · ")}</p>
      <Action label={action} />
    </section>
  );
}

/** E · Postcard to the team: the guest's request half-written on a Luzerne postcard. */
export function PrivatePostcard({
  title,
  body,
  action,
  language,
}: PrivateTourOptionProps) {
  const de = language === "de";

  return (
    <section className={shell}>
      <div
        aria-hidden
        className="grid w-full rotate-1 grid-cols-[1fr_auto] gap-3 rounded-lg bg-white p-4 text-start shadow-overlay"
      >
        <p className="font-serif text-sm leading-relaxed italic">
          {de ? "Liebes Team," : "Dear Luzerne team,"}
          <br />
          {de ? "wir sind " : "we are "}
          <span className="border-b border-dashed border-muted/60 px-3 text-muted">
            12
          </span>
          {de ? " Personen und kommen am " : " people, visiting on "}
          <span className="border-b border-dashed border-muted/60 px-3 text-muted">
            {de ? "3. Mai" : "3 May"}
          </span>
          {de ? ". Was schlagt ihr vor?" : ". What would you plan for us?"}
        </p>
        <div className="flex flex-col items-end gap-2">
          <div className="w-14 rotate-3 border-2 border-dashed border-accent/50 p-0.5">
            <Media alt="" className="aspect-[3/4]" photo="pilatus" />
          </div>
          <span className="font-serif text-[10px] tracking-widest text-muted uppercase">
            Luzern
          </span>
        </div>
      </div>
      <Heading body={body} title={title} />
      <Action label={action} />
    </section>
  );
}
