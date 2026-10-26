SET lock_timeout = '3s';--> statement-breakpoint
CREATE FUNCTION platform.reject_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% on %.% is refused: the table is append-only', TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation';
END $$;--> statement-breakpoint
CREATE FUNCTION platform.valid_interests(codes text[]) RETURNS boolean
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT codes IS NOT NULL AND codes <@ ARRAY['history-culture','food-drink','lake-mountains','shopping-keepsakes']::text[] $$;--> statement-breakpoint
CREATE FUNCTION platform.valid_slug_map(slugs jsonb) RETURNS boolean
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT jsonb_typeof(slugs) = 'object'
        AND slugs ?| ARRAY['en','de']
        AND (slugs - 'en' - 'de') = '{}'::jsonb
        AND (NOT slugs ? 'en' OR (jsonb_typeof(slugs->'en') = 'string' AND slugs->>'en' ~ '^[a-z0-9]+(-[a-z0-9]+)*$'))
        AND (NOT slugs ? 'de' OR (jsonb_typeof(slugs->'de') = 'string' AND slugs->>'de' ~ '^[a-z0-9]+(-[a-z0-9]+)*$')) $$;--> statement-breakpoint
CREATE FUNCTION platform.require_trigger_context() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'a column of %.% is maintained by a trigger and cannot be written directly', TG_TABLE_SCHEMA, TG_TABLE_NAME
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END $$;--> statement-breakpoint
CREATE FUNCTION platform.reject_column_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'column % of %.% cannot change after insert', TG_ARGV[0], TG_TABLE_SCHEMA, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END $$;
