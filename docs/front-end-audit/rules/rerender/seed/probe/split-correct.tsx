import { useMemo } from "react";
export function TwoMemos({ products, category, sortOrder }: { products: { category: string; price: number }[]; category: string; sortOrder: string }) {
  const filteredProducts = useMemo(() => products.filter((p) => p.category === category), [products, category]);
  const sortedProducts = useMemo(
    () => filteredProducts.toSorted((a, b) => (sortOrder === "asc" ? a.price - b.price : b.price - a.price)),
    [filteredProducts, sortOrder],
  );
  return <p>{sortedProducts.length}</p>;
}
