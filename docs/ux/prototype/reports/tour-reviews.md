# Tour review submission

The completed guest booking now reuses the existing React `WriteReviewSheet`, `ReviewItem`, `ReviewableProduct`, review identity/name helpers, and shared review store. It does not create a gift order or introduce a second review form.

## Behaviour

- The button appears only for the signed-in guest's latest completed booking with no outstanding balance.
- Submitting rechecks ownership, completion, settled balance and one review per booking/tour. The same checks run again against the state supplied to the update, preventing duplicate submissions or writes after eligibility changes.
- Reviews use `productId: tour:<tourId>` and `reviewId(booking.id, productId)`. Submitted text remains in the language in which it was written.
- The completed activity timestamp is the trip completion date; commission-recorded time and original creation time provide compatibility fallbacks for older records.
- The posted review replaces the button and links to the tour detail page. Existing shared review rendering supplies rating stars, date, reviewer identity and photos.
- The existing form retains its star selector, required review text, 1,000-character limit, drawer behaviour and keyboard/accessibility primitives. Tour-specific wording is supplied through the new tour review message keys.

## Sample content

`sampleTourReviews` contains six old-town reviews and three lake reviews. Names, ratings and bilingual text are illustrative prototype data, not real customer endorsements. All completion and submission dates precede the 13 October 2026 demo clock. Three entries use existing registered photo assets: `lucerne-old-town`, `musegg-wall`, and `lake-steamboat`.

The root integration appends missing samples while preserving existing gift and submitted tour reviews. Real guest submissions are independent of these sample identities.

## Verification

Scoped lint passed for the tour review module and edited booking page. Initial typecheck identified only the shared sheet's pending `kind="tour"` prop and new global message registration, both owned by the integrating agent. Browser verification of the real drawer submission, persisted review, duplicate prevention and guest ownership belongs to the final integrated review pass.
