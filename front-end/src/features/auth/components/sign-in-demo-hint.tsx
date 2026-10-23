/** Prototype-bar note for presenters: which sign-in codes trigger which C05 state. */
export function SignInDemoHint() {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium">Sign-in codes</p>
      <p className="text-sm text-muted">
        Any 6 digits sign in. 000000 is a wrong code (3 tries, then a new code
        is needed); 999999 is an expired code. The code also arrives as N01 in
        Mail.
      </p>
    </div>
  )
}
