# SP6. Neon Auth in the SPA served by our API on Fly

**Status: Ready, needs keys: NEON_AUTH_URL, SP6_JWT** (a JWT copied from a signed-in SPA). The iOS Safari checks need a real iPhone or BrowserStack and cannot be scripted. D8 stays open.

**Pass condition (architecture section 16).** On iOS Safari with default settings, the guest stays signed in across reloads and a day later. The API resolves the actor from the JWT, and `can()` resolves the memberships. Each limit and the email are configurable or listed as gaps for D8. If sessions don't survive on Safari, D8 moves to Better Auth inside the API before Phase 2.

## What is ready

`spikes/sp6-neon-auth/run.ts` verifies a pasted JWT with `jose` against `<NEON_AUTH_URL>/.well-known/jwks.json` and the issuer, checks EdDSA, the 900 s lifetime, a uuid `sub`, tamper and wrong-issuer rejection, optionally renewal (`SP6_JWT_LATER`) and the `neon_auth.user` row. The manual checklist (Safari persistence on a reload and a day later, Google, trusted domain, JWT field, invitation, code limits and email sender, user export) is in `spikes/sp6-neon-auth/README.md`. It was typechecked only.

## Observed

Nothing yet. Facts to confirm, from the Neon docs read for this task: the JWT plugin issues EdDSA tokens valid 15 minutes with no custom claims, from `authClient.token()` (`data.token`); a cross-origin SPA needs `fetchOptions: { credentials: 'include' }`; the docs name Safari ITP blocking third-party cookies as a limitation of cross-domain setups (F2); email codes work on shared SMTP and production needs custom SMTP; `inviteMember` sends no email unless `send_invitation_email` is enabled.

| Item | Result |
|---|---|
| Safari session across reloads and a day later | not tested |
| JWT field in the installed SDK | not tested |
| Token lifetime and renewal | not tested |
| Code expiry (10 min) and attempts (5), email sender and language | not tested |
| Staff invitation, user export | not tested |
