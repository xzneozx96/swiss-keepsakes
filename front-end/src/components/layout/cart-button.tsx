import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { cartFlight, prefersReducedMotion } from "@/components/fly-to-cart";
import { BackIcon, CartIcon, SearchIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { useCart } from "@/features/cart/hooks/use-cart";
import { pluralCategory } from "@/lib/format";

const roundAction =
  "flex size-11 items-center justify-center rounded-full outline-none transition-transform focus-visible:focus-ring active:scale-95";

/**
 * "floating" sits on a banner (white pill with shadow); "pill" sits on a product photo
 * (the product card's pill, owner request); "glass" is the earlier frosted glass, kept
 * for the hero Lab; "bar" sits in the compact bar.
 */
type ActionTone = "floating" | "pill" | "glass" | "bar";

const toneClass: Record<ActionTone, string> = {
  floating: "bg-surface/90 text-foreground shadow-surface backdrop-blur",
  pill: "pill",
  glass: "glass",
  bar: "bg-transparent text-foreground",
};

/**
 * Round cart action for a screen's top area; 44px touch target, item count as a badge.
 * After an add, the badge keeps the old count until the flying item lands, then pops.
 */
export function CartButton({ tone = "floating" }: { tone?: ActionTone }) {
  const { t, intlLocale } = useLocale();
  const { count } = useCart();
  const [shown, setShown] = useState(count);
  const previous = useRef(shown);
  const badge = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (count === shown) return;
    let live = true;

    void cartFlight().then(() => {
      if (live) setShown(count);
    });

    return () => {
      live = false;
    };
  }, [count, shown]);

  useEffect(() => {
    if (shown > previous.current && !prefersReducedMotion()) {
      badge.current?.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.4)" },
          { transform: "scale(1)" },
        ],
        { duration: 300, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
      );
    }
    previous.current = shown;
  }, [shown]);

  const countKey =
    pluralCategory(intlLocale, count) === "one"
      ? "nav.cartCount.one"
      : "nav.cartCount.other";

  return (
    <Link
      data-cart-target
      aria-label={count ? t(countKey, { count }) : t("nav.cart")}
      className={`${roundAction} ${toneClass[tone]} relative`}
      to="/cart"
    >
      <CartIcon size={22} />
      {shown > 0 && (
        <span
          ref={badge}
          aria-hidden
          className="absolute end-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 text-[11px] leading-none font-semibold text-background tabular-nums"
        >
          {shown}
        </span>
      )}
    </Link>
  );
}

/**
 * Round search action. On the discovery home it opens global search (`to`); on a list
 * screen it opens search scoped to that screen (`onPress`).
 */
export function SearchButton({
  tone = "floating",
  label,
  to,
  onPress,
}: {
  tone?: ActionTone;
  label: string;
  to?: "/search";
  onPress?: () => void;
}) {
  const className = `${roundAction} ${toneClass[tone]}`;

  if (to) {
    return (
      <Link aria-label={label} className={className} to={to}>
        <SearchIcon size={22} />
      </Link>
    );
  }

  return (
    <button
      aria-label={label}
      className={className}
      type="button"
      onClick={onPress}
    >
      <SearchIcon size={22} />
    </button>
  );
}

/** Round back action for a search bar or sub-screen top bar; 44px touch target. */
export function BackButton({
  label,
  onPress,
  tone = "bar",
}: {
  label: string;
  onPress: () => void;
  tone?: ActionTone;
}) {
  return (
    <button
      aria-label={label}
      className={`${roundAction} shrink-0 ${tone === "bar" ? "-ms-2" : ""} ${toneClass[tone]}`}
      type="button"
      onClick={onPress}
    >
      <BackIcon size={22} />
    </button>
  );
}

/**
 * Collapsing header (iOS large-title pattern): hidden while the screen's own banner is
 * in view, then fades in pinned to the top with the screen name and its actions.
 * Without a title, the children fill the bar (search mode: ← back + field). `leading`
 * goes before the title (← back on detail screens).
 * Fixed inside the 430px app frame (no left/right set, so it keeps the frame's position).
 */
export function CompactBar({
  title,
  visible,
  leading,
  children,
}: {
  title?: string;
  visible: boolean;
  leading?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden={!visible}
      className={`fixed top-0 z-30 w-full max-w-[430px] border-b border-separator/70 bg-background/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl transition-[opacity,translate] duration-200 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-2 opacity-0"
      }`}
      data-visible={visible}
      inert={!visible}
    >
      <div className="flex h-14 items-center gap-2 ps-4 pe-2">
        {leading}
        {title !== undefined && (
          <span className="min-w-0 flex-1 truncate font-serif text-card-title">
            {title}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}
