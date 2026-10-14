import type { Tour } from "../types";

import { Accordion, Button, buttonVariants } from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";

import { EmptyState } from "@/components/empty-state";
import {
  ClockIcon,
  InfoIcon,
  PayLaterIcon,
  PickupIcon,
  TourIcon,
} from "@/components/icons";
import { BackButton, CompactBar } from "@/components/layout/cart-button";
import {
  ListingDetailHeader,
  ListingFavouriteButton,
} from "@/components/listings/listing-detail-header";
import { ListingReviews } from "@/components/listings/listing-reviews";
import { SellerRow } from "@/features/catalog/components/seller-row";
import { useFavourites } from "@/features/catalog/hooks/use-favourites";
import { useProductReviews } from "@/features/catalog/hooks/use-product-reviews";
import { shop } from "@/features/catalog/seed";
import { PhotoGallery } from "@/components/photo-gallery";
import { RouterLink } from "@/components/router-link";
import { useLocale } from "@/contexts/locale-context";
import { zurichDate } from "@/features/catalog/lib/pickup";
import { useDemo } from "@/features/demo";
import { useTours } from "@/features/tours/hooks/use-tours";
import {
  availableSeats,
  upcomingDepartures,
} from "@/features/tours/lib/selectors";
import { ageBandLabels } from "@/features/tours/discovery/age-bands";
import { TripAdviceButton } from "@/features/discovery/components/trip-advice-button";
import { TourItineraryMap } from "@/features/tours/map/tour-itinerary-map";
import { useBack } from "@/hooks/use-back";
import { useScrolledPast } from "@/hooks/use-scrolled-past";
import { formatMoney, formatShortDate } from "@/lib/format";
import { pickText } from "@/lib/localized";

export function TourDetailPage({ slug }: { slug: string }) {
  const { tours } = useTours();
  const { t } = useLocale();
  const tour = tours.find((item) => item.slug === slug);

  if (!tour?.published)
    return (
      <EmptyState
        action={{ label: t("tourDiscovery.browse"), to: "/tours" }}
        icon={TourIcon}
        message={t("tourDiscovery.notFound")}
      />
    );

  return <TourDetail tour={tour} />;
}

function TourDetail({ tour }: { tour: Tour }) {
  const { t, language, intlLocale } = useLocale();
  const { state } = useDemo();
  const { data, now } = useTours();
  // The first pickup place is the shop itself, as on C03's seller row.
  const shopPlace = state.data.pickupPlaces[0];
  const navigate = useNavigate();
  const reviews = useProductReviews(`tour:${tour.id}`, { kind: "tour" });
  const { isFavourite, toggle } = useFavourites();
  const saved = isFavourite(`tour:${tour.id}`);
  const favourite = {
    isSaved: saved,
    onToggle: () => toggle(`tour:${tour.id}`),
    label: t(saved ? "card.unsave" : "card.save", {
      name: pickText(tour.name, language).text,
    }),
  };
  const plural =
    new Intl.PluralRules(intlLocale).select(reviews.count) === "one"
      ? "one"
      : "other";
  const [photoEnd, scrolledPast] = useScrolledPast<HTMLDivElement>();
  const name = pickText(tour.name, language);
  const text = (value: Tour["name"]) => pickText(value, language).text;
  const upcoming = upcomingDepartures(data, tour.id, now);
  const bookable = upcoming.filter((d) => availableSeats(data, d.id, now) > 0);
  const next = bookable[0];
  const date = (iso: string) =>
    formatShortDate(zurichDate(new Date(iso)), zurichDate(now), intlLocale);
  // Departures may differ in payment policy; say so instead of showing only the next one.
  const policies = [...new Set(bookable.map((d) => d.policy))];
  const policyTexts = policies.map((policy) =>
    t(`tourDiscovery.policy.${policy}`),
  );
  const policySummary =
    policies.length > 1
      ? t("tourDiscovery.policy.variesShort")
      : (policyTexts[0] ?? t("tourDiscovery.noDates"));
  const ages = ageBandLabels(tour.ageBands, t);
  const back = useBack(() => void navigate({ to: "/tours", replace: true }));
  const sections = [
    {
      id: "meeting",
      title: t("tourDiscovery.meeting"),
      body: text(tour.meetingPoint),
    },
    {
      id: "conditions",
      title: t("tourDiscovery.conditions"),
      body: text(tour.conditions),
    },
    {
      id: "payment",
      title: t("tourDiscovery.payment"),
      body:
        policies.length > 1 ? (
          <div className="flex flex-col gap-3">
            <p>{t("tourDiscovery.policy.varies")}</p>
            <ul className="flex flex-col gap-3">
              {policies.map((policy, index) => (
                <li key={policy} className="flex flex-col gap-0.5">
                  <span className="font-semibold">
                    {bookable
                      .filter((d) => d.policy === policy)
                      .map((d) => date(d.startsAt))
                      .join(" · ")}
                  </span>
                  <span>{policyTexts[index]}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          policySummary
        ),
    },
    {
      id: "cancellation",
      title: t("tourDiscovery.cancellation"),
      body: text(tour.cancellationPolicy),
    },
  ];
  const fallback = [
    tour.name,
    tour.summary,
    tour.description,
    tour.meetingPoint,
    tour.conditions,
    tour.excluded,
    tour.cancellationPolicy,
    ...tour.included,
    ...tour.itinerary.flatMap((stop) => [stop.name, stop.description]),
  ]
    .map((value) => pickText(value, language))
    .find((value) => value.isFallback);

  return (
    <div className="flex flex-1 flex-col">
      <CompactBar
        leading={<BackButton label={t("tourDiscovery.back")} onPress={back} />}
        title={name.text}
        visible={scrolledPast}
      >
        <ListingFavouriteButton favourite={favourite} tone="bar" />
      </CompactBar>
      <PhotoGallery
        className="aspect-[4/3.4]"
        labels={{
          gallery: t("tourDiscovery.gallery", { name: name.text }),
          photo: (n, count) => t("tourDiscovery.photo", { n, count }),
          previous: t("tourDiscovery.previous"),
          next: t("tourDiscovery.nextPhoto"),
          close: t("tourDiscovery.close"),
        }}
        photos={tour.photos}
      >
        <div className="pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+12px)] z-10 flex items-center gap-2 [&>*]:pointer-events-auto">
          <BackButton
            label={t("tourDiscovery.back")}
            tone="pill"
            onPress={back}
          />
          <span className="flex-1" />
          <ListingFavouriteButton favourite={favourite} tone="pill" />
        </div>
      </PhotoGallery>
      <div ref={photoEnd} aria-hidden className="h-px" />
      <div className="relative -mt-6 flex flex-1 flex-col rounded-t-3xl bg-background px-6 pt-7 pb-5">
        <ListingDetailHeader
          name={name.text}
          stats={{
            primary: {
              value: t("tourDiscovery.duration", {
                hours: tour.durationMinutes / 60,
              }),
              label: t("tourDiscovery.durationLabel"),
            },
            rating: reviews.count
              ? { value: reviews.averageText, label: reviews.averageLabel }
              : {
                  value: t("detail.stats.new"),
                  label: t("detail.reviews.none"),
                },
            hasRating: reviews.count > 0,
            ratingValue: reviews.average,
            reviews: {
              value: String(reviews.count),
              label: t(`detail.stats.reviews.${plural}`),
            },
          }}
          subtitle={text(tour.summary)}
        />
        <section className="py-5">
          <SellerRow
            address={shopPlace.address}
            contacts={[
              {
                kind: "call",
                label: t("detail.seller.call"),
                href: `tel:${shop.phone.replace(/\s/g, "")}`,
              },
              {
                kind: "email",
                label: t("detail.seller.email"),
                href: `mailto:${shop.email}?subject=${encodeURIComponent(t("detail.seller.emailSubject", { name: name.text }))}`,
              },
              {
                kind: "directions",
                label: t("detail.seller.directions"),
                href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shopPlace.address)}`,
              },
            ]}
            hours={text(shopPlace.openingHours)}
            name={shop.name}
            sub={t("tourDetail.operatorSub")}
            title={t("tourDetail.operatorTitle", { shop: shop.name })}
            visitLabel={t("detail.seller.visit")}
          />
        </section>
        <ul className="flex flex-col gap-5 border-t border-separator py-7">
          {[
            {
              icon: ClockIcon,
              title: t("tourDiscovery.duration", {
                hours: tour.durationMinutes / 60,
              }),
              body: t("tourDiscovery.smallGroup"),
            },
            {
              icon: PickupIcon,
              title: t("tourDiscovery.meeting"),
              body: text(tour.meetingPoint),
            },
            {
              icon: PayLaterIcon,
              title: t("tourDiscovery.payment"),
              body: policySummary,
            },
          ].map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <Icon aria-hidden className="mt-0.5 shrink-0" size={26} />
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold">{title}</span>
                <span className="text-sm text-muted">{body}</span>
              </div>
            </li>
          ))}
        </ul>
        {fallback && (
          <p className="flex items-start gap-2 border-t border-separator pt-7 text-sm">
            <InfoIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
            {t(
              fallback.language === "en"
                ? "tourDiscovery.onlyInEnglish"
                : "tourDiscovery.onlyInGerman",
            )}
          </p>
        )}
        <section
          className={`flex flex-col gap-3 py-7 ${fallback ? "" : "border-t border-separator"}`}
        >
          <h2 className="font-serif text-title">{t("tourDiscovery.about")}</h2>
          <p className="text-body">{text(tour.description)}</p>
        </section>
        <ListingReviews
          id="tour-reviews"
          reviews={{
            ...reviews,
            title: t("detail.reviews.title"),
            favourite: reviews.isFavourite
              ? {
                  title: t("detail.favourite.title"),
                  body: t("tourDetail.favouriteBody", {
                    rating: reviews.averageText,
                  }),
                }
              : undefined,
            showAllLabel: t(`detail.reviews.showAll.${plural}`, {
              count: reviews.count,
            }),
            showMoreLabel: t("detail.reviews.showMore"),
            overallLabel: t("detail.reviews.overall"),
            sheetTitle: t("detail.reviews.listTitle", { name: name.text }),
            closeLabel: t("detail.sheet.close"),
            rule: t("tourDetail.reviewsRule"),
            empty: t("tourDiscovery.noReviews"),
          }}
        />
        <section className="flex flex-col gap-4 border-t border-separator py-7">
          <TourItineraryMap key={tour.id} tour={tour} />
        </section>
        <section className="flex flex-col gap-3 border-t border-separator py-7">
          <h2 className="font-serif text-title">
            {t("tourDiscovery.included")}
          </h2>
          <ul className="list-disc space-y-2 ps-5 text-body">
            {tour.included.map((item, index) => (
              <li key={index}>{text(item)}</li>
            ))}
          </ul>
          <h3 className="pt-2 font-semibold">{t("tourDiscovery.excluded")}</h3>
          <p className="text-sm text-muted">{text(tour.excluded)}</p>
        </section>
        <section className="flex flex-col gap-3 border-t border-separator py-7">
          <h2 className="font-serif text-title">{t("tourDiscovery.prices")}</h2>
          <dl className="space-y-3 text-sm">
            {[
              {
                label: t("tourDiscovery.adults"),
                ages: ages.adults,
                price: tour.adultPrice,
              },
              {
                label: t("tourDiscovery.children"),
                ages: ages.children,
                price: tour.childPrice,
              },
              {
                label: t("tourDiscovery.infants"),
                ages: `${ages.infants} · ${t("tourDiscovery.noSeat")}`,
                price: tour.infantPrice,
              },
            ].map((row) => (
              <div key={row.label} className="flex justify-between gap-3">
                <dt className="flex flex-col">
                  {row.label}
                  <span className="text-xs text-muted">{row.ages}</span>
                </dt>
                <dd className="font-semibold tabular-nums">
                  {formatMoney(row.price / 100, intlLocale)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted">{t("tourDiscovery.sample")}</p>
        </section>
        <Accordion
          allowsMultipleExpanded
          className="border-t border-separator [&_.accordion\_\_body-inner]:px-0 [&_.accordion\_\_trigger]:px-0 [&_.accordion\_\_trigger]:py-5"
        >
          {sections.map((section) => (
            <Accordion.Item key={section.id} id={section.id}>
              <Accordion.Heading>
                <Accordion.Trigger>
                  <span className="flex-1 text-start font-serif text-card-title">
                    {section.title}
                  </span>
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className="text-sm">
                  {section.body}
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
        {!next && (
          <EmptyState
            action={{ label: t("tourDiscovery.browse"), to: "/tours" }}
            icon={TourIcon}
            message={t(
              upcoming.length > 0
                ? "tourDiscovery.soldOutBody"
                : "tourDiscovery.noDatesBody",
            )}
          />
        )}
      </div>
      <TripAdviceButton above="actionBar" />
      <div className="sticky bottom-0 z-30 flex items-center gap-3 border-t border-separator bg-background px-6 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold tabular-nums">
            {formatMoney(tour.adultPrice / 100, intlLocale)}
          </span>
          <span className="text-xs text-muted">
            {next
              ? date(next.startsAt)
              : t(
                  upcoming.length > 0
                    ? "tourDiscovery.soldOut"
                    : "tourDiscovery.noDates",
                )}
          </span>
        </div>
        {next ? (
          <RouterLink
            className={buttonVariants({ size: "lg" })}
            params={{ slug: tour.slug }}
            to="/tours/$slug/book"
          >
            {t("tourDiscovery.choose")}
          </RouterLink>
        ) : (
          <Button isDisabled size="lg">
            {t("tourDiscovery.choose")}
          </Button>
        )}
      </div>
    </div>
  );
}
