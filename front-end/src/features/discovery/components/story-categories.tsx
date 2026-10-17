import type { StoryCategory } from "@/features/content/types";

import { ScrollShadow } from "@heroui/react";
import { Link } from "@tanstack/react-router";

import {
  CategoryThumb,
  categoryThumbItemClass,
} from "@/features/catalog/components/category-thumb";

export interface StoryCategoryLink {
  /** Absent = all stories. */
  id?: StoryCategory;
  name: string;
  photo: string;
}

/**
 * Story categories on the home, in the C02 filter's look (shared CategoryThumb) but as links:
 * each opens C19 filtered to it, where the same row is the filter. Scrolls sideways.
 */
export function StoryCategories({
  label,
  items,
}: {
  label: string;
  items: StoryCategoryLink[];
}) {
  return (
    <nav aria-label={label}>
      <ScrollShadow
        hideScrollBar
        className="-mx-4"
        orientation="horizontal"
        size={40}
      >
        <ul className="flex w-max gap-1 px-4 pt-2 pb-1">
          {items.map(({ id, name, photo }) => (
            <li key={id ?? "all"}>
              <Link
                className={`${categoryThumbItemClass} text-foreground`}
                search={id ? { category: id } : {}}
                to="/stories"
              >
                <CategoryThumb name={name} photo={photo} />
              </Link>
            </li>
          ))}
        </ul>
      </ScrollShadow>
    </nav>
  );
}
