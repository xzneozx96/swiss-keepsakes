import type { Review } from "@/features/catalog/types";
import type { ReviewableProduct } from "@/features/reviews/hooks/use-order-reviews";
import type { TourBooking } from "../types";

import { Button, toast } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { useBookingFormat, useGroupText } from "../booking/booking-summary";
import { bookingBalance } from "../lib/selectors";

import { SurfaceCard, SurfaceCardBlock } from "@/components/surface-card";
import { useLocale } from "@/contexts/locale-context";
import { ReviewItem } from "@/features/catalog/components/review-item";
import { useProductReviews } from "@/features/catalog/hooks/use-product-reviews";
import { useDemo } from "@/features/demo";
import { demoNow } from "@/features/demo/clock";
import { WriteReviewSheet } from "@/features/reviews/components/write-review-sheet";
import { reviewId, reviewerName } from "@/features/reviews/lib/review";
import { pickText } from "@/lib/localized";

/** A completed, settled tour booking opens the same review sheet as a gift order. */
export function TourBookingReview({ booking }: { booking: TourBooking }) {
  const { state, update } = useDemo();
  const { t, language } = useLocale();
  const { date } = useBookingFormat();
  const groupText = useGroupText();
  const [isOpen, setOpen] = useState(false);
  const productId = `tour:${booking.tourId}`;
  const id = reviewId(booking.id, productId);
  const tour = state.data.tours?.tours.find(
    (item) => item.id === booking.tourId,
  );
  const review = useProductReviews(productId, { kind: "tour" }).items.find(
    (item) => item.id === id,
  );
  const product: ReviewableProduct = {
    productId,
    reviewId: id,
    name: pickText(booking.tourName, language).text,
    detail: `${date(booking.startsAt)} · ${groupText(booking)}`,
    photo: tour?.photos[0],
    isReviewed: Boolean(review),
  };
  const latest = state.data.tours?.bookings.find(
    (item) => item.id === booking.id,
  );
  const eligible =
    latest?.status === "completed" &&
    bookingBalance(latest) === 0 &&
    latest.guestId === state.data.signedInGuestId;

  if (!eligible) return null;

  const submit = (rating: Review["rating"], text: string) => {
    const current = state.data.tours?.bookings.find(
      (item) => item.id === booking.id,
    );
    const guest = state.data.guests.find(
      (item) => item.id === current?.guestId,
    );

    setOpen(false);
    if (
      !current ||
      current.status !== "completed" ||
      bookingBalance(current) !== 0 ||
      current.guestId !== state.data.signedInGuestId ||
      !guest ||
      state.data.reviews.some((item) => item.id === id) ||
      !text.trim() ||
      text.length > 1000 ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      toast.danger(t("review.failed"));

      return;
    }
    const submitted: Review = {
      id,
      productId,
      guestName: reviewerName(guest.name),
      rating,
      text: { [language]: text.trim() },
      createdAt: demoNow(state.clockStartedAt).toISOString(),
      purchasedAt: current.startsAt,
    };

    update((snapshot) => {
      const live = snapshot.data.tours?.bookings.find(
        (item) => item.id === booking.id,
      );

      if (
        live?.status !== "completed" ||
        bookingBalance(live) !== 0 ||
        live.guestId !== snapshot.data.signedInGuestId ||
        snapshot.data.reviews.some((item) => item.id === id)
      )
        return snapshot;

      return {
        ...snapshot,
        data: {
          ...snapshot.data,
          reviews: [...snapshot.data.reviews, submitted],
        },
      };
    });
    toast.success(t("review.posted"));
  };

  return (
    <>
      {review ? (
        <SurfaceCard aria-label={t("review.yours", { name: product.name })}>
          <SurfaceCardBlock>
            <h3 className="text-sm font-semibold">
              {t("review.yours", { name: product.name })}
            </h3>
            <ReviewItem layout="full" review={review} />
            {tour && (
              <Link
                className="text-sm font-semibold underline underline-offset-4"
                params={{ slug: tour.slug }}
                to="/tours/$slug"
              >
                {t("tourReviews.viewOnTour")}
              </Link>
            )}
          </SurfaceCardBlock>
        </SurfaceCard>
      ) : (
        <Button
          fullWidth
          size="lg"
          variant="secondary"
          onPress={() => setOpen(true)}
        >
          {t("review.write")}
        </Button>
      )}
      <WriteReviewSheet
        isOpen={isOpen}
        kind="tour"
        product={product}
        onOpenChange={setOpen}
        onSubmit={submit}
      />
    </>
  );
}
