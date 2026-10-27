# ADR-011: Keep outbound links on the pin, rendered by one function, so a later affiliate link needs no content edit

Status: accepted
Date: 2026-10-26
Source: AD-12
Applies to: `api/src/modules/content/`, `packages/domain/src/content/`, `front-end/src/features/content/`, `front-end/src/features/tours/`, `api/src/platform/http/`

No new dependency or paid service today. A later affiliate programme means joining a network (Booking.com's own page names CJ, and secondary sources say affiliates moved to Awin in 2025. Neither source confirms Switzerland.). That is a business decision for the owner, not part of this ADR.

**Amended 2026-10-27 (G11).** The link moves from accommodation places to any pin. A pin has at most one outbound link, a plain URL, and every outbound link renders through one function. The affiliate `kind`, `network` and `disclosure` fields, and the sponsored `rel`, wait until the first paid link exists (O33, O39). Because all links go through one function, adding them later changes no content. A hotel is a pin in a category such as "Stays" with an optional outbound link and nothing else special. The sections below are amended to match, and the affiliate wording describes the deferred step.

## Context
A pin, such as a hotel, may show a link to the venue's site and an editorial review (Q30, §11.5). The platform does not sell or book stays. Later the owner may replace the link with an affiliate link without editing any story, review or pin (AC63). Disclosure of paid links is open (O33, O39).

## Decision
We will store the link once, on the pin, and render every outbound link through one function.

- **Outbound link value (amended).** Any pin has at most one outbound link: a `url`. A different URL per language is allowed as an optional override. `kind` (`direct` or `affiliate`), `network` and `disclosure` are added when the first paid link exists.
- **One renderer.** The server render and the browser render both build the anchor through one function in `packages/domain/src/content/`. It adds `rel="noopener"`. For an affiliate link, added later, it adds `rel="sponsored noopener"` and the disclosure text.
- **Content holds references.** Stories name the pin by id. A story block that links to a venue is a pin reference block, not a typed URL. The editor warns on a raw URL that matches a pin's link host.
- **Swap.** Changing the link on the pin changes every place that shows it. No story or pin text is edited (AC63).
- **Measurement.** The browser sends an `outbound_click` event (ADR-007). It carries the pin id and no identifier.
- **Reserved route.** If click tracking, link rotation or network switching needs server control later, an `/out/{pinId}` redirect can sit behind the same renderer. No content changes then either.

## Consequences
- The later affiliate switch is one record edit. This costs one pin field and one function now.
- A direct link has no server hop and no tracking parameters. We cannot count clicks the way a network does until the affiliate step.
- A story author who pastes a raw hotel URL bypasses the model. The editor warning reduces this. It does not forbid it.
- Disclosure wording and placement stay a merchant and lawyer decision. The flag, added with the first paid link, only makes it possible to show or hide.

## Assumptions
- Each pin has one destination at a time. If different networks must compete per visitor country, the redirect route is needed.
- Affiliate networks accept a plain deep link built from a template or a pasted tracking URL. Not checked.
- Google's `sponsored` value is the right `rel` for paid links. This is Google's published guidance, and it was not re-read for this run.
- No pin has a paid link in Phase 1.

## Considered options
- **A. Link on the pin, one renderer (chosen).** Smallest change, no server hop, meets AC63.
- **B. A server redirect `/out/{id}` from day one.** Gives click counts and central swap, and adds a request, a route and a trust cost (the link preview shows our domain). Held in reserve.
- **C. A link-wrapping service that rewrites hotel URLs on the page.** A new vendor and a script on every page, and it rewrites links we do not control. Rejected.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
- 2026-10-27 amended (gate G11, `docs/decisions/2026-10-27-map-pins-and-events.md`)
