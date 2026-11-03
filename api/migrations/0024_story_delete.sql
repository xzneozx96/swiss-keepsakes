-- Owner decision 2026-11-03 (gate G-S8-E43-STORYKEEP, story E4.3): a story can be deleted, published or not, with both
-- language versions. Amends ADR-015 ("Published rows are not deleted") and AC79, as 0020 did for places.
-- The delete guard of 0008 on content.story_versions goes. The use case still refuses to delete ONE published version
-- (published-cannot-be-deleted); only the delete-story command removes published versions, and it deletes the versions
-- before the group because story_versions_group_fkey is RESTRICT.
-- Kept on purpose: story_versions_published_is_kept (the published text cannot be cleared or replaced by null), the
-- TRUNCATE guards (story_versions_no_truncate and the others), and the RESTRICT keys.
-- The function content.reject_delete() was used by this trigger only (places_keep_once_published went in 0020), so it goes too.
-- Safe to run twice: IF EXISTS.
SET lock_timeout = '3s';--> statement-breakpoint
DROP TRIGGER IF EXISTS story_versions_keep_once_published ON content.story_versions;--> statement-breakpoint
DROP FUNCTION IF EXISTS content.reject_delete();
