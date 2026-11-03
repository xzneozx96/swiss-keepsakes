SET lock_timeout = '3s';--> statement-breakpoint
-- Duplicate detection by content: before an upload the browser sends the SHA-256 of each picked file and the API
-- asks for the store's ready files with those hashes (`store_id = $1 and status = 'ready' and sha256 = any($2)`).
-- Partial on `ready`, because a processing or retired file is never offered as "already in your library".
-- Not unique: the same bytes may be uploaded twice on purpose ("Upload a copy").
CREATE INDEX media_store_sha256_ready_idx ON content.media (store_id, sha256) WHERE status = 'ready';
