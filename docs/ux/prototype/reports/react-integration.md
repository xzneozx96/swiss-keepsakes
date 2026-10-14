# Phase 2 React integration

13 October 2026. The owner corrected the deliverable to direct React components in the existing app and requested a stop-by-stop itinerary with an interactive 3D map on the tour detail screen.

## Track the work

| Task | Ownership | Status |
| --- | --- | --- |
| Tour discovery, detail, departure/group selection | `features/tours/discovery/` | Implemented, integration checks pending |
| Guest review, payment, confirmation, booking detail and account booking list | `features/tours/booking/` | Implemented, integration checks pending |
| Merchant departures, manifest, booking detail, payment sheet and Today queue | `features/tours/merchant/` | Implemented, integration checks pending |
| Interactive 3D itinerary map | `features/tours/map/` | Implemented; codex browser-checked markers, 2D/3D toggle and DE labels |
| Shared tour demo model, seed, selectors, actions, route registration and translations | Coordinator | Integration in progress |
| Typecheck, scoped lint, build and live browser verification | Coordinator | Typecheck, lint and build clean at handover (23:20). Per-step verification resumed by Claude Orca workers |

At most three implementation workers run concurrently. Each owns a distinct feature directory. The coordinator owns shared state, global translations, routing, integration, and verification. No worktrees are used.

## Reuse the existing project

The screens inherit GuestShell and MerchantShell from their routes. They reuse PhotoGallery, Media, QuantityStepper, BackButton, CompactBar, RouterLink, StatusChip, EmptyState, ConfirmDialog, SheetFrame, the existing simulated ProviderPage, sign-in gating, TripProfile, money/date helpers, shared icons, and HeroUI compound components.

Tour records are stored inside the existing useDemo state, so persistence, role switching, language switching, and Reset remain shared with gift orders. The data extension preserves existing gift data and does not bump the demo version.

The map uses MapLibre GL and the public OpenFreeMap Liberty style. This is a new geographic component because the app did not already have one. Stop selection and map markers refer to the same itinerary data. The illustrative route is not a turn-by-turn walking instruction.

Standalone HTML design files are retained as reference and are no longer the requested implementation deliverable.

## Resume after codex quota (13 October 2026, 23:30)

Claude resumed coordination in Orca run `run_3d6297cca9f6`. Snapshot before resuming: `snapshots/pre-phase2-resume.tgz`. Brief: [worker-brief-phase2.md](../worker-brief-phase2.md).

| Worker | Steps | Dispatch |
| --- | --- | --- |
| A, discovery + data + map | 2.1–2.4 | `ctx_d56c8e1972dc` |
| B, guest booking + payment | 2.5–2.9 | `ctx_4060df1ebab3` |
| C, merchant + completion + overdue | 2.10–2.14 | `ctx_d94e392a7cde` |

Steps 2.15 and 2.16 run after these settle. Codex's reviewer finding (attendance date stored as settlement time) was already fixed: `purchasedAt: current.startsAt`.

## Result (14 October 2026)

All three workers finished with outcome succeeded. Steps 2.1–2.16 are `[~]` in `todo-phase2.md`, awaiting owner review. 2.15: 652/652 joined-up checks, 867/867 step-driver checks, tsc clean, eslint 0 errors, `vite build` OK (warning for the 1.05 MB MapLibre chunk). Owner requests handled during the run: the C09 accordion gap (an unescaped `_` in a Tailwind arbitrary variant), sample avatars instead of initials everywhere, and the Wanderlog-style in-map stop card and detail sheet (`reports/2.3-map.md`).
