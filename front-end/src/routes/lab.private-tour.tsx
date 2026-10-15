import type { PrivateTourOptionProps } from "@/features/lab/private-tour-options";

import { Link, createFileRoute } from "@tanstack/react-router";

import {
  PrivateChecklist,
  PrivatePinboard,
  PrivatePinnedNote,
  PrivateSideBySide,
  PrivateTapedCorners,
  PrivateTwoPolaroids,
} from "@/features/lab/private-tour-options-v2";
import { useLocale } from "@/contexts/locale-context";
import {
  PrivateHeadcount,
  PrivatePass,
  PrivatePolaroids,
  PrivatePostcard,
  PrivateStickyNote,
} from "@/features/lab/private-tour-options";

/** Lab: private-tour call-to-action options at phone width. Not part of the product. */
export const Route = createFileRoute("/lab/private-tour")({
  component: PrivateTourLab,
});

const round2 = [
  {
    id: "C1",
    title: "C1 · Two polaroids, note between",
    note: "Two snapshots and the sticky note pinned in the middle.",
    Option: PrivateTwoPolaroids,
  },
  {
    id: "C2",
    title: "C2 · Pinned note",
    note: "A bigger photo; the note held by a red push-pin, one handwritten sentence.",
    Option: PrivatePinnedNote,
  },
  {
    id: "C3",
    title: "C3 · Side by side",
    note: "Text left, polaroid and note right; full-width button below.",
    Option: PrivateSideBySide,
  },
  {
    id: "C4",
    title: "C4 · Checklist note",
    note: "The note as a little list: group size and dates ticked, the plan left to the team.",
    Option: PrivateChecklist,
  },
  {
    id: "C5",
    title: "C5 · Taped corners, pink note",
    note: "Tape on the photo's corners and a pink note, a little looser.",
    Option: PrivateTapedCorners,
  },
  {
    id: "C6",
    title: "C6 · Pinboard",
    note: "A small cork-coloured board: polaroid, note and a private-tour ticket stub.",
    Option: PrivatePinboard,
  },
];

const options = [
  {
    id: "A",
    title: "A · Group polaroids",
    note: "The home banner's three snapshots, captioned your group, your dates, your pace.",
    Option: PrivatePolaroids,
  },
  {
    id: "B",
    title: "B · Group pass",
    note: "A ticket made out to the guest's group, with blanks and a tear-off stub.",
    Option: PrivatePass,
  },
  {
    id: "C",
    title: "C · Polaroid with a sticky note",
    note: "One big snapshot, “just your group”, with the three facts on a taped note.",
    Option: PrivateStickyNote,
  },
  {
    id: "D",
    title: "D · Headcount",
    note: "Overlapping round photos ending in a red +50 bubble; the facts in one line.",
    Option: PrivateHeadcount,
  },
  {
    id: "E",
    title: "E · Postcard to the team",
    note: "The request half-written on a Lucerne postcard, with a photo stamp.",
    Option: PrivatePostcard,
  },
];

function PrivateTourLab() {
  const { t, language } = useLocale();
  const props: PrivateTourOptionProps = {
    title: t("privateTour.entry.title"),
    body: t("privateTour.entry.body"),
    action: t("privateTour.entry.action"),
    facts: [
      t("privateTour.entry.size"),
      t("privateTour.entry.dates"),
      t("privateTour.entry.planned"),
    ],
    language,
  };

  return (
    <div className="flex flex-1 justify-center bg-default/40 py-6">
      <div className="flex w-[375px] flex-col gap-8 bg-background px-4 py-6 shadow-overlay">
        <header className="flex flex-col gap-1">
          <Link
            className="text-label text-muted underline underline-offset-4"
            to="/lab"
          >
            Lab
          </Link>
          <h1 className="text-heading">Private-tour call to action</h1>
          <p className="text-sm text-muted">
            The block under the tour list, at phone width (375px), in the family
            of the home “Polaroid stack”.
          </p>
        </header>
        <h2 className="text-heading text-accent-soft-foreground">
          Round 2: variations on C
        </h2>
        {round2.map(({ id, title, note, Option }) => (
          <section key={id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-heading">{title}</h2>
              <p className="text-label text-muted">{note}</p>
            </div>
            <Option {...props} />
          </section>
        ))}
        <h2 className="border-t border-separator pt-6 text-heading text-muted">
          Round 1
        </h2>
        {options.map(({ id, title, note, Option }) => (
          <section key={id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-heading">{title}</h2>
              <p className="text-label text-muted">{note}</p>
            </div>
            <Option {...props} />
          </section>
        ))}
      </div>
    </div>
  );
}
