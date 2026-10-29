SET lock_timeout = '3s';--> statement-breakpoint
-- E4.2: the fifth interest, local-activities (decision 2026-10-28, home by interests). The function only widens, so
-- every stored value still passes the CHECKs that call it (story_groups, places, tours).
CREATE OR REPLACE FUNCTION platform.valid_interests(codes text[]) RETURNS boolean
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT codes IS NOT NULL AND codes <@ ARRAY['history-culture','food-drink','lake-mountains','shopping-keepsakes','local-activities']::text[] $$;--> statement-breakpoint
-- E4.2: what the home reads from a pin. Typed columns like stay_tag and interests: a change is live, no draft step.
-- The local tip and the alt text of the photos are text, so they live in the draft and published documents with the
-- title and the tip (ADR-014): an edit reaches guests on publish.
ALTER TABLE content.places
  ADD COLUMN service_type text,
  ADD COLUMN must_visit boolean NOT NULL DEFAULT false,
  ADD COLUMN food_kind text,
  ADD CONSTRAINT places_service_type_check CHECK (service_type IS NULL OR service_type IN ('water', 'toilets', 'connect', 'transport', 'lockers', 'cash')),
  ADD CONSTRAINT places_food_kind_check CHECK (food_kind IS NULL OR food_kind IN ('restaurant', 'cafe-bakery', 'pub-bar', 'market'));--> statement-breakpoint
-- E4.2: the outbound link is one https address with no space (ADR-011). place_links_url_check already wants https://.
-- NOT VALID so the migration never fails on a link stored before this rule: it holds for every new and changed row,
-- and a link already stored keeps working until the merchant saves another one.
ALTER TABLE content.place_links
  ADD CONSTRAINT place_links_url_shape_check CHECK (url !~ '\s' AND length(url) <= 2000) NOT VALID;--> statement-breakpoint
-- E4.2: the extra photos of a pin, in the merchant's order. The main photo stays on places.cover_media_id. The alt text of
-- each photo is in the draft and published documents of the pin, keyed by media id.
CREATE TABLE content.place_photos (
  place_id   uuid NOT NULL,
  store_id   uuid NOT NULL,
  position   integer NOT NULL,
  media_id   uuid NOT NULL,
  media_kind text GENERATED ALWAYS AS ('image'::text) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT place_photos_pkey PRIMARY KEY (place_id, position),
  CONSTRAINT place_photos_media_key UNIQUE (place_id, media_id),
  CONSTRAINT place_photos_position_check CHECK (position BETWEEN 1 AND 10),
  CONSTRAINT place_photos_place_fkey FOREIGN KEY (store_id, place_id)
    REFERENCES content.places (store_id, id) ON DELETE CASCADE,
  CONSTRAINT place_photos_media_fkey FOREIGN KEY (store_id, media_id, media_kind)
    REFERENCES content.media (store_id, id, kind) ON DELETE RESTRICT
);--> statement-breakpoint
CREATE INDEX place_photos_media_idx ON content.place_photos (store_id, media_id);--> statement-breakpoint
-- A media row cannot be retired while a column or a document still uses it (0008), and now an extra photo counts too.
CREATE OR REPLACE FUNCTION content.reject_retire_if_used() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM content.media_refs r WHERE r.media_id = NEW.id)
     OR EXISTS (SELECT 1 FROM content.places p WHERE p.cover_media_id = NEW.id)
     OR EXISTS (SELECT 1 FROM content.place_photos f WHERE f.media_id = NEW.id)
     OR EXISTS (SELECT 1 FROM content.tours t WHERE t.cover_media_id = NEW.id OR t.pdf_media_id = NEW.id)
     OR EXISTS (SELECT 1 FROM content.tour_stops s WHERE s.media_id = NEW.id) THEN
    RAISE EXCEPTION 'media % is still used and cannot be retired', NEW.id USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END $$;
