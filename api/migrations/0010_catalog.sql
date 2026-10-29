SET lock_timeout = '3s';--> statement-breakpoint
CREATE SCHEMA catalog;--> statement-breakpoint
CREATE TABLE catalog.products (
  id                uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id          uuid NOT NULL,
  status            text NOT NULL DEFAULT 'draft',
  slug              jsonb,
  published         jsonb,
  draft             jsonb,
  preparation_hours integer,  -- NULL means every order waits for a manual accept (ADR-009, O22)
  commission_rate   numeric(5,4) NOT NULL DEFAULT 0,
  row_version       integer NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT products_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT products_slug_shape_check CHECK (slug IS NULL OR platform.valid_slug_map(slug)),
  CONSTRAINT products_published_fields_check CHECK (status = 'draft' OR (
    slug IS NOT NULL AND jsonb_typeof(published->'name') = 'object'
    AND ((published->'name') ? 'en') = (slug ? 'en')
    AND ((published->'name') ? 'de') = (slug ? 'de')) IS TRUE),
  CONSTRAINT products_preparation_check CHECK (preparation_hours > 0),
  CONSTRAINT products_commission_check CHECK (commission_rate BETWEEN 0 AND 1)
);--> statement-breakpoint
-- Generic options (owner M9, Medusa-style). A product has options such as Size, Theme and Colour, each with values.
-- A SKU takes exactly one value of each option of its product. A product may have no options and then one SKU.
CREATE TABLE catalog.product_options (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id    uuid NOT NULL,
  product_id  uuid NOT NULL,
  name        jsonb NOT NULL,
  position    integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_options_product_id_key UNIQUE (product_id, id),
  CONSTRAINT product_options_position_key UNIQUE (product_id, position) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT product_options_product_fkey FOREIGN KEY (store_id, product_id)
    REFERENCES catalog.products (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT product_options_name_check CHECK (jsonb_typeof(name) = 'object' AND name ?| ARRAY['en', 'de']),
  CONSTRAINT product_options_position_check CHECK (position >= 1)
);--> statement-breakpoint
CREATE TABLE catalog.product_option_values (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id    uuid NOT NULL,
  product_id  uuid NOT NULL,
  option_id   uuid NOT NULL,
  label       jsonb NOT NULL,
  swatch      text,
  position    integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_option_values_link_key UNIQUE (product_id, option_id, id),
  CONSTRAINT product_option_values_position_key UNIQUE (option_id, position) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT product_option_values_option_fkey FOREIGN KEY (product_id, option_id)
    REFERENCES catalog.product_options (product_id, id) ON DELETE RESTRICT,
  CONSTRAINT product_option_values_store_fkey FOREIGN KEY (store_id, product_id)
    REFERENCES catalog.products (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT product_option_values_label_check CHECK (jsonb_typeof(label) = 'object' AND label ?| ARRAY['en', 'de']),
  CONSTRAINT product_option_values_swatch_check CHECK (swatch IS NULL OR swatch ~ '^#[0-9a-f]{6}$'),
  CONSTRAINT product_option_values_position_check CHECK (position >= 1)
);--> statement-breakpoint
-- A SKU row exists only for a combination that is sold. Prices are integer Rappen (backend.md section 5).
-- combination_key is computed from the SKU's option values by sync_sku_combination at commit.
CREATE TABLE catalog.skus (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id        uuid NOT NULL,
  sku_code        text NOT NULL,
  product_id      uuid NOT NULL,
  combination_key text,
  price_rappen    bigint NOT NULL,
  status          text NOT NULL DEFAULT 'draft',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT skus_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT skus_product_id_key UNIQUE (product_id, id),
  CONSTRAINT skus_store_sku_code_key UNIQUE (store_id, sku_code),
  CONSTRAINT skus_sku_code_check CHECK (sku_code ~ '^[A-Za-z0-9]+([-_.][A-Za-z0-9]+)*$'),
  -- one SKU per combination of option values in a product (a product with no options has one SKU)
  CONSTRAINT skus_combination_key UNIQUE (product_id, combination_key),
  CONSTRAINT skus_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT skus_price_check CHECK (price_rappen > 0),
  CONSTRAINT skus_product_fkey FOREIGN KEY (store_id, product_id) REFERENCES catalog.products (store_id, id) ON DELETE RESTRICT
);--> statement-breakpoint
CREATE TABLE catalog.sku_option_values (
  sku_id     uuid NOT NULL,
  option_id  uuid NOT NULL,
  value_id   uuid NOT NULL,
  product_id uuid NOT NULL,
  store_id   uuid NOT NULL,
  -- one value of each option, never two
  CONSTRAINT sku_option_values_pkey PRIMARY KEY (sku_id, option_id),
  CONSTRAINT sku_option_values_sku_fkey FOREIGN KEY (product_id, sku_id)
    REFERENCES catalog.skus (product_id, id) ON DELETE CASCADE,
  -- the value belongs to that option, and the option to the SKU's own product
  CONSTRAINT sku_option_values_value_fkey FOREIGN KEY (product_id, option_id, value_id)
    REFERENCES catalog.product_option_values (product_id, option_id, id) ON DELETE RESTRICT
);--> statement-breakpoint
-- At commit a SKU must have exactly one value for every option of its product, and its combination key is stored.
-- The product row is locked, so a new option and a new SKU cannot both slip past the count.
CREATE FUNCTION catalog.sync_sku_combination(p_sku uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  pid  uuid;
  need integer;
  have integer;
  ckey text;
BEGIN
  SELECT s.product_id INTO pid FROM catalog.skus s WHERE s.id = p_sku;
  IF pid IS NULL THEN RETURN; END IF;
  PERFORM 1 FROM catalog.products p WHERE p.id = pid FOR SHARE;
  SELECT count(*) INTO need FROM catalog.product_options o WHERE o.product_id = pid;
  SELECT count(*), coalesce(string_agg(v.option_id::text || ':' || v.value_id::text, ',' ORDER BY v.option_id), '')
    INTO have, ckey FROM catalog.sku_option_values v WHERE v.sku_id = p_sku;
  IF have <> need THEN
    RAISE EXCEPTION 'sku % has % option values, its product has % options', p_sku, have, need
      USING ERRCODE = 'check_violation', CONSTRAINT = 'skus_complete_options';
  END IF;
  UPDATE catalog.skus SET combination_key = ckey WHERE id = p_sku AND combination_key IS DISTINCT FROM ckey;
END $$;--> statement-breakpoint
CREATE FUNCTION catalog.sku_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'skus' THEN PERFORM catalog.sync_sku_combination(NEW.id);
  ELSIF TG_OP = 'DELETE' THEN PERFORM catalog.sync_sku_combination(OLD.sku_id);
  ELSE PERFORM catalog.sync_sku_combination(NEW.sku_id);
  END IF;
  RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER skus_options_complete AFTER INSERT ON catalog.skus
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION catalog.sku_trigger();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER sku_option_values_complete AFTER INSERT OR UPDATE OR DELETE ON catalog.sku_option_values
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION catalog.sku_trigger();--> statement-breakpoint
-- Adding or removing an option of a product that has SKUs rechecks every SKU of that product.
CREATE FUNCTION catalog.product_option_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pid uuid; sid uuid;
BEGIN
  pid := CASE WHEN TG_OP = 'DELETE' THEN OLD.product_id ELSE NEW.product_id END;
  PERFORM 1 FROM catalog.products p WHERE p.id = pid FOR UPDATE;
  FOR sid IN SELECT s.id FROM catalog.skus s WHERE s.product_id = pid LOOP
    PERFORM catalog.sync_sku_combination(sid);
  END LOOP;
  RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER product_options_recheck_skus AFTER INSERT OR DELETE ON catalog.product_options
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION catalog.product_option_trigger();--> statement-breakpoint
-- Categories (owner M10): a tree per store, tables only in Phase 1.
CREATE TABLE catalog.product_categories (
  id          uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id    uuid NOT NULL,
  name        jsonb NOT NULL,
  slug        text NOT NULL,
  parent_id   uuid,
  position    integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_categories_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT product_categories_store_slug_key UNIQUE (store_id, slug),
  CONSTRAINT product_categories_parent_fkey FOREIGN KEY (store_id, parent_id)
    REFERENCES catalog.product_categories (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT product_categories_name_check CHECK (jsonb_typeof(name) = 'object' AND name ?| ARRAY['en', 'de']),
  CONSTRAINT product_categories_slug_check CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT product_categories_not_own_parent_check CHECK (parent_id IS DISTINCT FROM id),
  CONSTRAINT product_categories_position_check CHECK (position >= 1)
);--> statement-breakpoint
CREATE FUNCTION catalog.assert_category_tree() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL AND EXISTS (
       WITH RECURSIVE up AS (
         SELECT c.id, c.parent_id FROM catalog.product_categories c WHERE c.id = NEW.parent_id
         UNION ALL
         SELECT c.id, c.parent_id FROM catalog.product_categories c JOIN up ON c.id = up.parent_id)
       SELECT 1 FROM up WHERE up.id = NEW.id) THEN
    RAISE EXCEPTION 'category % would become its own ancestor', NEW.id USING ERRCODE = 'check_violation', CONSTRAINT = 'product_categories_no_cycle';
  END IF;
  RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER product_categories_no_cycle BEFORE INSERT OR UPDATE OF parent_id ON catalog.product_categories
  FOR EACH ROW EXECUTE FUNCTION catalog.assert_category_tree();--> statement-breakpoint
CREATE TABLE catalog.product_category_links (
  product_id  uuid NOT NULL,
  category_id uuid NOT NULL,
  store_id    uuid NOT NULL,
  position    integer NOT NULL DEFAULT 1,
  CONSTRAINT product_category_links_pkey PRIMARY KEY (product_id, category_id),
  CONSTRAINT product_category_links_product_fkey FOREIGN KEY (store_id, product_id)
    REFERENCES catalog.products (store_id, id) ON DELETE CASCADE,
  CONSTRAINT product_category_links_category_fkey FOREIGN KEY (store_id, category_id)
    REFERENCES catalog.product_categories (store_id, id) ON DELETE RESTRICT,
  CONSTRAINT product_category_links_position_check CHECK (position >= 1)
);--> statement-breakpoint
CREATE TABLE catalog.product_media (
  product_id uuid NOT NULL, store_id uuid NOT NULL, position integer NOT NULL, media_id uuid NOT NULL,
  CONSTRAINT product_media_pkey PRIMARY KEY (product_id, position),
  CONSTRAINT product_media_product_fkey FOREIGN KEY (store_id, product_id) REFERENCES catalog.products (store_id, id) ON DELETE CASCADE,
  CONSTRAINT product_media_position_check CHECK (position >= 1)
);--> statement-breakpoint
CREATE UNIQUE INDEX products_slug_en_key ON catalog.products ((slug->>'en')) WHERE slug ? 'en';--> statement-breakpoint
CREATE UNIQUE INDEX products_slug_de_key ON catalog.products ((slug->>'de')) WHERE slug ? 'de';--> statement-breakpoint
CREATE INDEX products_store_status_idx ON catalog.products (store_id, status);--> statement-breakpoint
CREATE INDEX skus_product_idx ON catalog.skus (product_id);--> statement-breakpoint
CREATE UNIQUE INDEX product_media_media_key ON catalog.product_media (product_id, media_id);
