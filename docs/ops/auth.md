# Sign-in failures on the API

The API checks every Bearer token against Neon Auth's keys (`api/src/platform/http/auth.ts`, D8). This runbook covers the two ways that check fails for everyone. There is no alert yet, because Sentry arrives with staging (E2.9).

## Every signed-in request gets 401

Signed-out pages still work. The log has a `token refused` line for each request, and its `reason` is a jose error code.

| `reason` | Likely cause | Action |
| :-- | :-- | :-- |
| `ERR_JWT_CLAIM_VALIDATION_FAILED` | `NEON_AUTH_BASE_URL` belongs to another Neon branch than the SPA signs in with, so the issuer differs | Set `NEON_AUTH_BASE_URL` to the branch's value from `neon env pull`, then restart the machines |
| `ERR_JWKS_NO_MATCHING_KEY` | The token's key id is not in the key set, for example tokens from another branch | As above. A key that Neon has just rotated is fetched again after at most 30 seconds |
| `ERR_JWT_EXPIRED` for every user | The machine's clock is ahead, or the SPA does not renew tokens | Compare the machine's time with an NTP source. Check the SPA's token renewal (E2.1) |

## Every signed-in request gets 503

The log has an `http exception` line at level 50 with an `HTTPException` whose `cause` is a jose `JWKSTimeout`, a `JOSEError` or a fetch `TypeError`. The API could not fetch `<NEON_AUTH_BASE_URL>/.well-known/jwks.json`.

1. Fetch the key set from the machine: `curl -sS "$NEON_AUTH_BASE_URL/.well-known/jwks.json"`. It is public and lists one Ed25519 key.
2. If it fails, check Neon's status page and the project's Auth settings. The API recovers by itself once the fetch works again, because jose does not cache a failure. A 503 is not a sign-in failure, so the SPA has no reason to sign anyone out.
