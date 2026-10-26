# ADR-019: Tie a user to a partner only through an accepted invitation, in tables the partners module owns

Status: accepted
Date: 2026-10-26
Source: DM-9
Applies to: `api/src/modules/partners/`, `api/src/modules/identity/`, `api/src/modules/orders/`, `api/migrations/`

Security class. No new dependency, vendor or paid service. It follows gate D1 (guide accounts by invitation only) and ADR-010. The architecture document lists the guide sign-in link under both `identity` and `partners`, and this decision picks `partners`. Detail is in `docs/specs/001-storytelling-pivot/data-model.md`, section DM-9.

## Context
Gate D1 says the merchant invites a partner by email, the partner signs in with the existing flow, and the invitation gives the partner role. A self sign-up only ever yields a guest. ADR-010 says the `partners` module stores the link from a partner to a user id as a plain value, and that the Owner invites a guide as an Owner invites a manager. The live table `identity.store_invitations` has `role CHECK IN ('owner', 'manager')` and two partial unique indexes keyed on those roles.

## Decision
We will keep the partner link in the `partners` schema and leave `identity` untouched.

- `partners.partners` holds the partner (kind `guide`, `hotel` or `other`, a public code, a registered email).
- `partners.partner_invitations` mirrors the store invitation: lower-case email, hashed token, expiry, `accepted_at`, `revoked_at`, `invited_by`. A partial unique index allows one open invitation per partner.
- `partners.partner_accounts` has one row per partner with `user_id` (plain value), and a composite foreign key `(invitation_id, store_id, partner_id)` to the invitation. A row therefore cannot exist without an invitation for that same partner, and `UNIQUE (invitation_id)` lets an invitation be used once. An insert trigger also requires that the invitation is accepted, not revoked and not expired. The account has `revoked_at`, so a partner can lose access without losing the history. An account cannot be edited or deleted, and an accepted invitation cannot be un-accepted. Only the match between the signed-in e-mail and the invited e-mail stays in the use case, because the user's e-mail lives in `identity`.
- The `guide` capability is derived from a `partner_accounts` row, and the request actor loads it by `user_id`.
- The accept use case checks that the signed-in email equals the invited email and that Better Auth verified it, as for staff invitations (backend.md section 9).

## Consequences
- A self sign-up cannot produce a partner. No path in the database links a user to a partner except by an accepted invitation row.
- The live `identity` tables need no change, so the migration takes no lock on them.
- Two invitation families exist (store staff and partners). They differ in who they bind to and share only their shape.
- The accept use case sets `accepted_at` first and inserts the account second, in one transaction. A mismatch is possible through direct SQL, and a drift query can list it.

## Assumptions
- One partner works with one store. A guide who works with two merchants is two partner rows and, through `UNIQUE (user_id, store_id)`, one user can hold both.
- A partner has at most one account.
- The runtime role does not insert into `partner_accounts` except through the accept use case.
- Gate D1 stays as answered.

## Considered options
- **Add `'partner'` to the role CHECK of `identity.store_invitations`.** Reuses the table, but a partner is not a store member, the two partial unique indexes would need a third, and the change takes a short exclusive lock on a live table. Rejected for now, and the migration plan keeps the lock and rollback written down if the owner prefers it.
- **A `user_id` column on `partners.partners`.** Fewer tables, and nothing proves the link came from an invitation. Rejected.

## History
- 2026-10-26 proposed
- 2026-10-26 accepted (gate DESIGN)
