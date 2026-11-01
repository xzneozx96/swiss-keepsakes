SET lock_timeout = '3s';--> statement-breakpoint
-- DESC-rich (owner, 2026-11-01): the Description of a keepsake is one Tiptap document per language, not a plain
-- string. `draft` and `published` of catalog.products are jsonb already, so no column changes: under `text` each
-- language holds {"type": "doc", "content": [paragraphs]} (the API allows paragraphs, hard breaks, lists, bold,
-- italic and links). Every plain text already stored becomes a document: a blank line starts a paragraph, a single
-- newline is a hard break, each line is trimmed. packages/domain/src/content/description.ts (descriptionFromPlain)
-- applies the same rule. Row versions stay: the words do not change. A language that holds a document stays as it
-- is, so the migration can run twice.
CREATE FUNCTION pg_temp.plain_to_description(plain text) RETURNS jsonb LANGUAGE sql AS $$
  WITH pieces AS (
    SELECT p.piece, p.ord
    FROM regexp_split_to_table(replace(plain, E'\r\n', E'\n'), E'\n\\s*\\n') WITH ORDINALITY AS p(piece, ord)
  ), lines AS (
    SELECT pieces.ord,
           row_number() OVER (PARTITION BY pieces.ord ORDER BY l.n) AS rn,
           regexp_replace(l.line, '^\s+|\s+$', '', 'g') AS line
    FROM pieces, regexp_split_to_table(pieces.piece, E'\n') WITH ORDINALITY AS l(line, n)
    WHERE regexp_replace(l.line, '^\s+|\s+$', '', 'g') <> ''
  ), nodes AS (
    SELECT ord, rn * 2 AS k, jsonb_build_object('type', 'text', 'text', line) AS node FROM lines
    UNION ALL
    SELECT ord, rn * 2 - 1, jsonb_build_object('type', 'hardBreak') FROM lines WHERE rn > 1
  ), paragraphs AS (
    SELECT ord, jsonb_build_object('type', 'paragraph', 'content', jsonb_agg(node ORDER BY k)) AS node
    FROM nodes GROUP BY ord
  )
  SELECT CASE WHEN count(*) = 0 THEN NULL
              ELSE jsonb_build_object('type', 'doc', 'content', jsonb_agg(node ORDER BY ord)) END
  FROM paragraphs
$$;--> statement-breakpoint
-- A language whose text has no words at all (it cannot exist through the API) has no key afterwards.
CREATE FUNCTION pg_temp.text_map_to_descriptions(texts jsonb) RETURNS jsonb LANGUAGE sql AS $$
  SELECT coalesce(jsonb_object_agg(e.key, e.val), '{}'::jsonb)
  FROM (
    SELECT t.key,
           CASE WHEN jsonb_typeof(t.value) = 'string' THEN pg_temp.plain_to_description(t.value #>> '{}') ELSE t.value END AS val
    FROM jsonb_each(texts) AS t(key, value)
  ) e
  WHERE e.val IS NOT NULL
$$;--> statement-breakpoint
UPDATE catalog.products SET
  draft = CASE WHEN jsonb_typeof(draft -> 'text') = 'object'
               THEN jsonb_set(draft, '{text}', pg_temp.text_map_to_descriptions(draft -> 'text')) ELSE draft END,
  published = CASE WHEN jsonb_typeof(published -> 'text') = 'object'
                   THEN jsonb_set(published, '{text}', pg_temp.text_map_to_descriptions(published -> 'text')) ELSE published END
WHERE jsonb_typeof(draft -> 'text') = 'object' OR jsonb_typeof(published -> 'text') = 'object';
