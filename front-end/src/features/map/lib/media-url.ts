/**
 * The address of a published photo from its storage key. The public reads carry keys only (ADR-006), and the front end
 * has no base address for the media store yet, so there is none: a photo slot shows the place icon and the sheet has no
 * carousel until the owner decides where the address comes from (the API returning it, or one configured base). Every
 * public photo goes through this function, so that decision plugs in here.
 */
export function publicMediaUrl(_key: string): string | undefined {
  return undefined
}
