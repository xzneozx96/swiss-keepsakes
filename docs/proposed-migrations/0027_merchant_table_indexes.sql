-- PROPOSED, NOT APPLIED, NOT IN api/migrations/meta/_journal.json (ADR-033 section 4, slice 4).
-- One btree index per paged order of the merchant tables, equality filter first, then the sort keys in `order by` order.
-- The pins table orders by `updated_at desc, id desc` (`edited`) and the stories table by `updated_at desc, id desc` (`updated`; the API sorts by the latest version update, which this group column only follows when the group row is saved).
-- The `created` sorts have no index: they are not the defaults.
-- A store holds hundreds of rows, so the tables work without these; they keep the offset skip to index entries only.
CREATE INDEX story_groups_store_updated_idx ON content.story_groups (store_id, updated_at DESC, id DESC);--> statement-breakpoint
CREATE INDEX places_store_updated_idx ON content.places (store_id, updated_at DESC, id DESC);
