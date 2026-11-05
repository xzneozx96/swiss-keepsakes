SET lock_timeout = '3s';--> statement-breakpoint
-- ADR-033 slice 6 (owner decision 05.11.2026: Postgres full-text search plus pg_trgm), approved by the owner.
-- Additive: no existing column, row or index changes. Every step is IF NOT EXISTS / OR REPLACE, so a second run does nothing.
-- Swiss spellings without `unaccent` (it is STABLE, so a generated column cannot call it, and it has no oe -> ö rule): a title with
-- an umlaut is stored twice in one string, "lowendenkmal loewendenkmal", so "lowen" and "loewen" both find "Löwendenkmal".
-- Locks: ADD COLUMN ... STORED rewrites the table under ACCESS EXCLUSIVE (hundreds of rows: milliseconds; lock_timeout makes it
-- fail instead of queueing). CREATE INDEX CONCURRENTLY is impossible here (drizzle runs each file in one transaction); a plain
-- CREATE INDEX blocks writes for those milliseconds. For a large table, run the CREATE INDEX lines by hand with CONCURRENTLY first.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;--> statement-breakpoint

-- One form of a text: accents dropped, lower case, ß as ss. Applied to the typed query and to each stored title.
CREATE OR REPLACE FUNCTION platform.search_fold(input text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
  SELECT lower(translate(replace(input, 'ß', 'ss'),
    'ÄÖÜÀÁÂÃÅÈÉÊËÌÍÎÏÑÒÓÔÕÙÚÛÝÇäöüàáâãåèéêëìíîïñòóôõùúûýÿç',
    'AOUAAAAAEEEEIIIINOOOOUUUYCaouaaaaaeeeeiiiinoooouuuyyc'))
$$;--> statement-breakpoint

-- What is stored for a title: the folded form, plus the ae/oe/ue form when it differs.
CREATE OR REPLACE FUNCTION platform.search_text(input text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
  SELECT CASE WHEN f.a = f.b THEN f.a ELSE f.a || ' ' || f.b END
    FROM (SELECT platform.search_fold(input) AS a,
                 platform.search_fold(replace(replace(replace(replace(replace(replace(input, 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'Ä', 'Ae'), 'Ö', 'Oe'), 'Ü', 'Ue')) AS b) f
$$;--> statement-breakpoint

-- The full-text vector under both dictionaries, so one column serves either language.
CREATE OR REPLACE FUNCTION platform.search_tsv(input text) RETURNS tsvector
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
  SELECT to_tsvector('english'::regconfig, platform.search_text(input)) || to_tsvector('german'::regconfig, platform.search_text(input))
$$;--> statement-breakpoint

-- Stories: one row per language version.
ALTER TABLE content.story_versions
  ADD COLUMN IF NOT EXISTS search_text text GENERATED ALWAYS AS (platform.search_text(coalesce(published->>'title', ''))) STORED,
  ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (platform.search_tsv(coalesce(published->>'title', ''))) STORED;--> statement-breakpoint
-- Places: the name in both languages.
ALTER TABLE content.places
  ADD COLUMN IF NOT EXISTS search_text text GENERATED ALWAYS AS (platform.search_text(coalesce(published->'name'->>'en', '') || ' ' || coalesce(published->'name'->>'de', ''))) STORED,
  ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (platform.search_tsv(coalesce(published->'name'->>'en', '') || ' ' || coalesce(published->'name'->>'de', ''))) STORED;--> statement-breakpoint
-- Tours: the title in both languages.
ALTER TABLE content.tours
  ADD COLUMN IF NOT EXISTS search_text text GENERATED ALWAYS AS (platform.search_text(coalesce(published->'title'->>'en', '') || ' ' || coalesce(published->'title'->>'de', ''))) STORED,
  ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (platform.search_tsv(coalesce(published->'title'->>'en', '') || ' ' || coalesce(published->'title'->>'de', ''))) STORED;--> statement-breakpoint
-- Keepsakes: the name in both languages.
ALTER TABLE catalog.products
  ADD COLUMN IF NOT EXISTS search_text text GENERATED ALWAYS AS (platform.search_text(coalesce(published->'name'->>'en', '') || ' ' || coalesce(published->'name'->>'de', ''))) STORED,
  ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (platform.search_tsv(coalesce(published->'name'->>'en', '') || ' ' || coalesce(published->'name'->>'de', ''))) STORED;--> statement-breakpoint

-- Partial on the published rows (each query repeats `status = 'published'`).
CREATE INDEX IF NOT EXISTS story_versions_search_tsv_idx ON content.story_versions USING gin (search_tsv) WHERE status = 'published';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS story_versions_search_trgm_idx ON content.story_versions USING gin (search_text gin_trgm_ops) WHERE status = 'published';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS places_search_tsv_idx ON content.places USING gin (search_tsv) WHERE status = 'published';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS places_search_trgm_idx ON content.places USING gin (search_text gin_trgm_ops) WHERE status = 'published';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tours_search_tsv_idx ON content.tours USING gin (search_tsv) WHERE status = 'published';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tours_search_trgm_idx ON content.tours USING gin (search_text gin_trgm_ops) WHERE status = 'published';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS products_search_tsv_idx ON catalog.products USING gin (search_tsv) WHERE status = 'published';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS products_search_trgm_idx ON catalog.products USING gin (search_text gin_trgm_ops) WHERE status = 'published';
