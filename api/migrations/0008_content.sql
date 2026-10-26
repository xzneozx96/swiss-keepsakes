SET lock_timeout = '3s';--> statement-breakpoint
CREATE SCHEMA content;--> statement-breakpoint
CREATE TABLE content.media (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id        uuid NOT NULL,
  kind            text NOT NULL,
  storage_key     text NOT NULL,
  content_type    text NOT NULL,
  byte_size       bigint NOT NULL,
  sha256          text NOT NULL,
  width           integer,
  height          integer,
  duration_seconds integer,
  alt             jsonb NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'processing',
  retired_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_storage_key_key UNIQUE (storage_key),
  CONSTRAINT media_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT media_store_id_kind_key UNIQUE (store_id, id, kind),
  CONSTRAINT media_kind_check CHECK (kind IN ('image', 'audio', 'pdf')),
  CONSTRAINT media_status_check CHECK (status IN ('processing', 'ready', 'retired')),
  CONSTRAINT media_retired_check CHECK ((status = 'retired') = (retired_at IS NOT NULL)),
  CONSTRAINT media_byte_size_check CHECK (byte_size > 0),
  CONSTRAINT media_sha256_check CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT media_dimensions_check CHECK ((width IS NULL) = (height IS NULL) AND (kind = 'image' OR width IS NULL))
);--> statement-breakpoint
CREATE TABLE content.story_groups (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id         uuid NOT NULL,
  kind             text NOT NULL,
  subject_place_id uuid,
  subject_place_type text,
  stay_tag         text NOT NULL DEFAULT 'both',
  interests        text[] NOT NULL DEFAULT '{}',
  row_version      integer NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT story_groups_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT story_groups_kind_check CHECK (kind IN ('story', 'editorial_review')),
  CONSTRAINT story_groups_subject_check CHECK ((kind = 'editorial_review') = (subject_place_id IS NOT NULL)),
  CONSTRAINT story_groups_subject_type_check CHECK ((subject_place_id IS NULL) = (subject_place_type IS NULL)
    AND (subject_place_type IS NULL OR subject_place_type IN ('sight', 'restaurant', 'accommodation'))),
  CONSTRAINT story_groups_stay_tag_check CHECK (stay_tag IN ('short_stay', 'multi_day', 'both')),
  CONSTRAINT story_groups_interests_check CHECK (platform.valid_interests(interests))
);--> statement-breakpoint
CREATE TABLE content.places (
  id                  uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id            uuid NOT NULL,
  type                text NOT NULL,
  status              text NOT NULL DEFAULT 'draft',
  slug                jsonb,
  latitude            double precision,
  longitude           double precision,
  stay_tag            text NOT NULL DEFAULT 'both',
  interests           text[] NOT NULL DEFAULT '{}',
  main_story_group_id uuid,
  cover_media_id      uuid,
  cover_media_kind    text GENERATED ALWAYS AS (CASE WHEN cover_media_id IS NULL THEN NULL ELSE 'image' END) STORED,
  published           jsonb,
  draft               jsonb,
  first_published_at  timestamptz,
  row_version         integer NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT places_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT places_id_type_key UNIQUE (id, type),
  CONSTRAINT places_type_check CHECK (type IN ('sight', 'restaurant', 'accommodation', 'practical')),
  CONSTRAINT places_status_check CHECK (status IN ('draft', 'published', 'hidden')),
  CONSTRAINT places_stay_tag_check CHECK (stay_tag IN ('short_stay', 'multi_day', 'both')),
  CONSTRAINT places_interests_check CHECK (platform.valid_interests(interests)),
  CONSTRAINT places_latitude_check CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT places_longitude_check CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT places_draft_means_unpublished_check CHECK ((status = 'draft') = (first_published_at IS NULL)),
  CONSTRAINT places_practical_no_story_check CHECK (type <> 'practical' OR main_story_group_id IS NULL),
  CONSTRAINT places_pin_has_story_check CHECK (status <> 'published' OR type = 'practical' OR main_story_group_id IS NOT NULL),
  CONSTRAINT places_published_fields_check CHECK (status = 'draft' OR (
    slug IS NOT NULL AND platform.valid_slug_map(slug)
    AND latitude IS NOT NULL AND longitude IS NOT NULL
    AND jsonb_typeof(published->'name') = 'object'
    AND ((published->'name') ? 'en') = (slug ? 'en')
    AND ((published->'name') ? 'de') = (slug ? 'de')) IS TRUE),
  CONSTRAINT places_slug_shape_check CHECK (slug IS NULL OR platform.valid_slug_map(slug)),
  CONSTRAINT places_main_story_fkey FOREIGN KEY (store_id, main_story_group_id)
    REFERENCES content.story_groups (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT places_cover_media_fkey FOREIGN KEY (store_id, cover_media_id, cover_media_kind)
    REFERENCES content.media (store_id, id, kind) ON DELETE RESTRICT
);--> statement-breakpoint
ALTER TABLE content.story_groups
  ADD CONSTRAINT story_groups_subject_place_fkey FOREIGN KEY (store_id, subject_place_id)
  REFERENCES content.places (store_id, id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
ALTER TABLE content.story_groups
  ADD CONSTRAINT story_groups_subject_type_fkey FOREIGN KEY (subject_place_id, subject_place_type)
  REFERENCES content.places (id, type) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
CREATE TABLE content.story_versions (
  group_id     uuid NOT NULL,
  language     text NOT NULL,
  store_id     uuid NOT NULL,
  status       text NOT NULL DEFAULT 'draft',
  slug         text,
  published    jsonb,
  published_at timestamptz,
  draft        jsonb,
  row_version  integer NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT story_versions_pkey PRIMARY KEY (group_id, language),
  CONSTRAINT story_versions_store_group_language_key UNIQUE (store_id, group_id, language),
  CONSTRAINT story_versions_language_slug_key UNIQUE (language, slug),
  CONSTRAINT story_versions_group_fkey FOREIGN KEY (store_id, group_id)
    REFERENCES content.story_groups (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT story_versions_language_check CHECK (language IN ('en', 'de')),
  CONSTRAINT story_versions_status_check CHECK (status IN ('draft', 'published')),
  CONSTRAINT story_versions_slug_check CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT story_versions_published_fields_check CHECK (status = 'draft' OR (
    slug IS NOT NULL AND published_at IS NOT NULL
    AND jsonb_typeof(published->'title') = 'string' AND jsonb_typeof(published->'sections') = 'array') IS TRUE)
);--> statement-breakpoint
CREATE TABLE content.story_group_places (
  group_id uuid NOT NULL,
  place_id uuid NOT NULL,
  store_id uuid NOT NULL,
  position integer NOT NULL,
  CONSTRAINT story_group_places_pkey PRIMARY KEY (group_id, place_id),
  CONSTRAINT story_group_places_group_fkey FOREIGN KEY (store_id, group_id)
    REFERENCES content.story_groups (store_id, id) ON DELETE CASCADE,
  CONSTRAINT story_group_places_place_fkey FOREIGN KEY (store_id, place_id)
    REFERENCES content.places (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT story_group_places_position_check CHECK (position >= 1)
);--> statement-breakpoint
CREATE TABLE content.story_keepsake_links (
  group_id   uuid NOT NULL,
  store_id   uuid NOT NULL,
  position   integer NOT NULL,
  product_id uuid NOT NULL,
  CONSTRAINT story_keepsake_links_pkey PRIMARY KEY (group_id, position),
  CONSTRAINT story_keepsake_links_product_key UNIQUE (group_id, product_id),
  CONSTRAINT story_keepsake_links_group_fkey FOREIGN KEY (store_id, group_id)
    REFERENCES content.story_groups (store_id, id) ON DELETE CASCADE,
  CONSTRAINT story_keepsake_links_position_check CHECK (position BETWEEN 1 AND 6)
);--> statement-breakpoint
CREATE TABLE content.story_related (
  group_id         uuid NOT NULL,
  store_id         uuid NOT NULL,
  position         integer NOT NULL,
  related_group_id uuid NOT NULL,
  CONSTRAINT story_related_pkey PRIMARY KEY (group_id, position),
  CONSTRAINT story_related_target_key UNIQUE (group_id, related_group_id),
  CONSTRAINT story_related_group_fkey FOREIGN KEY (store_id, group_id)
    REFERENCES content.story_groups (store_id, id) ON DELETE CASCADE,
  CONSTRAINT story_related_target_fkey FOREIGN KEY (store_id, related_group_id)
    REFERENCES content.story_groups (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT story_related_position_check CHECK (position BETWEEN 1 AND 3),
  CONSTRAINT story_related_not_self_check CHECK (related_group_id <> group_id)
);--> statement-breakpoint
CREATE VIEW content.story_related_readable AS
  SELECT r.group_id, src.language, r.position, r.related_group_id, tgt.slug AS related_slug
    FROM content.story_related r
    JOIN content.story_versions src ON src.group_id = r.group_id AND src.status = 'published'
    JOIN content.story_versions tgt ON tgt.group_id = r.related_group_id AND tgt.language = src.language AND tgt.status = 'published';--> statement-breakpoint
CREATE TABLE content.place_links (
  place_id        uuid PRIMARY KEY,
  place_type      text NOT NULL DEFAULT 'accommodation',
  store_id        uuid NOT NULL,
  kind            text NOT NULL DEFAULT 'direct',
  url             text NOT NULL,
  url_by_language jsonb NOT NULL DEFAULT '{}',
  network         text,
  disclosure      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT place_links_place_fkey FOREIGN KEY (place_id, place_type)
    REFERENCES content.places (id, type) ON DELETE CASCADE,
  CONSTRAINT place_links_store_fkey FOREIGN KEY (store_id, place_id)
    REFERENCES content.places (store_id, id) ON DELETE CASCADE,
  CONSTRAINT place_links_type_check CHECK (place_type = 'accommodation'),
  CONSTRAINT place_links_kind_check CHECK (kind IN ('direct', 'affiliate')),
  CONSTRAINT place_links_url_check CHECK (url ~ '^https://'),
  CONSTRAINT place_links_network_check CHECK (kind = 'direct' OR network IS NOT NULL),
  CONSTRAINT place_links_overrides_check CHECK (jsonb_typeof(url_by_language) = 'object' AND (url_by_language - 'en' - 'de') = '{}'::jsonb
    AND coalesce(url_by_language->>'en', 'https://') ~ '^https://' AND coalesce(url_by_language->>'de', 'https://') ~ '^https://')
);--> statement-breakpoint
CREATE TABLE content.tours (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id        uuid NOT NULL,
  status          text NOT NULL DEFAULT 'draft',
  slug            jsonb,
  stay_tag        text NOT NULL DEFAULT 'both',
  interests       text[] NOT NULL DEFAULT '{}',
  duration_minutes integer,
  cover_media_id  uuid,
  cover_media_kind text GENERATED ALWAYS AS (CASE WHEN cover_media_id IS NULL THEN NULL ELSE 'image' END) STORED,
  pdf_media_id    uuid,
  pdf_media_kind  text GENERATED ALWAYS AS (CASE WHEN pdf_media_id IS NULL THEN NULL ELSE 'pdf' END) STORED,
  published       jsonb,
  draft           jsonb,
  row_version     integer NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tours_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT tours_status_check CHECK (status IN ('draft', 'published')),
  CONSTRAINT tours_stay_tag_check CHECK (stay_tag IN ('short_stay', 'multi_day', 'both')),
  CONSTRAINT tours_interests_check CHECK (platform.valid_interests(interests)),
  CONSTRAINT tours_duration_check CHECK (duration_minutes > 0),
  CONSTRAINT tours_slug_shape_check CHECK (slug IS NULL OR platform.valid_slug_map(slug)),
  CONSTRAINT tours_published_fields_check CHECK (status = 'draft' OR (
    slug IS NOT NULL AND pdf_media_id IS NOT NULL
    AND jsonb_typeof(published->'title') = 'object'
    AND ((published->'title') ? 'en') = (slug ? 'en')
    AND ((published->'title') ? 'de') = (slug ? 'de')) IS TRUE),
  CONSTRAINT tours_cover_media_fkey FOREIGN KEY (store_id, cover_media_id, cover_media_kind)
    REFERENCES content.media (store_id, id, kind) ON DELETE RESTRICT,
  CONSTRAINT tours_pdf_media_fkey FOREIGN KEY (store_id, pdf_media_id, pdf_media_kind)
    REFERENCES content.media (store_id, id, kind) ON DELETE RESTRICT
);--> statement-breakpoint
CREATE TABLE content.tour_stops (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  tour_id            uuid NOT NULL,
  store_id           uuid NOT NULL,
  position           integer NOT NULL,
  latitude           double precision NOT NULL,
  longitude          double precision NOT NULL,
  content            jsonb NOT NULL,
  minutes_from_start integer,
  media_id           uuid,
  media_kind         text GENERATED ALWAYS AS (CASE WHEN media_id IS NULL THEN NULL ELSE 'image' END) STORED,
  place_id           uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tour_stops_position_key UNIQUE (tour_id, position) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT tour_stops_tour_fkey FOREIGN KEY (store_id, tour_id)
    REFERENCES content.tours (store_id, id) ON DELETE CASCADE,
  CONSTRAINT tour_stops_media_fkey FOREIGN KEY (store_id, media_id, media_kind)
    REFERENCES content.media (store_id, id, kind) ON DELETE RESTRICT,
  CONSTRAINT tour_stops_place_fkey FOREIGN KEY (store_id, place_id)
    REFERENCES content.places (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT tour_stops_position_check CHECK (position >= 1),
  CONSTRAINT tour_stops_latitude_check CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT tour_stops_longitude_check CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT tour_stops_minutes_check CHECK (minutes_from_start >= 0)
);--> statement-breakpoint
CREATE TABLE content.tour_keepsake_links (
  tour_id    uuid NOT NULL,
  store_id   uuid NOT NULL,
  position   integer NOT NULL,
  product_id uuid NOT NULL,
  CONSTRAINT tour_keepsake_links_pkey PRIMARY KEY (tour_id, position),
  CONSTRAINT tour_keepsake_links_product_key UNIQUE (tour_id, product_id),
  CONSTRAINT tour_keepsake_links_tour_fkey FOREIGN KEY (store_id, tour_id)
    REFERENCES content.tours (store_id, id) ON DELETE CASCADE,
  CONSTRAINT tour_keepsake_links_position_check CHECK (position BETWEEN 1 AND 3)
);--> statement-breakpoint
CREATE TABLE content.media_refs (
  id             uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id       uuid NOT NULL,
  media_id       uuid NOT NULL,
  owner_kind     text NOT NULL,
  owner_id       uuid NOT NULL,
  owner_language text,
  slot           text NOT NULL,
  CONSTRAINT media_refs_owner_key UNIQUE NULLS NOT DISTINCT (media_id, owner_kind, owner_id, owner_language, slot),
  CONSTRAINT media_refs_media_fkey FOREIGN KEY (store_id, media_id)
    REFERENCES content.media (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT media_refs_owner_kind_check CHECK (owner_kind IN ('story_version', 'place', 'tour')),
  CONSTRAINT media_refs_slot_check CHECK (slot IN ('draft', 'published')),
  CONSTRAINT media_refs_language_check CHECK ((owner_kind = 'story_version') = (owner_language IS NOT NULL))
);--> statement-breakpoint
CREATE INDEX media_refs_owner_idx ON content.media_refs (owner_kind, owner_id);--> statement-breakpoint
CREATE INDEX media_refs_media_fkey_idx ON content.media_refs (store_id, media_id);--> statement-breakpoint
CREATE UNIQUE INDEX places_slug_en_key ON content.places ((slug->>'en')) WHERE slug ? 'en';--> statement-breakpoint
CREATE UNIQUE INDEX places_slug_de_key ON content.places ((slug->>'de')) WHERE slug ? 'de';--> statement-breakpoint
CREATE INDEX places_main_story_idx ON content.places (store_id, main_story_group_id) WHERE main_story_group_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX places_cover_media_idx ON content.places (store_id, cover_media_id) WHERE cover_media_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX story_groups_subject_idx ON content.story_groups (store_id, subject_place_id) WHERE subject_place_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX story_versions_published_idx ON content.story_versions (language, published_at DESC) WHERE status = 'published';--> statement-breakpoint
CREATE INDEX story_group_places_place_idx ON content.story_group_places (store_id, place_id);--> statement-breakpoint
CREATE INDEX story_related_target_idx ON content.story_related (store_id, related_group_id);--> statement-breakpoint
CREATE UNIQUE INDEX tours_slug_en_key ON content.tours ((slug->>'en')) WHERE slug ? 'en';--> statement-breakpoint
CREATE UNIQUE INDEX tours_slug_de_key ON content.tours ((slug->>'de')) WHERE slug ? 'de';--> statement-breakpoint
CREATE INDEX tours_pdf_media_idx ON content.tours (store_id, pdf_media_id) WHERE pdf_media_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX tours_cover_media_idx ON content.tours (store_id, cover_media_id) WHERE cover_media_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX tour_stops_media_idx ON content.tour_stops (store_id, media_id) WHERE media_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX tour_stops_place_idx ON content.tour_stops (store_id, place_id) WHERE place_id IS NOT NULL;--> statement-breakpoint
-- Triggers: invariants that span rows. Row-local parts are CHECKs above.
CREATE FUNCTION content.reject_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'a published or hidden % cannot be deleted; hide it instead', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END $$;--> statement-breakpoint
CREATE TRIGGER places_keep_once_published BEFORE DELETE ON content.places
  FOR EACH ROW WHEN (OLD.first_published_at IS NOT NULL) EXECUTE FUNCTION content.reject_delete();--> statement-breakpoint
CREATE TRIGGER story_versions_keep_once_published BEFORE DELETE ON content.story_versions
  FOR EACH ROW WHEN (OLD.published IS NOT NULL) EXECUTE FUNCTION content.reject_delete();--> statement-breakpoint
-- AC79: delete is refused while published is set, so the text is kept once set. Unpublish means status = 'draft'; the document stays.
CREATE TRIGGER story_versions_published_is_kept BEFORE UPDATE OF published ON content.story_versions
  FOR EACH ROW WHEN (OLD.published IS NOT NULL AND NEW.published IS NULL) EXECUTE FUNCTION platform.reject_column_change('published');--> statement-breakpoint
CREATE FUNCTION content.reject_type_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'the type of place % cannot change after it is created', OLD.id USING ERRCODE = 'restrict_violation';
END $$;--> statement-breakpoint
CREATE TRIGGER places_type_is_immutable BEFORE UPDATE OF type ON content.places
  FOR EACH ROW WHEN (OLD.type IS DISTINCT FROM NEW.type) EXECUTE FUNCTION content.reject_type_change();--> statement-breakpoint
-- AC79: first_published_at is what holds a place against deletion, so it is fixed once set.
-- Without this, a published place could be put back to draft with the column cleared, then deleted.
CREATE TRIGGER places_first_published_is_fixed BEFORE UPDATE OF first_published_at ON content.places
  FOR EACH ROW WHEN (OLD.first_published_at IS NOT NULL AND NEW.first_published_at IS DISTINCT FROM OLD.first_published_at) EXECUTE FUNCTION platform.reject_column_change('first_published_at');--> statement-breakpoint
-- AC79: TRUNCATE skips row triggers, so the delete guards would not hold. Refuse it on the tables they protect.
CREATE TRIGGER places_no_truncate BEFORE TRUNCATE ON content.places
  FOR EACH STATEMENT EXECUTE FUNCTION platform.reject_change();--> statement-breakpoint
CREATE TRIGGER story_versions_no_truncate BEFORE TRUNCATE ON content.story_versions
  FOR EACH STATEMENT EXECUTE FUNCTION platform.reject_change();--> statement-breakpoint
CREATE TRIGGER media_refs_no_truncate BEFORE TRUNCATE ON content.media_refs
  FOR EACH STATEMENT EXECUTE FUNCTION platform.reject_change();--> statement-breakpoint
-- AC43, cross-row half. Both checks run at commit and lock the story group row, so a publish
-- and an unpublish that race cannot both pass.
CREATE FUNCTION content.assert_pin_has_published_story() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.type <> 'practical' THEN
    PERFORM 1 FROM content.story_groups g WHERE g.id = NEW.main_story_group_id FOR SHARE;
    IF NOT EXISTS (SELECT 1 FROM content.story_versions v
                    WHERE v.group_id = NEW.main_story_group_id AND v.status = 'published') THEN
      RAISE EXCEPTION 'place % cannot be published: its main story has no published version', NEW.id
        USING ERRCODE = 'check_violation', CONSTRAINT = 'places_pin_has_published_story';
    END IF;
  END IF;
  RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER places_pin_has_published_story
  AFTER INSERT OR UPDATE OF status, main_story_group_id ON content.places
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION content.assert_pin_has_published_story();--> statement-breakpoint
CREATE FUNCTION content.assert_published_pins_keep_story() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM content.story_groups g WHERE g.id = OLD.group_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM content.places p
              WHERE p.main_story_group_id = OLD.group_id AND p.status = 'published' AND p.type <> 'practical')
     AND NOT EXISTS (SELECT 1 FROM content.story_versions v
                      WHERE v.group_id = OLD.group_id AND v.status = 'published') THEN
    RAISE EXCEPTION 'story group % is the main story of a published place and keeps no published version', OLD.group_id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'story_versions_keep_pin_story';
  END IF;
  RETURN NULL;
END $$;--> statement-breakpoint
-- Fires when a published version leaves 'published', moves to another group, or is deleted.
CREATE CONSTRAINT TRIGGER story_versions_keep_pin_story
  AFTER UPDATE ON content.story_versions
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
  WHEN (OLD.status = 'published' AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.group_id IS DISTINCT FROM OLD.group_id))
  EXECUTE FUNCTION content.assert_published_pins_keep_story();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER story_versions_keep_pin_story_on_delete
  AFTER DELETE ON content.story_versions
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (OLD.status = 'published')
  EXECUTE FUNCTION content.assert_published_pins_keep_story();--> statement-breakpoint
-- A media row cannot be retired while a column or a document still uses it. A save that adds a reference at the
-- same moment can still slip past, which the grace period of ADR-004 covers.
CREATE FUNCTION content.reject_retire_if_used() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM content.media_refs r WHERE r.media_id = NEW.id)
     OR EXISTS (SELECT 1 FROM content.places p WHERE p.cover_media_id = NEW.id)
     OR EXISTS (SELECT 1 FROM content.tours t WHERE t.cover_media_id = NEW.id OR t.pdf_media_id = NEW.id)
     OR EXISTS (SELECT 1 FROM content.tour_stops s WHERE s.media_id = NEW.id) THEN
    RAISE EXCEPTION 'media % is still used and cannot be retired', NEW.id USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER media_not_retired_while_used BEFORE UPDATE OF status ON content.media
  FOR EACH ROW WHEN (NEW.status = 'retired' AND OLD.status <> 'retired') EXECUTE FUNCTION content.reject_retire_if_used();--> statement-breakpoint
-- Place sheet (AP-4): main story first, then every other story that mentions the place or reviews it.
CREATE VIEW content.place_story_links AS
  SELECT p.id AS place_id, p.main_story_group_id AS group_id, 0 AS rank
    FROM content.places p WHERE p.main_story_group_id IS NOT NULL
  UNION
  SELECT g.place_id, g.group_id, 1 FROM content.story_group_places g
  UNION
  SELECT s.subject_place_id, s.id, 1 FROM content.story_groups s WHERE s.subject_place_id IS NOT NULL;
