-- Owner decision 2026-11-02 (T-016): a pin of any status can be deleted when nothing uses it, so the merchant is not
-- stuck with a published pin forever. Amends ADR-015 ("Published rows are not deleted") and AC79.
-- The delete guard of 0008 on content.places goes. What uses a pin still blocks the delete, through the RESTRICT keys:
-- story_group_places, story_groups.subject_place_id and tour_stops.place_id. The pin's own rows (dates, categories,
-- photos, link) already go with it through ON DELETE CASCADE, in the same statement.
-- Kept on purpose: first_published_at stays fixed once set (places_first_published_is_fixed), so the first-published
-- date stays honest while the pin lives; the TRUNCATE guard (places_no_truncate); the story-version guards. The
-- function content.reject_delete() stays, story_versions_keep_once_published uses it.
-- Safe to run twice: DROP TRIGGER IF EXISTS.
SET lock_timeout = '3s';--> statement-breakpoint
DROP TRIGGER IF EXISTS places_keep_once_published ON content.places;
