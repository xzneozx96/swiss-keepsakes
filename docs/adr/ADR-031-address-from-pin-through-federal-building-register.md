# ADR-031: Read the address of a pin from the federal building register, through our API

Status: accepted
Date: 2026-10-30
Source: owner decision, 2026-10-30 (Sprint 7, release 1, merchant Places screens)
Applies to: `api/src/modules/content/`, `packages/api-contract/`, `front-end/src/features/places/`
Amended 2026-11-02 (owner): the API asks the register once more when a call fails (timeout, network error, a status other than 200, an unreadable body), each ask with its own 3 s limit; 404 `address-not-found` is an answer and is never retried. The editor no longer stays silent: after the retry a 503 shows "Couldn't look up the address." with a Try again button, and a 404 shows "No address near the pin. Type one if it has one." Neither overwrites a typed address, and both clear when a lookup succeeds, the pin moves or the merchant types. This replaces "The editor stays silent about both answers" below.

No new dependency, key or paid service. The API makes one call to a public federal service.

## Context
A merchant sets the pin of a place by pasting a Google Maps link, by tapping the map or by dragging the pin. A Google Maps link carries the place name and the coordinates, never an address (for example `https://www.google.com/maps/place/Kapellbr%C3%BCcke/@47.0516489,8.3049602,17z/...`). The Address field of the place editor is still typed by hand, although the position already tells which building the pin is at.

The owner decided that when the pin is set, the Address field fills itself from the official Swiss building register, only when the field is empty and never over what the merchant typed.

## Decision
We will turn a pin position into a Swiss building address through our own API, using the federal building and dwelling register (GWR, layer `ch.bfs.gebaeude_wohnungs_register`) on geo.admin.ch.

- **Route.** `GET /api/store/{storeId}/address-at?lat=&lng=` for staff of the store, with the same guard as `maps-link`. It answers `{ street, houseNumber, postcode, city, formatted }`, for example `Kapellbrücke 1, 6004 Luzern`. `lat` and `lng` must lie in the Swiss bounding box (47.9 to 45.8 north, 5.9 to 10.6 east), or the answer is 400 `validation-failed`.
- **Use case, port, adapter.** Like `resolveMapsLink`: the use case `makeFindAddressAt` holds the rules, the port `AddressRegister` holds the call, and the adapter holds `fetch`. The adapter asks only `https://api3.geo.admin.ch/rest/services/api/MapServer/identify`, follows no redirect and stops after 3 s. The browser never calls geo.admin.ch, so the host is fixed in the server and the CSP of the SPA needs no change.
- **Nearest building.** The service does not sort by distance, and its `tolerance` is in screen pixels of a stated map extent, not in metres. We ask with a window that holds a 50 m radius, read the coordinates of each hit, compute the distance ourselves and keep the nearest hit within 50 m that has a street name. No building within 50 m is 404 `address-not-found`: a viewpoint or a bench has no address. The radius is 50 m and not the 25 m first proposed, because the Kapellbrücke pin from the owner's own link lies on the bridge, 46 m from the nearest entrance (Kapellbrücke 1).
- **Failures.** A timeout, a network error, a status other than 200 or a body we cannot read is 503 `address-lookup-unavailable`. ~~The editor stays silent about both answers, so the merchant types the address as before.~~ Replaced 2026-11-02: see the amendment above.
- **Nothing is stored.** The address goes into the form of the merchant, who may edit it, and is saved as the place's own Address text. We keep no copy of the register and no cache.
- **Terms of use** (General Terms of Use of the Federal Spatial Data Infrastructure, version 1 January 2025, `geo.admin.ch/en/general-terms-of-use-fsdi`). Use needs no key and no registration and is free, subject to fair use. Our use is one request each time a merchant sets a pin of a place, about a few hundred per year, far below the 20,000 users a day that the terms call fair use for a web application. The terms ask for the source on a publication of the data. We do not publish the register: the address is a merchant's editable text. Where the editor says where the text came from, it names the register in the help text. If we ever show register data on a guest screen, add "© swisstopo / BFS GWR" there. The service is best effort with no guarantee, which is why the lookup is optional.

## Consequences
- The merchant types less, and a pin in a town gets a correct Swiss address spelling.
- The address is as good as the register. A pin in a field, on a lake or on a bridge may get the address of a building 50 m away, and the merchant can correct it. Because it fills only an empty field, the worst case is one wrong line to edit.
- A place outside Switzerland, or one with no building near it, still needs a typed address.
- The server now has one more outbound dependency. It is optional and has a 3 s limit, so an outage costs the autofill and nothing else.
- Each pin move after the first, with an empty field, can send a request. The editor waits 400 ms after a drag and ignores answers that arrive late.

## Assumptions
- Phase 1 places are in Switzerland (the product is for Lucerne and fixed-departure tours), so the Swiss register covers them.
- A request volume of a few hundred per year stays inside fair use. A change to a higher volume needs a look at the terms.
- The identify service keeps its attributes (`strname`, `deinr`, `dplz4`, `dplzname`) and the `geometry` of each hit. A change is announced one month ahead (terms, 2.1), and the recorded response in the adapter test shows what we read.

## Considered options
- **A. Federal building register through our API (chosen).** Free, no key, official Swiss spelling, no terms on keeping the result, and our server holds the host.
- **B. Google Geocoding API.** Better for places that are not buildings. But it needs a paid key and billing, and Google's terms limit storing and showing geocoding results outside a Google map. Rejected.
- **C. OpenStreetMap Nominatim.** No key. But the public server allows one request a second, requires an identifying user agent and discourages use by an app with unknown traffic, so we would run into its policy or host our own. The data also holds less house-number detail than the register. Rejected.
- **D. Read the address from the pasted Google link.** The link holds the name and the coordinates only, and a tap or a drag has no link at all. Rejected.
- **E. Call geo.admin.ch from the browser.** One less hop. But it spreads the host into the SPA and the CSP, and it cannot share the 3 s limit, the 50 m rule and the parsing with a test. Rejected.

## History
- 2026-10-30 accepted (owner approved)
- 2026-11-02 amended (owner): one retry on a failed register call, and the editor says when the lookup failed (Try again) or found no building within 50 m. Cause: two 503s after 3.3 s while geo.admin.ch was slow, with an empty Address and no hint.
