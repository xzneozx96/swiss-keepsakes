SET lock_timeout = '3s';--> statement-breakpoint
-- Owner decisions 2026-11-02 (docs/decisions/2026-11-02-keepsake-editor-steps.md, "New on 2026-11-02"):
-- 1. A SKU code is optional, as in Shopify: catalog.skus.sku_code may be NULL. skus_sku_code_check already passes on NULL
--    (a CHECK holds unless it is false), and UNIQUE (store_id, sku_code) treats NULLs as distinct (the default, no NULLS NOT
--    DISTINCT), so any number of variants of a shop may have no code and a present code stays unique per shop. Existing
--    codes are kept.
-- 2. A variant may show one photo from the keepsake's media: skus.media_id, a plain id with no foreign key (ADR-013).
-- 3. Colour swatches are gone: product_option_values.swatch and its CHECK are dropped (dev held no stored swatch).
-- Safe to run twice: every step checks what is already there.
ALTER TABLE catalog.skus ALTER COLUMN sku_code DROP NOT NULL;--> statement-breakpoint
ALTER TABLE catalog.skus ADD COLUMN IF NOT EXISTS media_id uuid;--> statement-breakpoint
ALTER TABLE catalog.product_option_values DROP CONSTRAINT IF EXISTS product_option_values_swatch_check;--> statement-breakpoint
ALTER TABLE catalog.product_option_values DROP COLUMN IF EXISTS swatch;
