# Domain and contract (front-end and back-end)

Read this when a rule, a type or an API shape is used on both sides. The point is one source for each, so the two sides cannot disagree.

Most of this is **planned**. It follows `docs/architecture/backend.md` (a proposal pending owner review), sections 4 and 11. Today only the front-end exists and its rules live inside each feature.

## Rules

- **One home for business rules.** A status change, a price, a deadline, a permission is a pure function in the shared domain package (`packages/domain`). The server uses it to decide. The UI uses the same table to decide which buttons to show. Do not copy a rule into a component.
  - Today: pure rules are inside features, for example `front-end/src/features/orders/lib/transitions.ts` and `front-end/src/features/tours/booking/transitions.ts`. `docs/architecture/backend.md` section 4.2 moves them to `packages/domain`.
- **One schema per API shape.** Request and response schemas are Zod schemas in `packages/api-contract`. The API validates against them and the client is generated from them. Types come from `z.infer`. Never write the same shape twice, and never edit the generated client.
- **Money is an integer in the smallest unit.** Never a float. Use one formatter to show it. In this repo money is in Rappen, and `formatMoney` in `packages/domain/src/shared/format.ts` formats it.
- **Calendar days use one timezone helper.** Do not build dates with `new Date()` arithmetic in features. In this repo the helper is `zurichDate` in `packages/domain/src/dates/zurich.ts` and `zurichDayOf` in `packages/domain/src/catalog/pickup.ts`.
- **User-written text is one type with a fallback.** In this repo that is `pickText` and its `isFallback` flag in `packages/domain/src/shared/localized.ts`.
- **Errors are a contract.** The API returns RFC 9457 problem details with stable `type` codes (`docs/architecture/backend.md` D11). The front-end maps a `type` to translated copy in the feature's message files (`messages.ts` and `messages.de.ts`), because only email copy lives in `packages/i18n`, with generic copy for a `type` it does not know (`problemTypes` in `packages/api-contract` lists the known ones). It never shows a server message string.
- **Everything the UI shows is translated.** Add each string to both the English and German files. Email copy, which the SPA and the server mail templates share, is in `packages/i18n/src/en.ts` and `de.ts`. `pnpm test` fails when a key is in one language only.

## Layout the rules assume (planned)

`docs/architecture/backend.md` D16 and section 4.2 use a pnpm workspace with `front-end/`, `api/`, `packages/domain`, `packages/api-contract` and `packages/i18n`. `packages/domain` imports nothing outside itself. Each side imports from it, never the reverse.
