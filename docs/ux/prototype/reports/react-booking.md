# React guest booking implementation

Status: built, awaiting integration verification and owner review. Updated 13 October 2026.

## Delivered

- C11 review page reads the current departure and participants from the shared tour draft. It shows per-age-group price lines, first payment, remaining balance, deadline, current cancellation policy and contact fields. Fields persist through the existing demo state. Booking creation uses the existing sign-in gate and shared tour actions.
- C12 tour adapter supplies the existing `ProviderPage` with a typed `PaymentView`; the payment provider has not been redesigned or duplicated. Failed, processing, blocked and successful outcomes use the tour domain actions. Successful payments open confirmation. Double taps are guarded synchronously.
- C13 confirmation shows independent booking/payment status, meeting point, reference, group, paid amount, remaining balance and deadline. It reuses the existing optional `TripProfile` and hook.
- C16 guest booking detail filters by both booking ID and signed-in guest ID. It shows the booking summary, independent statuses, payment history, activity timeline, balance and recovery actions. Expired holds offer rebooking. No-show suppresses payments, completion and review. Completed bookings show honest review eligibility without calling the gift-review API.
- Account bookings list links to actual booking detail routes and reuses the shared labels, media, empty state and group summary.
- English and Swiss German messages are exported for integration in the existing global dictionaries.

## Component reuse

Existing `CompactBar`, `BackButton`, `Media`, `EmptyState`, `StatusChip`, `BookingStatusLabels`, `ProviderPage`, `TripProfile`, `SignInPrompt`, `useRequireSignIn`, `useDemo`, `useTours`, `useTourActions`, and money formatting. Forms and actions use the existing HeroUI Form, TextField, Label, Input, Alert and Button components. No standalone HTML or separate local-storage model was added.

## Verification

`npx eslint src/features/tours/booking --fix` completed successfully. Global typecheck, production build and browser verification are owned by the integrating session; no claim of those checks passing is made here.

## Limits

This remains a browser demo with simulated payments. Tour review collection is not connected to an actual tour review store yet; completed-booking eligibility is displayed explicitly. Merchant contact details are not present in the current tour data, so the contact section explains the booking-reference recovery path without inventing a phone number or inbox. Booking detail and confirmation display per-age-group prices from the booking snapshot; booking detail displays its snapshotted cancellation policy. Booking review uses current tour data before creation.
