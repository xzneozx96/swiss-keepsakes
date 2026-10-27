-- G11 guard: the only data this step would lose with meaning is a paid link, so refuse to run while one exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM content.place_links WHERE kind <> 'direct') THEN
    RAISE EXCEPTION '0009_pin_model refuses to run: content.place_links holds a paid link, and the paid columns are dropped here';
  END IF;
END $$;--> statement-breakpoint
-- G11: no story is required to publish and a place has no type, so the rules that used them go.
DROP TRIGGER story_versions_keep_pin_story ON content.story_versions;--> statement-breakpoint
DROP TRIGGER story_versions_keep_pin_story_on_delete ON content.story_versions;--> statement-breakpoint
DROP TRIGGER places_pin_has_published_story ON content.places;--> statement-breakpoint
DROP TRIGGER places_type_is_immutable ON content.places;--> statement-breakpoint
DROP FUNCTION content.assert_published_pins_keep_story();--> statement-breakpoint
DROP FUNCTION content.assert_pin_has_published_story();--> statement-breakpoint
DROP FUNCTION content.reject_type_change();--> statement-breakpoint
-- G11: an editorial review is about any pin, so story_groups keeps no copy of the place type.
ALTER TABLE content.story_groups DROP CONSTRAINT story_groups_subject_type_fkey;--> statement-breakpoint
ALTER TABLE content.story_groups DROP CONSTRAINT story_groups_subject_type_check;--> statement-breakpoint
ALTER TABLE content.story_groups DROP COLUMN subject_place_type;--> statement-breakpoint
-- G11: one plain outbound link per pin. kind, network and disclosure wait for the first paid link.
ALTER TABLE content.place_links DROP CONSTRAINT place_links_place_fkey;--> statement-breakpoint
ALTER TABLE content.place_links DROP CONSTRAINT place_links_type_check;--> statement-breakpoint
ALTER TABLE content.place_links DROP CONSTRAINT place_links_kind_check;--> statement-breakpoint
ALTER TABLE content.place_links DROP CONSTRAINT place_links_network_check;--> statement-breakpoint
ALTER TABLE content.place_links DROP COLUMN place_type, DROP COLUMN kind, DROP COLUMN network, DROP COLUMN disclosure;--> statement-breakpoint
-- G11: one pin model. Steps 2 and 3 removed the keys that referenced places_id_type_key.
ALTER TABLE content.places DROP CONSTRAINT places_practical_no_story_check;--> statement-breakpoint
ALTER TABLE content.places DROP CONSTRAINT places_pin_has_story_check;--> statement-breakpoint
ALTER TABLE content.places DROP CONSTRAINT places_type_check;--> statement-breakpoint
ALTER TABLE content.places DROP CONSTRAINT places_id_type_key;--> statement-breakpoint
ALTER TABLE content.places DROP COLUMN type;--> statement-breakpoint
-- G11: weekly opening hours of a pin.
CREATE FUNCTION content.valid_weekly_hours(h jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_typeof(h) = 'array' AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(h) e
    WHERE NOT coalesce(
      jsonb_typeof(e) = 'object' AND (e - 'day' - 'opens' - 'closes') = '{}'::jsonb
      AND jsonb_typeof(e->'day') = 'number' AND (e->>'day') ~ '^[1-7]$'
      AND jsonb_typeof(e->'opens') = 'string' AND (e->>'opens') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      AND jsonb_typeof(e->'closes') = 'string' AND (e->>'closes') ~ '^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$'
      AND (e->>'opens') < (e->>'closes'), false));
$$;--> statement-breakpoint
ALTER TABLE content.places
  ADD COLUMN address text,
  ADD COLUMN weekly_hours jsonb NOT NULL DEFAULT '[]',
  ADD CONSTRAINT places_address_check CHECK (address IS NULL OR (btrim(address) <> '' AND length(address) <= 300)),
  ADD CONSTRAINT places_weekly_hours_check CHECK (content.valid_weekly_hours(weekly_hours));--> statement-breakpoint
-- G11: dates of a pin.
CREATE TABLE content.place_dates (
  id         uuid PRIMARY KEY DEFAULT uuidv7(),
  place_id   uuid NOT NULL,
  store_id   uuid NOT NULL,
  first_day  date NOT NULL,
  last_day   date NOT NULL,
  start_time time,
  end_time   time,
  ends_at    timestamptz GENERATED ALWAYS AS (((last_day + COALESCE(end_time, TIME '24:00')) AT TIME ZONE 'Europe/Zurich')) STORED,
  CONSTRAINT place_dates_place_fkey FOREIGN KEY (store_id, place_id)
    REFERENCES content.places (store_id, id) ON DELETE CASCADE,
  CONSTRAINT place_dates_days_check CHECK (last_day >= first_day),
  CONSTRAINT place_dates_times_check CHECK ((start_time IS NULL AND end_time IS NULL) OR first_day = last_day),
  CONSTRAINT place_dates_end_needs_start_check CHECK (end_time IS NULL OR start_time IS NOT NULL),
  CONSTRAINT place_dates_end_after_start_check CHECK (end_time IS NULL OR end_time > start_time)
);--> statement-breakpoint
-- G11: map and blog categories, and the links that tag pins and stories.
CREATE TABLE content.map_categories (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id    uuid NOT NULL,
  name        jsonb NOT NULL,
  slug        text NOT NULL,
  parent_id   uuid,
  is_child    boolean GENERATED ALWAYS AS (parent_id IS NOT NULL) STORED,
  parent_must_be_root boolean GENERATED ALWAYS AS (CASE WHEN parent_id IS NULL THEN NULL ELSE false END) STORED,
  position    integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT map_categories_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT map_categories_level_key UNIQUE (store_id, id, is_child),
  CONSTRAINT map_categories_store_slug_key UNIQUE (store_id, slug),
  CONSTRAINT map_categories_parent_fkey FOREIGN KEY (store_id, parent_id, parent_must_be_root)
    REFERENCES content.map_categories (store_id, id, is_child) ON DELETE RESTRICT,
  CONSTRAINT map_categories_name_check CHECK (jsonb_typeof(name) = 'object' AND name ?| ARRAY['en', 'de']),
  CONSTRAINT map_categories_slug_check CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT map_categories_not_own_parent_check CHECK (parent_id IS DISTINCT FROM id),
  CONSTRAINT map_categories_position_check CHECK (position >= 1)
);--> statement-breakpoint
CREATE TABLE content.blog_categories (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id    uuid NOT NULL,
  name        jsonb NOT NULL,
  slug        text NOT NULL,
  parent_id   uuid,
  is_child    boolean GENERATED ALWAYS AS (parent_id IS NOT NULL) STORED,
  parent_must_be_root boolean GENERATED ALWAYS AS (CASE WHEN parent_id IS NULL THEN NULL ELSE false END) STORED,
  position    integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blog_categories_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT blog_categories_level_key UNIQUE (store_id, id, is_child),
  CONSTRAINT blog_categories_store_slug_key UNIQUE (store_id, slug),
  CONSTRAINT blog_categories_parent_fkey FOREIGN KEY (store_id, parent_id, parent_must_be_root)
    REFERENCES content.blog_categories (store_id, id, is_child) ON DELETE RESTRICT,
  CONSTRAINT blog_categories_name_check CHECK (jsonb_typeof(name) = 'object' AND name ?| ARRAY['en', 'de']),
  CONSTRAINT blog_categories_slug_check CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT blog_categories_not_own_parent_check CHECK (parent_id IS DISTINCT FROM id),
  CONSTRAINT blog_categories_position_check CHECK (position >= 1)
);--> statement-breakpoint
CREATE TABLE content.place_categories (
  place_id    uuid NOT NULL,
  category_id uuid NOT NULL,
  store_id    uuid NOT NULL,
  CONSTRAINT place_categories_pkey PRIMARY KEY (place_id, category_id),
  CONSTRAINT place_categories_place_fkey FOREIGN KEY (store_id, place_id)
    REFERENCES content.places (store_id, id) ON DELETE CASCADE,
  CONSTRAINT place_categories_category_fkey FOREIGN KEY (store_id, category_id)
    REFERENCES content.map_categories (store_id, id) ON DELETE RESTRICT
);--> statement-breakpoint
CREATE TABLE content.story_categories (
  group_id    uuid NOT NULL,
  category_id uuid NOT NULL,
  store_id    uuid NOT NULL,
  CONSTRAINT story_categories_pkey PRIMARY KEY (group_id, category_id),
  CONSTRAINT story_categories_group_fkey FOREIGN KEY (store_id, group_id)
    REFERENCES content.story_groups (store_id, id) ON DELETE CASCADE,
  CONSTRAINT story_categories_category_fkey FOREIGN KEY (store_id, category_id)
    REFERENCES content.blog_categories (store_id, id) ON DELETE RESTRICT
);--> statement-breakpoint
-- G11, AP-3: what the public sees.
CREATE VIEW content.public_pins AS
  SELECT p.id, p.store_id, p.slug, p.latitude, p.longitude, p.address, p.weekly_hours, p.published,
         p.cover_media_id, p.main_story_group_id, p.stay_tag, p.interests,
         n.first_day AS next_first_day, n.last_day AS next_last_day, n.start_time AS next_start_time, n.end_time AS next_end_time
    FROM content.places p
    LEFT JOIN LATERAL (
      SELECT d.first_day, d.last_day, d.start_time, d.end_time FROM content.place_dates d
       WHERE d.place_id = p.id AND d.ends_at > now()
       ORDER BY d.first_day, d.start_time NULLS FIRST LIMIT 1) n ON true
   WHERE p.status = 'published'
     AND (n.first_day IS NOT NULL OR NOT EXISTS (SELECT 1 FROM content.place_dates d WHERE d.place_id = p.id));--> statement-breakpoint
-- G11: indexes of the new tables.
CREATE INDEX place_dates_place_end_idx ON content.place_dates (place_id, ends_at);--> statement-breakpoint
CREATE INDEX place_dates_store_place_idx ON content.place_dates (store_id, place_id);--> statement-breakpoint
CREATE INDEX map_categories_parent_idx ON content.map_categories (store_id, parent_id, position);--> statement-breakpoint
CREATE INDEX blog_categories_parent_idx ON content.blog_categories (store_id, parent_id, position);--> statement-breakpoint
CREATE INDEX place_categories_category_idx ON content.place_categories (store_id, category_id);--> statement-breakpoint
CREATE INDEX story_categories_category_idx ON content.story_categories (store_id, category_id);
