import { Button } from "@heroui/react";

import { useLocale } from "@/contexts/locale-context";

/** Account tab, signed out: one sentence and one action that opens the C05 sheet. */
export function SignInPrompt({ onSignIn }: { onSignIn: () => void }) {
  const { t } = useLocale();

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-heading">{t("auth.account.signedOutTitle")}</h2>
      <p className="text-sm text-muted">{t("auth.account.signedOutText")}</p>
      <Button fullWidth size="lg" onPress={onSignIn}>
        {t("auth.account.signIn")}
      </Button>
    </section>
  );
}

/** Account tab, signed in: who is signed in, and sign out. */
export function ProfileCard({
  name,
  email,
  onSignOut,
}: {
  name: string;
  email: string;
  onSignOut: () => void;
}) {
  const { t } = useLocale();

  return (
    <section className="flex items-center gap-4">
      <span
        aria-hidden
        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-foreground text-xl font-semibold text-background"
      >
        {name.charAt(0)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-heading">{name}</span>
        <span className="truncate text-sm text-muted">{email}</span>
      </div>
      <Button size="sm" variant="tertiary" onPress={onSignOut}>
        {t("auth.account.signOut")}
      </Button>
    </section>
  );
}
