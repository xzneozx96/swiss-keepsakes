-- Owner decision 2026-11-02: opening hours may cross midnight. A span whose `closes` is before its `opens` closes the
-- next morning (Sunday into Monday); `opens` equal to `closes` is ambiguous and stays refused. `24:00` still closes at
-- midnight, so 00:00 to 24:00 is the whole day. Spans on one day were never checked against each other, and still are not.
-- Safe to run twice: CREATE OR REPLACE. The CHECK on content.places calls this function, and the rule only got wider.
SET lock_timeout = '3s';--> statement-breakpoint
CREATE OR REPLACE FUNCTION content.valid_weekly_hours(h jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_typeof(h) = 'array' AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(h) e
    WHERE NOT coalesce(
      jsonb_typeof(e) = 'object' AND (e - 'day' - 'opens' - 'closes') = '{}'::jsonb
      AND jsonb_typeof(e->'day') = 'number' AND (e->>'day') ~ '^[1-7]$'
      AND jsonb_typeof(e->'opens') = 'string' AND (e->>'opens') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      AND jsonb_typeof(e->'closes') = 'string' AND (e->>'closes') ~ '^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$'
      AND (e->>'opens') <> (e->>'closes'), false));
$$;
