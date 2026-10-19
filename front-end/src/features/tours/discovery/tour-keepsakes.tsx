import { ProductCard } from "@/features/catalog/components/product-card";
import { useProductCard } from "@/features/catalog/hooks/use-product-card";
import { isPublished } from "@/features/catalog/lib/publish";
import { isSoldOut } from "@/features/catalog/lib/stock";
import { Rail } from "@/features/discovery/components/section";
import { useLocale } from "@/contexts/locale-context";
import { useDemoSelector } from "@/features/demo";

/** Guests see at most this many linked keepsakes. */
export const MAX_TOUR_KEEPSAKES = 3;

/**
 * The keepsakes the merchant linked to a tour (R21), as ordinary gift cards that open the gift
 * page. They are ordered separately, so there is no cart button and nothing joins the
 * booking. A keepsake that is a draft, archived or sold out is left out, and with none left
 * the block is not shown at all.
 */
export function TourKeepsakes({
  ids,
  variant = "page",
}: {
  ids: string[] | undefined;
  /** "page" is C09's block near the end; "confirmation" is the light reminder on C13. */
  variant?: "page" | "confirmation";
}) {
  const { t } = useLocale();
  const orders = useDemoSelector((s) => s.data.orders);
  const demoProducts = useDemoSelector((s) => s.data.products);
  const toCard = useProductCard();
  const products = (ids ?? [])
    .map((id) => demoProducts.find((p) => p.id === id))
    .filter(
      (p): p is NonNullable<typeof p> =>
        !!p && isPublished(p) && !isSoldOut(p, orders),
    )
    .slice(0, MAX_TOUR_KEEPSAKES);

  if (!products.length) return null;
  const confirmation = variant === "confirmation";

  return (
    <section
      aria-labelledby={`tour-keepsakes-${variant}`}
      className={`flex flex-col gap-3 ${confirmation ? "" : "border-t border-separator py-7"}`}
    >
      <h2
        className={confirmation ? "text-heading" : "font-serif text-title"}
        id={`tour-keepsakes-${variant}`}
      >
        {t(
          confirmation
            ? "tourDiscovery.keepsakes.confirmedTitle"
            : "tourDiscovery.keepsakes.title",
        )}
      </h2>
      <p className="text-sm text-pretty text-muted">
        {t(
          confirmation
            ? "tourDiscovery.keepsakes.confirmedIntro"
            : "tourDiscovery.keepsakes.intro",
        )}
      </p>
      <Rail label={t("tourDiscovery.keepsakes.title")}>
        {products.map((product) => (
          <li key={product.id} className="flex">
            <ProductCard {...toCard(product)} layout="carousel" />
          </li>
        ))}
      </Rail>
    </section>
  );
}
