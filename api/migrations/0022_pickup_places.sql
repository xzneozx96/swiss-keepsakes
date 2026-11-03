-- Pickup points (E6.6): one list that self-collect orders and partner handovers share (ADR-024). References to a point
-- are plain ids in other modules (ADR-013), so a point is archived, never deleted by the API.
-- Hours are local Europe/Zurich times of day. Gate G-S8-D5 (2026-11-03) replaces the DDL's `opens < closes`: a span whose
-- `closes` is before its `opens` closes the next morning, `24:00` closes at midnight, and `opens` equal to `closes`
-- stays refused as ambiguous (as migration 0019 did for pin hours). Spans on one day are not checked against each other.
-- `row_version` is added to the DDL for If-Match saves (ADR-014).
SET lock_timeout = '3s';--> statement-breakpoint
CREATE TABLE catalog.pickup_places (
  id           uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id     uuid NOT NULL,
  name         jsonb NOT NULL,
  address      jsonb NOT NULL,
  instructions jsonb,
  position     integer NOT NULL DEFAULT 1,
  archived_at  timestamptz,
  row_version  integer NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pickup_places_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT pickup_places_name_check CHECK (jsonb_typeof(name) = 'object' AND name ?| ARRAY['en', 'de']),
  CONSTRAINT pickup_places_address_check CHECK (jsonb_typeof(address) = 'object' AND address ?| ARRAY['en', 'de'])
);--> statement-breakpoint
CREATE INDEX pickup_places_active_idx ON catalog.pickup_places (store_id, position) WHERE archived_at IS NULL;--> statement-breakpoint
CREATE TABLE catalog.pickup_place_hours (
  place_id uuid NOT NULL,
  store_id uuid NOT NULL,
  weekday  smallint NOT NULL,
  opens    time NOT NULL,
  closes   time NOT NULL,
  CONSTRAINT pickup_place_hours_pkey PRIMARY KEY (place_id, weekday, opens),
  CONSTRAINT pickup_place_hours_place_fkey FOREIGN KEY (store_id, place_id)
    REFERENCES catalog.pickup_places (store_id, id) ON DELETE CASCADE,
  CONSTRAINT pickup_place_hours_weekday_check CHECK (weekday BETWEEN 1 AND 7),
  CONSTRAINT pickup_place_hours_span_check CHECK (opens <> closes)
);
