/** The query parameter of an invitation link, after the `#`: `#/store/onboarding?invitation=<token>` (backend.md section 8). */
export const INVITATION_PARAM = 'invitation'

/** A02. The invitation link and the sign-in return both point here, and the return never carries the token. */
export const ONBOARDING_PATH = '/store/onboarding'

/** M01 Accept an invitation (Store Manager). N18's link points here, `#/invitation?invitation=<token>`, and the sign-in return never carries the token. */
export const INVITATION_PATH = '/invitation'

/** Where a Manager who accepted goes: the merchant shell. */
export const STORE_PATH = '/store'
