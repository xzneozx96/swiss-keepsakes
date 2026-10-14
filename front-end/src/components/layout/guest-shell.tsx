import type { IconComponent } from "@/components/icons";

import { Link, useMatches } from "@tanstack/react-router";

import {
  AccountIcon,
  ExploreIcon,
  GiftIcon,
  TourIcon,
} from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { GuestAvatar } from "@/features/account/components/guest-avatar";
import { useDemo } from "@/features/demo";

type GuestNavTarget = "/" | "/gifts" | "/tours" | "/account";

const navItems: {
  to: GuestNavTarget;
  label: "nav.explore" | "nav.gifts" | "nav.tours" | "nav.account";
  icon: IconComponent;
}[] = [
  { to: "/", label: "nav.explore", icon: ExploreIcon },
  { to: "/gifts", label: "nav.gifts", icon: GiftIcon },
  { to: "/tours", label: "nav.tours", icon: TourIcon },
  { to: "/account", label: "nav.account", icon: AccountIcon },
];

/**
 * Guest app frame (UX spec §3.1), built to feel like a native app (owner request):
 * a phone-width column (max 430px; centred like a phone on larger screens), no website
 * header (each screen owns its top area), and a translucent tab bar with four tabs.
 * Detail screens (route staticData `hideTabBar`) hide the tab bar for their own action bar.
 */
export function GuestShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const { state } = useDemo();
  // 1.12s: a signed-in guest with a profile photo sees it on the Account tab (Instagram pattern).
  const photoGuest = state.data.guests.find(
    (g) => g.id === state.data.signedInGuestId && g.avatar,
  );
  const hideTabBar = useMatches({
    select: (matches) => matches.some((m) => m.staticData.hideTabBar),
  });
  const ownsBottomSpace = useMatches({
    select: (matches) => matches.some((m) => m.staticData.ownsBottomSpace),
  });

  return (
    <div className="flex flex-1 justify-center bg-default/60">
      <div className="relative flex w-full max-w-[430px] flex-1 flex-col bg-background sm:shadow-overlay">
        <main
          className={
            ownsBottomSpace
              ? "flex flex-1 flex-col"
              : "flex-1 pb-[calc(env(safe-area-inset-bottom,0px)+88px)]"
          }
        >
          {children}
        </main>

        {!hideTabBar && (
          <nav
            aria-label={t("nav.guest.label")}
            className="fixed bottom-0 z-30 w-full max-w-[430px] border-t border-separator/70 bg-surface/85 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl"
          >
            <ul className="grid grid-cols-4">
              {navItems.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    activeOptions={{ exact: to === "/" }}
                    className="flex h-[58px] flex-col items-center justify-center gap-0.5 text-[11px] leading-4 font-medium text-muted select-none outline-none focus-visible:focus-ring active:opacity-70 data-[status=active]:text-accent"
                    to={to}
                  >
                    {({ isActive }) => (
                      <>
                        {/* Native tab pattern: the active tab's icon fills and takes the tint (accent = selection). */}
                        {to === "/account" && photoGuest ? (
                          <GuestAvatar
                            className={`size-[26px] ${isActive ? "ring-2 ring-accent ring-offset-1 ring-offset-surface" : ""}`}
                            guest={photoGuest}
                          />
                        ) : (
                          <Icon
                            size={26}
                            weight={isActive ? "Filled" : "Outline"}
                          />
                        )}
                        {t(label)}
                      </>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}
