# ADR-011: Keep accommodation links on the place, rendered by one component, so affiliate links need no content edit

Status: accepted
Date: 2026-10-26
Source: AD-12
Applies to: `api/src/modules/content/`, `packages/domain/src/content/`, `front-end/src/features/content/`, `front-end/src/features/tours/`, `api/src/platform/http/`

No new dependency or paid service today. A later affiliate programme means joining a network (Booking.com's own page names CJ, and secondary sources say affiliates moved to Awin in 2025. Neither source confirms Switzerland.). That is a business decision for the owner, not part of this ADR.

## Context
Accommodation places show editorial and guest reviews and a link to the hotel's site (Q30, §11.5). The platform does not sell or book stays. Later the owner may replace the link with an affiliate link without editing any story, review or pin (AC63). Disclosure of paid links is open (O33, O39).

## Decision
We will store the link once, on the accommodation place, and render every outbound hotel link through one function.

- **Outbound link value.** A place of type `accommodation` has at most one outbound link: `kind` (`direct` or `affiliate`), `url`, an optional `network` label, and a `disclosure` flag. A different URL per language is allowed as an optional override.
- **One renderer.** The server render and the browser render both build the anchor through one function in `packages/domain/src/content/`. It adds `rel="noopener"` and, for an affiliate link, `rel="sponsored noopener"` and the disclosure text.
- **Content holds references.** Stories and reviews name the place by id. A story block that links to a hotel is a place reference block, not a typed URL. The editor warns on a raw URL that matches an accommodation place's host.
- **Swap.** Changing `kind` and `url` on the place changes every page that shows it. No story, review or pin is edited (AC63).
- **Measurement.** The browser sends an `outbound_click` event (ADR-007). It carries the place id and no identifier.
- **Reserved route.** If click tracking, link rotation or network switching needs server control later, an `/out/{placeId}` redirect can sit behind the same renderer. No content changes then either.

## Consequences
- The affiliate switch is one record edit. This costs one place field and one function now.
- A direct link has no server hop and no tracking parameters. We cannot count clicks the way a network does until the affiliate step.
- A story author who pastes a raw hotel URL bypasses the model. The editor warning reduces this. It does not forbid it.
- Disclosure wording and placement stay a merchant and lawyer decision. The flag only makes it possible to show or hide.

## Assumptions
- Each accommodation has one destination at a time. If different networks must compete per visitor country, the redirect route is needed.
- Affiliate networks accept a plain deep link built from a template or a pasted tracking URL. Not checked.
- Google's `sponsored` value is the right `rel` for paid links. This is Google's published guidance, and it was not re-read for this run.
- No other place type needs an affiliate link in Phase 1.

## Considered options
- **A. Link on the place, one renderer (chosen).** Smallest change, no server hop, meets AC63.
- **B. A server redirect `/out/{id}` from day one.** Gives click counts and central swap, and adds a request, a route and a trust cost (the link preview shows our domain). Held in reserve.
- **C. A link-wrapping service that rewrites hotel URLs on the page.** A new vendor and a script on every page, and it rewrites links we do not control. Rejected.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
