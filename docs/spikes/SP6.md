# SP6. Neon Auth in the SPA served by our API on Fly

**Status: Scripted part answered on Neon; manual iOS Safari checklist still open.** The JWKS fetch, a real JWT and its verification ran against the operator's project. The iOS Safari checks need a real iPhone or BrowserStack and cannot be scripted. D8 stays open.

**Pass condition (architecture section 16).** On iOS Safari with default settings, the guest stays signed in across reloads and a day later. The API resolves the actor from the JWT, and `can()` resolves the memberships. Each limit and the email are configurable or listed as gaps for D8. If sessions don't survive on Safari, D8 moves to Better Auth inside the API before Phase 2.

## What ran (NEON)

`spikes/sp6-neon-auth/run.ts` fetched `NEON_AUTH_JWKS_URL`, then (no `SP6_JWT` given) created a throwaway user through the Better Auth REST API, took the session cookie, fetched a JWT, verified it with `jose`, and deleted the user. The manual checklist is in `spikes/sp6-neon-auth/README.md`.

## Observed (NEON Auth, throwaway user)

Run twice with the same results: first against the `production` branch's Auth, then (after the env file was repointed by the operator) against the `development` branch's Auth. Each time the throwaway user was deleted afterwards and `neon_auth.user` was checked to hold no test row.


| Item | Result |
|---|---|
| JWKS | public, HTTP 200, one key: EdDSA / Ed25519, with `kid` |
| `POST <NEON_AUTH_BASE_URL>/sign-up/email` (`origin` header = the auth origin) | HTTP 200, **no email code needed**; `emailVerified: false`; also sets the session cookie `__Secure-neon-auth.session_token` (SameSite=None, Partitioned, 7 days) |
| `GET <NEON_AUTH_BASE_URL>/token` with the cookie | HTTP 200 `{ token }`: the JWT field over REST is `token` |
| Signature and issuer | verifies with `jose` against the JWKS; `iss` is the origin of the Auth URL (a `neonauth` host, not the database host); tampered signature and wrong issuer are rejected |
| Token lifetime (`exp - iat`) | **900 s** (15 minutes) |
| Claims | aud, banExpires, banReason, banned, createdAt, email, emailVerified, exp, iat, id, iss, name, role, sub, updatedAt (so the claims are not "no custom claims": they carry the user's profile) |
| `sub` | a uuid, resolves to a row in `neon_auth.user` (checked over the direct connection) |
| Deleting the user | `POST /delete-user` returns **404** (not enabled on the managed service). Deleted with `neon neon-auth user delete <id> --project-id ... --branch ...`; `neon_auth.user` has no test row left |

Findings for D8: open email+password sign-up is on by default and needs no verification, so a bot can create users; decide whether to require verification or disable it. Users cannot delete themselves through the API. Renewal (`SP6_JWT_LATER`), the SDK field in the SPA (`session.token` vs `access_token` vs `authClient.token()`), invitations, code limits (10 min, 5 attempts), email sender and the user export were not tested.

| Item | Result |
|---|---|
| Safari session across reloads and a day later | not tested |
| JWT field in the installed SDK | REST: `token` from `/token`; SDK not tested |
| Token lifetime | 900 s; renewal not tested |
| Code expiry (10 min) and attempts (5), email sender and language | not tested |
| Staff invitation, user export | not tested |

## Email code checks on development, 19.10.2026

Run by the coordinator against `development` with the owner's real inbox.

| Check | Result | UX L327 asks | Verdict |
|---|---|---|---|
| Code sign-in end to end | `POST /sign-in/email-otp` with a fresh code returned 200 and a session. A new user row was created with `emailVerified = true`. | Code sign-in creates the guest | Pass |
| Code lifetime | A code used 8 min 34 s after sending returned 400 `OTP_EXPIRED`. A code used after 34 s worked. | 10 minutes | Gap: under 8.5 minutes, probably the 5-minute default |
| Wrong attempts | 3 wrong codes are allowed. The 4th returns 403 `TOO_MANY_ATTEMPTS` and the code stops working. A per-IP limit also returns 429. | 5 attempts | Gap: 3 attempts |
| Password sign-up | Switched off on all branches. `POST /sign-up/email` returns 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`. | Google or emailed code only (D8) | Pass |
| Session to JWT | `GET /token` needs the session cookie. A bearer session token gets 401. The SDK does this for the SPA. | | Note for E2.1 |

The Neon CLI exposes no email code settings, so the lifetime and attempt gaps go to D8 as owner decisions.
