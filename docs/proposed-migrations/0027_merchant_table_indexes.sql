-- PROPOSED, NOT APPLIED, NOT IN api/migrations/meta/_journal.json (ADR-033 section 4, slice 4).
-- One btree index per paged order of the merchant tables, equality filter first, then the sort keys in `order by` order.
-- The pins table orders by `updated_at desc, id desc` (`edited`) and the stories table by `created_at desc, id desc` (`created`).
-- The `created` sort of pins and the `updated` sort of stories (the latest version update) have no index: they are not the defaults.
-- A store holds hundreds of rows, so the tables work without these; they keep the offset skip to index entries only.
CREATE INDEX story_groups_store_created_idx ON content.story_groups (store_id, created_at DESC, id DESC);--> statement-breakpoint
CREATE INDEX places_store_updated_idx ON content.places (store_id, updated_at DESC, id DESC);
