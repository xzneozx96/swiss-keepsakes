# SP6. Neon Auth in the SPA served by our API on Fly

**Superseded on 20.10.2026.** The E2.1 WebKit run refused Neon Auth's third-party session cookie, and D8 moved to Better Auth inside our API. This spike and its checklist stay as history. `docs/spikes/SP6.md` has the result.

**What it proves.** The JWT field, its verification in the API with `jose` against the JWKS, token lifetime and renewal. The iOS Safari, Google, invitation and configuration questions are manual.

**Pass condition (architecture section 16).** On iOS Safari with default settings, the guest stays signed in across reloads and a day later. The API resolves the actor from the JWT, and `can()` resolves the memberships. Each limit and the email are configurable or listed as gaps for D8. If sessions don't survive on Safari, D8 moves to Better Auth inside the API before Phase 2.

## Run (scripted part)

```sh
npx tsx spikes/sp6-neon-auth/run.ts   # signs up a throwaway user, gets a JWT, deletes the user
SP6_JWT=<token> npx tsx spikes/sp6-neon-auth/run.ts   # or verify a JWT copied from the SPA
```

Get the token from the SPA after signing in, in the browser console: `(await authClient.token()).data.token` (Neon JWT docs: `data.token`; the React and Hono guide reads `session.token`, the authentication-flow page `session.access_token`, so also log which of the three is set and write it into SP6.md). The token lives 15 minutes, so run the script straight away. The script checks: `alg` is EdDSA, signature and issuer verify with `jose` against `<NEON_AUTH_BASE_URL>/.well-known/jwks.json` (issuer is the origin of the Auth URL), `exp - iat` is 900 s, `sub` is a uuid, a tampered signature and a wrong issuer are rejected. Optional `SP6_JWT_LATER` (same user, fetched 16 minutes or a day later) proves renewal. Optional `DATABASE_URL_UNPOOLED` checks that `sub` is a row in `neon_auth."user"`. Tokens are never printed; `sub` is shown as its first 8 characters.

## Manual checklist (write each result into docs/spikes/SP6.md)

BrowserStack (App Live, real iPhone, Safari with default settings) is an option when no iPhone is at hand. Playwright WebKit does not reproduce Safari's tracking prevention, so it does not count.

1. Deploy the SPA on Fly with the Fly domain added as a trusted domain: `neon neon-auth domain add https://<app>.fly.dev`.
2. iOS Safari, default settings: sign in with the email code; reload; close the tab and reopen; check again a day later. Repeat with Google. Record whether the session survives and which cookies are set (F2: the session cookie is third-party on our domain).
3. If it fails, try the documented workarounds (Better Auth's Safari ITP page: reverse proxy or shared parent domain) and note whether D8 moves to Better Auth inside the API.
4. Which field carries the JWT in the installed SDK: `session.token`, `session.access_token`, or `authClient.token()`.
5. Token renewal: when does the SPA get a fresh token; what happens at expiry.
6. API: resolve the actor from the JWT and run `can()` against `store_memberships` (E2.2 builds the real thing, SP6 only needs a stub).
7. Staff invitation end to end: `organization.inviteMember`, `send_invitation_email` is off by default and needs email verification at signup; accept via `/auth/accept-invitation?invitationId=`.
8. Email code limits: expiry 10 minutes and 5 attempts (UX L327) against Better Auth's defaults of 300 s and 3 (F16). Can they be changed on the managed service? Can the sender and language of the code email be configured (shared SMTP `auth@mail.myneon.app` for development, custom SMTP for production)?
9. User export: what does a dump of `neon_auth` contain (relevant to the D8 fallback move).

## Keys

`NEON_AUTH_BASE_URL` (optional `NEON_AUTH_JWKS_URL`, `SP6_JWT`, `SP6_JWT_LATER`, `DATABASE_URL_UNPOOLED`, `NEON_PROJECT_ID`, `SP6_AUTH_BRANCH`). Without `SP6_JWT` the script uses Better Auth's `POST /sign-up/email` (open sign-up, no email code), `GET /token` with the session cookie, and removes the user with `neon neon-auth user delete` (the client `/delete-user` endpoint returns 404 on the managed service), which needs `NEON_PROJECT_ID`. The JWKS is public.

## Vendor guidance applied

- `neon-auth`: Managed Better Auth with `@neondatabase/auth` (the wrapper, not bare `better-auth/client`); JWT is EdDSA, 15 minutes, no custom claims, `data.token` from `.token()`; verify against the JWKS and the issuer; trusted domains must include the Fly origin with scheme and no trailing slash; organization invitations need the settings in item 7; the skill warns not to promise third-party cookies in every browser, which is what item 2 tests.
- `neon-postgres`: `neon_auth` lives in the branch's Postgres, read through the direct connection.
