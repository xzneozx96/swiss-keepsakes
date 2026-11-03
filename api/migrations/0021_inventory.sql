-- Inventory (E6.3, DM-6, ADR-016): stock per variant, the hold rows that guard against overselling, and the append-only
-- history of counts. The CHECK stock_items_held_within_on_hand is the oversell guard; apply_hold_change keeps held and
-- on_hand in step with the hold rows. No foreign key to catalog.skus (ADR-013).
-- Back-fill: one empty stock row (on_hand 0, held 0) for every existing SKU, archived ones included, no history row.
-- The back-fill statement is safe to run twice (ON CONFLICT DO NOTHING).
SET lock_timeout = '3s';
--> statement-breakpoint
CREATE SCHEMA inventory;
--> statement-breakpoint
CREATE TABLE inventory.stock_items (
  sku_id      uuid PRIMARY KEY,
  store_id    uuid NOT NULL,
  on_hand     integer NOT NULL DEFAULT 0,
  held        integer NOT NULL DEFAULT 0,
  row_version integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_items_store_sku_key UNIQUE (store_id, sku_id),
  CONSTRAINT stock_items_on_hand_check CHECK (on_hand >= 0),
  CONSTRAINT stock_items_held_check CHECK (held >= 0),
  -- AC05: available stock (on_hand - held) is never negative, whatever the application does
  CONSTRAINT stock_items_held_within_on_hand CHECK (held <= on_hand)
);
--> statement-breakpoint
CREATE TABLE inventory.stock_holds (
  id            uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id      uuid NOT NULL,
  sku_id        uuid NOT NULL,
  order_id      uuid NOT NULL,
  order_line_id uuid NOT NULL,
  quantity      integer NOT NULL,
  state         text NOT NULL DEFAULT 'held',
  resolved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_holds_order_line_key UNIQUE (order_line_id),
  CONSTRAINT stock_holds_quantity_check CHECK (quantity > 0),
  CONSTRAINT stock_holds_state_check CHECK (state IN ('held', 'issued', 'released')),
  CONSTRAINT stock_holds_resolved_check CHECK ((state = 'held') = (resolved_at IS NULL)),
  CONSTRAINT stock_holds_item_fkey FOREIGN KEY (store_id, sku_id)
    REFERENCES inventory.stock_items (store_id, sku_id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE inventory.stock_adjustments (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id        uuid NOT NULL,
  sku_id          uuid NOT NULL,
  kind            text NOT NULL,
  delta           integer NOT NULL,
  on_hand_before  integer NOT NULL,
  on_hand_after   integer NOT NULL,
  reason          text,
  actor_user_id   uuid,
  order_id        uuid,
  at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_adjustments_kind_check CHECK (kind IN ('set', 'issue')),
  CONSTRAINT stock_adjustments_arithmetic_check CHECK (on_hand_after = on_hand_before + delta AND on_hand_after >= 0),
  CONSTRAINT stock_adjustments_who_check CHECK ((kind = 'set' AND actor_user_id IS NOT NULL) OR (kind = 'issue' AND order_id IS NOT NULL)),
  CONSTRAINT stock_adjustments_item_fkey FOREIGN KEY (store_id, sku_id)
    REFERENCES inventory.stock_items (store_id, sku_id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TRIGGER stock_adjustments_append_only BEFORE UPDATE OR DELETE ON inventory.stock_adjustments
  FOR EACH ROW EXECUTE FUNCTION platform.reject_change();
--> statement-breakpoint
CREATE TRIGGER stock_holds_never_deleted BEFORE DELETE ON inventory.stock_holds
  FOR EACH ROW EXECUTE FUNCTION platform.reject_change();
--> statement-breakpoint
-- The hold rows are the source of truth. This trigger keeps stock_items.held and on_hand in step,
-- so the CHECK above is the oversell guard. The row update takes the stock row lock; callers insert
-- the lines of one order in sku_id order to avoid deadlocks.
CREATE FUNCTION inventory.apply_hold_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE before_on_hand integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'held' THEN
      RAISE EXCEPTION 'a hold starts as held' USING ERRCODE = 'check_violation';
    END IF;
    UPDATE inventory.stock_items SET held = held + NEW.quantity, updated_at = now() WHERE sku_id = NEW.sku_id;
  ELSE
    IF OLD.state <> 'held' OR NEW.sku_id <> OLD.sku_id OR NEW.quantity <> OLD.quantity THEN
      RAISE EXCEPTION 'a resolved hold, its sku and its quantity cannot change' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.state = 'released' THEN
      UPDATE inventory.stock_items SET held = held - OLD.quantity, updated_at = now() WHERE sku_id = OLD.sku_id;
    ELSIF NEW.state = 'issued' THEN
      UPDATE inventory.stock_items SET held = held - OLD.quantity, on_hand = on_hand - OLD.quantity, updated_at = now()
        WHERE sku_id = OLD.sku_id RETURNING on_hand + OLD.quantity INTO before_on_hand;
      INSERT INTO inventory.stock_adjustments (store_id, sku_id, kind, delta, on_hand_before, on_hand_after, order_id)
        VALUES (OLD.store_id, OLD.sku_id, 'issue', -OLD.quantity, before_on_hand, before_on_hand - OLD.quantity, OLD.order_id);
    END IF;
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER stock_holds_apply AFTER INSERT OR UPDATE ON inventory.stock_holds
  FOR EACH ROW EXECUTE FUNCTION inventory.apply_hold_change();
--> statement-breakpoint
CREATE TRIGGER stock_items_held_by_trigger_only BEFORE UPDATE OF held ON inventory.stock_items
  FOR EACH ROW WHEN (OLD.held IS DISTINCT FROM NEW.held) EXECUTE FUNCTION platform.require_trigger_context();
--> statement-breakpoint
INSERT INTO inventory.stock_items (sku_id, store_id)
SELECT id, store_id FROM catalog.skus
ON CONFLICT DO NOTHING;
