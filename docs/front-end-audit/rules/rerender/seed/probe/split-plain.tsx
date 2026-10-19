export function Plain({ products, category, sortOrder }: { products: { category: string; price: number }[]; category: string; sortOrder: string }) {
  const filtered = products.filter((p) => p.category === category);
  const sorted = filtered.toSorted((a, b) => (sortOrder === "asc" ? a.price - b.price : b.price - a.price));
  return <p>{sorted.length}</p>;
}
export function PlainUsed({ products, category, sortOrder }: { products: { category: string; price: number }[]; category: string; sortOrder: string }) {
  const filtered = products.filter((p) => p.category === category);
  const sorted = filtered.toSorted((a, b) => (sortOrder === "asc" ? a.price - b.price : b.price - a.price));
  return <p>{sorted.length}{filtered.length}</p>;
}
