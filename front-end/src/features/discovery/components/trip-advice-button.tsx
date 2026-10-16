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
 * R19): the assistant's icon alone, named for screen readers, with a slow ripple, in the
 * assistant's gradient like the tab bar button.
 */
export function TripAdviceButton({
  above,
  clearContent = false,
}: {
  above: keyof typeof offset;
  /** Reserve in-flow room above an action bar so the last content scrolls clear of the buttons. */
  clearContent?: boolean;
}) {
  const { t } = useLocale();

  // The spacer lets the last content scroll clear of the buttons. Above an action bar it is
  // opt-in: it leaves a blank band the width of the screen, so a screen whose last content
  // has nothing at the right edge lets the buttons float over it (owner, 16.10.2026).
  const spacer =
    above === "tabBar" ? "h-14" : clearContent ? "h-[7.5rem]" : undefined;

  return (
    <>
      {spacer && <div aria-hidden className={`shrink-0 ${spacer}`} />}
      <div
        className={`pointer-events-none fixed inset-x-0 z-20 mx-auto flex max-w-[430px] flex-col items-end gap-3 px-4 ${offset[above]}`}
      >
        {/* The background music launcher stacks directly on the assistant (owner, 16.10.2026). */}
        <MusicLauncher stacked />
        {above !== "tabBar" && (
          <Link
            aria-label={t("advice.fab")}
            className="group pointer-events-auto relative flex size-14 items-center justify-center rounded-full bg-assistant text-white shadow-overlay outline-none transition-transform focus-visible:focus-ring active:scale-95"
            to="/plan"
          >
            {/* Two slow ripples, half a cycle apart, so one is always moving (owner, 14.10.2026). */}
            {[0, 1200].map((delay) => (
              <span
                key={delay}
                aria-hidden
                className="absolute inset-0 hidden rounded-full bg-[#d52b1e]/45 motion-safe:block motion-safe:animate-ping motion-safe:[animation-duration:2.4s]"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
            <AssistantIcon
              aria-hidden
              className="relative animate-sparkle"
              size={26}
              weight="Filled"
            />
          </Link>
        )}
      </div>
    </>
  );
}
