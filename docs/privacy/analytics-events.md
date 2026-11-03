# Analytics events: what the guest site sends

This note lists what the guest site sends to PostHog, what it never sends, and who reads it. It is the input for the lawyer review in E9.6, together with O32 and O33. The decision behind it is [ADR-032](../adr/ADR-032-posthog-eu-for-anonymous-events-read-by-staff.md). The code is in `front-end/src/lib/analytics/`.

## When events are sent

The sender is on in development and staging only. In production it is off until O32 is answered. Off means the browser never loads PostHog and sends no request.

A key and a switch control this:

- `VITE_POSTHOG_KEY` is the PostHog EU project key. Without it, nothing is sent.
- `VITE_POSTHOG_ENABLED` must be exactly `true`.
- `VITE_SITE_ENV` must be `development`, `staging` or `test`. A missing, `production` or unknown value counts as production, so a host that forgets to set it sends nothing.

Pages under `/store`, `/partner`, `/admin` and the other private paths send nothing. A signed-in merchant browsing the guest site sends nothing either. While the browser does not yet know whether the visitor is a merchant, it sends nothing.

## What is sent

Six events, and no others:

| Event | When |
|---|---|
| `page_view` | A guest page opens. |
| `pin_open` | A guest opens a pin on the map. The automatic first card does not count. |
| `pin_to_story_click` | A guest follows a story link on a pin's sheet. |
| `outbound_click` | A guest follows the website link on a pin's sheet. |
| `story_view` | A story page shows a story. Not called yet. |
| `product_view` | A keepsake page shows a keepsake. Not called yet. |

Each event carries only these properties, and only these values:

| Property | Values | Present |
|---|---|---|
| `page_type` | `home`, `stories`, `story`, `place`, `map`, `tours`, `tour`, `keepsakes`, `keepsake`, `other` | Always |
| `content_id` | The id of one pin, story or keepsake (a UUID) | Only on `pin_open`, `pin_to_story_click`, `outbound_click`, `story_view` and `product_view` |
| `language` | `en`, `de` | Always |
| `referrer_class` | `search`, `partner`, `social`, `direct`, `other` | Always |
| `device_class` | `phone` (under 640 px), `tablet` (under 1024 px), `desktop`, `other` | Always |
| `segment` | `short_stay`, `multi_day` | Only when the guest answered onboarding |
| `interests` | Any of `history-culture`, `food-drink`, `lake-mountains`, `shopping-keepsakes`, `local-activities` | Only when the guest answered onboarding |

The browser works out `referrer_class` once per visit, from the referrer and a `utm_medium=partner` or `utm_source=partner` tag. The referrer itself is not sent. `device_class` comes from the screen width.

PostHog's client also adds three technical fields to each event:

- `token` is the project key.
- `distinct_id` is a random visitor id. It lives in the page's memory only. It is gone on reload, and the same person gets a new id on every visit.
- `$process_person_profile` is always `false`, so PostHog creates no person profile.

## What is not sent

- The page URL, the path, the referrer and the user agent.
- Any other property that PostHog normally adds, including every property whose name starts with `$`, except `$process_person_profile`.
- Account, order, partner and referral ids, and any free text.
- Any person property, and any call that identifies a visitor.

The function `allowListBeforeSend` in `allow-list.ts` enforces this list in the browser. It drops an event that has an unknown name, an unknown property, or a value outside the lists above. It never repairs an event.

PostHog stores nothing on the device. The sender uses memory persistence, so it writes no cookie, no `localStorage` and no `sessionStorage`. It turns off autocapture, session recording, surveys, feature flags, heatmaps, error capture and every setting that loads extra scripts.

## What PostHog still sees

The visitor's IP address reaches PostHog's servers with every request. The PostHog project setting "Discard client IP data" keeps it from being stored. That setting is not checked from our code. The owner sets it in the PostHog EU project, and the lawyer should confirm it. Retention of events is also a PostHog project setting, and the value is open (O14).

## Who reads it

Our team reads the events in PostHog EU (`eu.i.posthog.com`). There is no server-side sender, no proxy and no copy of the events in our database.

## What our database holds

`order_submit` is never sent to PostHog. The API keeps one table of counts instead, `analytics.daily_funnels`. Each row holds a day (Europe/Zurich), a referrer class, an optional segment and a number of orders. It holds no account, order, partner, referral, session, address or exact time.

## Where the code will call the helpers

- The story page (E4.4) calls `trackStoryView(storyId, language)`.
- The keepsake page (E6.4) calls `trackProductView(keepsakeId, language)`.

Both helpers are in `front-end/src/lib/analytics/helpers.ts`. They send an id and nothing else, and never a price.

## Open points for the lawyer

- Whether a consent prompt is needed before production use (O32). The code supports PostHog's opt-in and opt-out calls, but does not call them yet.
- Whether `segment` and `interests` are acceptable as anonymous values (O32, O33).
- Whether the IP setting at PostHog is enough.
