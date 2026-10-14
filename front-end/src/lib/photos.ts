/**
 * Photo registry: every JPEG in src/assets/photos, keyed by file name without extension.
 * Sources and licences are listed in src/assets/photos/CREDITS.txt.
 */
const files = import.meta.glob<string>("/src/assets/photos/*.jpg", {
  eager: true,
  import: "default",
});

const bySlug = new Map(
  Object.entries(files).map(([path, url]) => [
    path.slice(path.lastIndexOf("/") + 1, -".jpg".length),
    url,
  ]),
);

/** URL for a photo slug, or undefined when the photo is not in the repo yet. */
export function photoUrl(slug: string | undefined): string | undefined {
  return slug ? bySlug.get(slug) : undefined;
}
