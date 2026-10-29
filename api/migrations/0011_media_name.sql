SET lock_timeout = '3s';--> statement-breakpoint
-- E4.11 media library. `name` is what the merchant sees and searches, `file_name` is the file name of the latest
-- upload ("Uploaded as"), `version` counts replacements. A replacement keeps the row id and moves storage_key to a
-- new versioned key (ADR-004), so every page that holds the media id shows the new file.
ALTER TABLE content.media
  ADD COLUMN name text,
  ADD COLUMN file_name text,
  ADD COLUMN version integer NOT NULL DEFAULT 1;--> statement-breakpoint
-- Rows made before this migration have no file name on record. They get "<kind>-<first 8 of the id>.<ext>", with
-- the extension of the storage key, as both name and file name: unique enough to tell files apart in the library, and
-- the merchant can rename them. Nothing is guessed from the content.
UPDATE content.media
SET name = kind || '-' || left(id::text, 8) || '.' || coalesce(substring(storage_key from '\.([A-Za-z0-9]+)$'), 'bin'),
    file_name = kind || '-' || left(id::text, 8) || '.' || coalesce(substring(storage_key from '\.([A-Za-z0-9]+)$'), 'bin');--> statement-breakpoint
ALTER TABLE content.media
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN file_name SET NOT NULL,
  ADD CONSTRAINT media_name_check CHECK (btrim(name) <> '' AND length(name) <= 200),
  ADD CONSTRAINT media_file_name_check CHECK (btrim(file_name) <> '' AND length(file_name) <= 200),
  ADD CONSTRAINT media_version_check CHECK (version >= 1);--> statement-breakpoint
-- A row inserted without a name (a seed, a test fixture, an older caller) gets the same default, so the NOT NULL
-- columns do not break code that does not know them. The API always sends the real name.
CREATE FUNCTION content.media_default_name() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  fallback text := NEW.kind || '-' || left(NEW.id::text, 8) || '.' || coalesce(substring(NEW.storage_key from '\.([A-Za-z0-9]+)$'), 'bin');
BEGIN
  NEW.name := coalesce(NEW.name, fallback);
  NEW.file_name := coalesce(NEW.file_name, fallback);
  RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER media_default_name BEFORE INSERT ON content.media
  FOR EACH ROW WHEN (NEW.name IS NULL OR NEW.file_name IS NULL) EXECUTE FUNCTION content.media_default_name();--> statement-breakpoint
CREATE INDEX media_store_kind_created_idx ON content.media (store_id, kind, created_at DESC);
