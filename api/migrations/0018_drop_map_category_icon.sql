SET lock_timeout = '3s';--> statement-breakpoint
-- Owner decision 2026-11-02 (docs/decisions/2026-11-02-map-category-show-on-home.md): the map category icon is removed,
-- because nothing reads it until the home exists. "Show on the home" (show_on_home) stays.
-- Safe to run twice: every step checks what is already there.
ALTER TABLE content.map_categories DROP CONSTRAINT IF EXISTS map_categories_icon_check;--> statement-breakpoint
ALTER TABLE content.map_categories DROP COLUMN IF EXISTS icon;
