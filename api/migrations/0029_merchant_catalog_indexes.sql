-- Owner-approved 05.11.2026 (ADR-033 section 4, slice 5).
-- One btree index for the paged order of the keepsake table: the equality filter first, then the sort keys in `order by` order.
-- The table opens `created` (`created_at desc, id desc`). The `edited` sort has no index: it is not the default, as with
-- 0027 and its dropped story_groups index (commit 043c478f).
-- Inventory pages in the application layer over the live variants (names live in the catalog, stock in inventory, ADR-013), so it
-- needs none. The media library keeps media_store_kind_created_idx.
-- A store holds tens to low hundreds of keepsakes, so the table works without this; it keeps the offset skip to index entries only.
SET lock_timeout = '3s';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS products_store_created_idx ON catalog.products (store_id, created_at DESC, id DESC);
