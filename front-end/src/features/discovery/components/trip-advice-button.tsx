import { buttonVariants } from "@heroui/react";
import { Link } from "@tanstack/react-router";

import { AssistantIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";

/** Clears the 58px tab bar on C01, or the in-flow action bar on C09 and C20. */
const offset = {
  tabBar: "bottom-[calc(env(safe-area-inset-bottom,0px)+72px)]",
  actionBar: "bottom-[calc(env(safe-area-inset-bottom,0px)+88px)]",
} as const;

/**
 * Floating "Trip advice" entry, bottom-right on C01, C09 and C20 (spec §3.1, D1). Ink rather
 * than Swiss red: the screen's one red action stays the banner or the booking bar.
 */
export function TripAdviceButton({ above }: { above: keyof typeof offset }) {
  const { t } = useLocale();

  // The spacer lets the screen's last content scroll clear of the floating button.
  return (
    <>
      <div aria-hidden className="h-16 shrink-0" />
      <div
        className={`pointer-events-none fixed inset-x-0 z-20 mx-auto flex max-w-[430px] justify-end px-4 ${offset[above]}`}
      >
        <Link
          className={`${buttonVariants({ size: "lg" })} pointer-events-auto rounded-full bg-foreground text-background shadow-overlay transition-transform hover:bg-foreground/90 active:scale-[0.97]`}
          to="/plan"
        >
          <AssistantIcon size={20} />
          {t("advice.fab")}
        </Link>
      </div>
    </>
  );
}
