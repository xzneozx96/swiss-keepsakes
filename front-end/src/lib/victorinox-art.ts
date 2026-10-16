/**
 * Victorinox knife art: transparent cut-outs of the front of each design, from the client's
 * concept boards (16.10.2026). Keyed by design name, e.g. "swan", "furka", "finsterwald".
 * These are concept renders, not photos of real knives.
 */
const files = import.meta.glob<string>("/src/assets/brand/victorinox/*.webp", {
  eager: true,
  import: "default",
});

export const knifeArt: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [
    path.slice(path.lastIndexOf("/") + 1, -".webp".length),
    url,
  ]),
);

/** The twelve designs in showcase order: Lucerne icons, then the passes, then Finsterwald. */
export const knifeDesigns = [
  { key: "swan", group: "lucerne" },
  { key: "chapel-bridge", group: "lucerne" },
  { key: "pilatus", group: "lucerne" },
  { key: "lion", group: "lucerne" },
  { key: "old-town", group: "lucerne" },
  { key: "steamboat", group: "lucerne" },
  { key: "furka", group: "passes" },
  { key: "grimsel", group: "passes" },
  { key: "susten", group: "passes" },
  { key: "gotthard", group: "passes" },
  { key: "nufenen", group: "passes" },
  { key: "finsterwald", group: "finsterwald" },
] as const;
