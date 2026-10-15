import { buttonVariants } from "@heroui/react";
import { Link } from "@tanstack/react-router";

import { TourCard } from "./tour-card";

import { EmptyState } from "@/components/empty-state";
import { ArrowRightIcon, TourIcon } from "@/components/icons";
import { Media } from "@/components/media";
import { CartButton, CompactBar } from "@/components/layout/cart-button";
import { useScrolledPast } from "@/hooks/use-scrolled-past";
import { useLocale } from "@/contexts/locale-context";
import { useTours } from "@/features/tours/hooks/use-tours";

export function TourListPage() {
  // A tour added in M13 stays off C08 until its first publish; the seeded Pilatus draft
  // still shows as "Coming soon" (owner note, 15.10.2026). An archived tour is gone.
  const tours = useTours().tours.filter(
    (tour) => !tour.unannounced && !tour.archivedAt,
  );
  const { t } = useLocale();
  const [bannerEnd, scrolledPast] = useScrolledPast<HTMLDivElement>();

  return (
    <div className="flex flex-1 flex-col">
      <CompactBar title={t("tourDiscovery.title")} visible={scrolledPast}>
        <CartButton tone="bar" />
      </CompactBar>
      <Media alt="" className="h-[260px]" photo={tours[0]?.photos[0]}>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/70"
        />
        <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center justify-end gap-2">
          <CartButton />
        </div>
        <header className="absolute inset-x-4 bottom-10 flex flex-col gap-1 text-white">
          <h1 className="font-serif text-display">
            {t("tourDiscovery.title")}
          </h1>
          <p className="text-body text-white/85">{t("tourDiscovery.intro")}</p>
        </header>
      </Media>
      <div ref={bannerEnd} aria-hidden className="h-px" />
      <div className="relative -mt-6 flex flex-col gap-5 rounded-t-3xl bg-background px-4 pt-5 pb-4">
        {tours.length === 0 ? (
          <EmptyState icon={TourIcon} message={t("tourDiscovery.empty")} />
        ) : (
          <ul className="flex flex-col gap-7">
            {tours.map((tour) => (
              <li key={tour.id}>
                <TourCard tour={tour} />
              </li>
            ))}
          </ul>
        )}
        <PrivateTourEntry />
      </div>
    </div>
  );
}

/**
 * C22's entry below the list (outline step 6), shown even with no tours: two polaroids with
 * a note pinned between them (lab option C1, owner choice 15.10.2026), in the family of the
 * home Polaroid stack, then the headline and the one red primary action.
 */
function PrivateTourEntry() {
  const { t } = useLocale();
  const facts = [
    t("privateTour.entry.size"),
    t("privateTour.entry.dates"),
    t("privateTour.entry.planned"),
  ];
  const shots = [
    {
      photo: "lake-steamboat",
      caption: t("privateTour.entry.captionDates"),
      tilt: "-rotate-6 translate-y-3",
    },
    {
      photo: "lucerne-old-town",
      caption: t("privateTour.entry.captionGroup"),
      tilt: "rotate-3",
    },
  ];

  return (
    <section
      aria-labelledby="private-tour-entry"
      className="mt-3 flex flex-col items-center gap-5 rounded-3xl bg-hero-cream px-5 pt-6 pb-6 text-center"
    >
      {/* The polaroids are in the flow, so their height (it grows with the width) pushes the
          headline down instead of covering it; the note floats between them, above the
          captions. */}
      <div className="relative flex w-full max-w-sm justify-between pb-3">
        {shots.map((shot) => (
          <figure
            key={shot.photo}
            aria-hidden
            className={`flex w-[46%] flex-col gap-1 bg-white p-1.5 pb-2 shadow-overlay ${shot.tilt}`}
          >
            <Media alt="" className="aspect-square" photo={shot.photo} />
            <figcaption className="font-serif text-xs italic">
              {shot.caption}
            </figcaption>
          </figure>
        ))}
        <ul className="absolute start-1/2 top-[4%] z-10 flex w-[48%] -translate-x-1/2 -rotate-2 flex-col bg-[#fdf2a8] p-2 text-start font-serif text-[11px] leading-snug italic shadow-overlay min-[360px]:top-[16%] min-[360px]:w-[42%] min-[360px]:gap-0.5 min-[360px]:p-2.5 min-[360px]:text-xs min-[400px]:text-sm">
          <span
            aria-hidden
            className="absolute -top-2 start-1/2 size-4 -translate-x-1/2 rounded-full bg-accent shadow-[0_2px_3px_rgba(0,0,0,0.3)] ring-2 ring-white/60"
          />
          {facts.map((fact) => (
            <li key={fact}>· {fact}</li>
          ))}
        </ul>
      </div>
      <div className="flex max-w-[30ch] flex-col gap-1.5">
        <h2
          className="font-serif text-title text-balance"
          id="private-tour-entry"
        >
          {t("privateTour.entry.title")}
        </h2>
        <p className="text-sm text-foreground/75">
          {t("privateTour.entry.body")}
        </p>
      </div>
      <Link
        className={`${buttonVariants({ variant: "primary" })} transition-transform active:scale-[0.98]`}
        to="/tours/private-tour"
      >
        {t("privateTour.entry.action")}
        <ArrowRightIcon aria-hidden size={18} />
      </Link>
    </section>
  );
}
