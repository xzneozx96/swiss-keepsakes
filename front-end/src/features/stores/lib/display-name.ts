/** Better Auth enforces no limit on a name, so the screen does. The name is shown as plain text everywhere. */
export const DISPLAY_NAME_MAX = 80

/** What the field holds, ready to send, or undefined when it is empty or too long. */
export function cleanDisplayName(value: string): string | undefined {
  const name = value.trim()

  return name.length >= 1 && name.length <= DISPLAY_NAME_MAX ? name : undefined
}

/** A user the session knows by no name: the invitee has to say how they want to be called. */
export function lacksDisplayName(user: { name?: string | null } | null | undefined): boolean {
  return user !== null && user !== undefined && !user.name?.trim()
}
