import { Link } from "@tanstack/react-router";

import { AssistantIcon } from "@/components/icons";
import { MusicLauncher } from "@/components/music-launcher";
import { useLocale } from "@/contexts/locale-context";

/** Clears the 58px tab bar on C01, or the in-flow action bar on C09 and C20. */
const offset = {
  tabBar: "bottom-[calc(env(safe-area-inset-bottom,0px)+72px)]",
  actionBar: "bottom-[calc(env(safe-area-inset-bottom,0px)+88px)]",
} as const;

/**
 * Floating entry to the AI trip assistant, bottom-right on C01, C09 and C20 (spec §3.1, D1,
 * R19): the assistant's icon alone, named for screen readers, with a slow ripple. Ink rather
 * than Swiss red: the screen's one red action stays the banner or the booking bar.
 */
export function TripAdviceButton({ above }: { above: keyof typeof offset }) {
  const { t } = useLocale();

  // The spacer lets the screen's last content scroll clear of the floating button.
  return (
    <>
      <div
        aria-hidden
        className={`shrink-0 ${above === "tabBar" ? "h-14" : "h-[7.5rem]"}`}
      />
      <div
        className={`pointer-events-none fixed inset-x-0 z-20 mx-auto flex max-w-[430px] flex-col items-end gap-3 px-4 ${offset[above]}`}
      >
        {/* The background music launcher stacks directly on the assistant (owner, 16.10.2026). */}
        <MusicLauncher stacked />
        {above !== "tabBar" && (
          <Link
            aria-label={t("advice.fab")}
            className="group pointer-events-auto relative flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-overlay outline-none transition-transform focus-visible:focus-ring active:scale-95"
            to="/plan"
          >
            {/* Two slow ripples, half a cycle apart, so one is always moving (owner, 14.10.2026). */}
            {[0, 1200].map((delay) => (
              <span
                key={delay}
                aria-hidden
                className="absolute inset-0 hidden rounded-full bg-foreground/55 motion-safe:block motion-safe:animate-ping motion-safe:[animation-duration:2.4s]"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
            <AssistantIcon
              aria-hidden
              className="relative transition-transform group-hover:rotate-12"
              size={26}
            />
          </Link>
        )}
      </div>
    </>
  );
}
