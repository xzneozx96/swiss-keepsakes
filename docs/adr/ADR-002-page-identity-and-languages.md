# ADR-002: Identify pages by translation group, with language-prefixed URLs and the URL deciding the page language

Status: accepted
Date: 2026-10-26
Source: AD-3
Applies to: `front-end/src/contexts/locale-context.tsx`, `front-end/src/routes/**`, `api/src/modules/content/`, `packages/domain/src/content/`, `packages/domain/src/shared/`

No new dependency, vendor or paid service.

## Context
AC61 needs one address per page per language, and no duplicate content at the address of a missing language. AC64 and R02 need a guest who prefers German to see the English version with a notice when no German version exists, and never a mix of languages. The language today is a browser setting (`sk.language` in `locale-context.tsx`), not part of the URL. Stories already exist as one row per language version with a shared `slug` (`packages/domain/src/content/types.ts`). The owner set English as the default language on 2026-10-26 (gate D6). PRD §4.1 keeps room for several merchants, so slug scope has to be chosen now.

## Decision
We will fix these rules for every indexable page type (story, tour, keepsake).

**Amended 2026-10-27 (G11).** A place is no longer an indexable page type. Pins have no page, no hreflang alternates and no sitemap entry, and the sitemap lists no place pages. A pin link is `/{lang}/map?place={slug}`, which carries the map page's own language prefix and is not a separate page. Step 3 below applies to pin text only for the language notice (AC64), not to a URL.

1. **Translation group.** A page is a translation group. Each language version belongs to one group. hreflang alternates, language switching and "main story" references all use the group id.
2. **URL.** `/{lang}/{type}/{slug}` where `lang` is `en` or `de`. Each language version has its own slug. A version may reuse the other language's slug, and the editor proposes that. A slug is unique per type and language across the platform, not per store. Public URLs carry no store segment.
3. **A version exists** in language L when the aggregate is published and has the required fields in L. For stories that is a version row with status `published`. For tours and keepsakes it is the localized fields (`{en?, de?}`) being filled.
4. **URL decides the page language.** The page chrome and content follow the URL. The stored preference does not change the language of a page that was requested by URL, and arriving by link never overwrites the preference. Only the language switcher writes `sk.language`.
5. **Link building.** Every in-app link is built from the group and the stored preference. If the group has no version in the preferred language, the link points at the version that exists.
6. **Missing language at an address.** A request for `/{lang}/{type}/{slug}` finds the group by `(lang, slug)`. If the group has no version in `lang`, the route loader looks for the slug in the other language. If it finds a group, it throws `redirect({ statusCode: 302 })` to the existing version (the Start spike confirmed a real 302, where the Next.js spike gave 307). Otherwise it returns 404. The address of a missing language never shows the other language's text.
7. **Notice.** The SPA shows the "available in English only" notice when the stored preference is a language the group has no version in. The route's loader data carries the group's alternates so the page can decide this without a request.
8. `/` and any URL without a language prefix redirect with a loader `redirect({ statusCode: 302 })` to `/{lang}` (the home page of that language). The `/en` and `/de` home pages and the list pages (`/:lang/stories`, `/:lang/tours`, `/:lang/gifts`) must exist. The Start spike redirected to `/en/stories`, which had no index page. `lang` is the language cookie `sk_lang` when present (written only by the language switcher, with the same value as `sk.language`). Otherwise it is `de` when `Accept-Language` asks for German, and `en` in every other case. English is the default language, and `x-default` in hreflang points to English (owner gate D6, 2026-10-26, which settles O01).
9. User-written review text keeps the language it was written in and carries no language prefix of its own.

## Consequences
- The router, the sitemap, the hreflang tags and the language switcher share one resolver in `packages/domain/src/content/`.
- Existing stories keep their shared slug as the starting value. No data is lost, and German slugs can be improved later without a redirect table for pages that never had a public German URL.
- A second merchant with a colliding slug is told at create time. If the product later gives each merchant its own site area, URLs gain a store segment and old URLs redirect. This is the main thing that would make this decision wrong.
- Mixed-language chrome cannot happen on a content page. Account and store screens (no `lang` prefix) keep using the stored preference.
- The default language is English (gate D6). It sets only the target of step 8 and `x-default`.

## Assumptions
- Phase 1 has one public site with platform-wide slugs (orchestrator ruling, 2026-10-26). A later merchant with a colliding slug is told at create time. Separate public areas per merchant would need a store segment in URLs, and that is not planned.
- Only English and German exist in Phase 1 (PRD Q22).
- `sk_lang` is a functional cookie that holds only a language code, set at the visitor's own request. Whether it needs a consent notice is a question for the lawyer (O32). If it does, step 8 uses `Accept-Language` only.
- Search engines treat a 302 from an unavailable language address as temporary and index the English page at its own address.

## Considered options
- **Shared slug across languages (today's model).** One slug per group, so one link opens either. Simpler, but a German page then carries an English slug, and AC61 still holds. Kept as the editor default, not as a rule.
- **Language by query parameter or subdomain.** A parameter gives crawlers duplicate-looking URLs. A subdomain needs DNS and TLS work and a second origin for cookies. Rejected.
- **Stored preference wins over the URL.** Keeps the current behaviour, but a German visitor arriving from an English search result would see German at an English address, so the same URL shows two texts. This breaks AC61. Rejected.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
- 2026-10-27 amended (gate G11, `docs/decisions/2026-10-27-map-pins-and-events.md`)
