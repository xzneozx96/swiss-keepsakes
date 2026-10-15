import { Link, createFileRoute } from "@tanstack/react-router";

import background from "@/features/lab/map-loading-bg.jpg";
import {
  LoadingDestination,
  LoadingDimmed,
  LoadingInCard,
  LoadingPill,
  LoadingTopBar,
} from "@/features/lab/map-loading-options";

/** Lab: loading indicators for the tour map while the next stop's tiles load. Not part of the product. */
export const Route = createFileRoute("/lab/map-loading")({
  component: MapLoadingLab,
});

const options = [
  {
    id: "A",
    title: "A · Pill with spinner (current)",
    note: "Small white pill over the map: spinner and 'Loading the view…'.",
    Option: LoadingPill,
  },
  {
    id: "B",
    title: "B · Thin progress bar",
    note: "A slim red bar slides along the top edge of the map. No text, nothing over the map.",
    Option: LoadingTopBar,
  },
  {
    id: "C",
    title: "C · Loading shown in the stop card",
    note: "The map stays clean. The stop card shows it: a red line on its top edge, a spinner in the next button and a pulsing photo.",
    Option: LoadingInCard,
  },
  {
    id: "D",
    title: "D · Heading to the stop",
    note: "A pill with a spinner and 'Heading to Steingletscher'. Says where the map is going rather than that it is loading. Chosen on 15.10.2026; now in the product.",
    Option: LoadingDestination,
  },
  {
    id: "E",
    title: "E · Dimmed map with a spinner",
    note: "The map dims slightly and a round white spinner sits above the card. No text.",
    Option: LoadingDimmed,
  },
];

function MapLoadingLab() {
  return (
    <div className="flex flex-1 justify-center bg-default/40 py-6">
      <style>{`
        @keyframes lab-slide { from { transform: translateX(-100%); } to { transform: translateX(300%); } }
        .lab-slide { animation: lab-slide 1.2s ease-in-out infinite; }
      `}</style>
      <div className="flex w-[375px] flex-col gap-10 bg-background py-6 shadow-overlay">
        <header className="flex flex-col gap-1 px-4">
          <Link
            className="text-label text-muted underline underline-offset-4"
            to="/lab"
          >
            Lab
          </Link>
          <h1 className="text-heading">Map loading indicator</h1>
          <p className="text-sm text-muted">
            Shown for 1–3 seconds after tapping a stop that is far away, while
            its tiles load. The old view stays on screen, then the map flies to
            the stop.
          </p>
        </header>
        {options.map(({ id, title, note, Option }) => (
          <section key={id} className="flex flex-col gap-3 px-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-semibold">{title}</h2>
              <p className="text-label text-muted">{note}</p>
            </div>
            <Option background={background} />
          </section>
        ))}
      </div>
    </div>
  );
}
