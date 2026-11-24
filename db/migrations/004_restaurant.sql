-- Phase 2: restaurant menu and the request-to-order schema (ordering behaviour arrives in Phase 6).
-- Additive only. Applied by scripts/db-migrate.mjs in one transaction with its ledger row.
--
-- Menu facts come from the hotel-issued "Room Menu" (content ledger §3). Unknown values stay
-- NULL: restaurant public name, opening time, room-delivery policy and half-portion prices.
-- contains_egg is the only dietary marker; the schema has no vegetarian-only flag on purpose.

CREATE TABLE IF NOT EXISTS menu_categories (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order INTEGER NOT NULL DEFAULT 0,
  note TEXT CHECK (note IS NULL OR length(note) <= 300),
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS menu_categories_public_idx ON menu_categories (published, sort_order);

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category_id TEXT NOT NULL REFERENCES menu_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  -- Original spelling on the printed menu when the display name was normalised.
  source_name TEXT CHECK (source_name IS NULL OR length(source_name) <= 160),
  description TEXT CHECK (description IS NULL OR length(description) <= 600),
  portion TEXT CHECK (portion IS NULL OR length(portion) <= 60),
  variants JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(variants) = 'array'),
  price_full NUMERIC(10, 2) NOT NULL CHECK (price_full >= 0),
  price_half NUMERIC(10, 2) CHECK (price_half >= 0),
  contains_egg BOOLEAN NOT NULL DEFAULT false,
  available BOOLEAN NOT NULL DEFAULT true,
  signature BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  -- Set when a source value looks questionable and needs the owner's confirmation. The source
  -- value is kept as printed; the note explains what to confirm.
  review_note TEXT CHECK (review_note IS NULL OR length(review_note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT menu_items_half_not_above_full CHECK (price_half IS NULL OR price_half <= price_full),
  CONSTRAINT menu_items_unique_name_per_category UNIQUE (category_id, name)
);

CREATE INDEX IF NOT EXISTS menu_items_category_idx ON menu_items (category_id, published, sort_order);

-- Singleton settings row (id = 1).
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  public_name TEXT CHECK (public_name IS NULL OR length(btrim(public_name)) BETWEEN 1 AND 120),
  opening_time TIME,
  last_order_time TIME,
  prep_minutes_min SMALLINT CHECK (prep_minutes_min BETWEEN 0 AND 240),
  prep_minutes_max SMALLINT CHECK (prep_minutes_max BETWEEN 0 AND 240),
  service_charge_pct NUMERIC(5, 2) CHECK (service_charge_pct BETWEEN 0 AND 30),
  taxes_note TEXT,
  allergy_note TEXT,
  no_cancel_note TEXT,
  price_change_note TEXT,
  service_charge_note TEXT,
  ordering_enabled BOOLEAN NOT NULL DEFAULT false,
  -- NULL = not yet confirmed by the hotel.
  room_delivery_enabled BOOLEAN,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT restaurant_settings_prep_range CHECK (
    prep_minutes_min IS NULL OR prep_minutes_max IS NULL OR prep_minutes_min <= prep_minutes_max
  )
);

-- Request-to-order (Phase 6): the guest requests, staff accept or decline, payment happens at the
-- hotel or on the room bill. Guests cannot cancel (printed menu policy).
CREATE TABLE IF NOT EXISTS menu_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  reference TEXT NOT NULL UNIQUE CHECK (reference ~ '^TLO-[0-9A-Z]{8,12}$'),
  room_number TEXT CHECK (room_number IS NULL OR room_number ~ '^[A-Za-z0-9-]{1,10}$'),
  guest_name TEXT NOT NULL CHECK (length(btrim(guest_name)) BETWEEN 1 AND 80),
  phone_e164 TEXT NOT NULL CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'accepted', 'preparing', 'out_for_delivery', 'ready', 'delivered', 'declined', 'cancelled_by_staff'
  )),
  decline_reason TEXT CHECK (decline_reason IS NULL OR length(decline_reason) <= 300),
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  service_charge NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (service_charge >= 0),
  total_excl_tax NUMERIC(10, 2) NOT NULL CHECK (total_excl_tax >= 0),
  notes TEXT CHECK (notes IS NULL OR length(notes) <= 500),
  accepted_by TEXT,
  status_history JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(status_history) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT menu_orders_total_chk CHECK (total_excl_tax = subtotal + service_charge)
);

CREATE INDEX IF NOT EXISTS menu_orders_queue_idx ON menu_orders (status, created_at);
CREATE INDEX IF NOT EXISTS menu_orders_phone_idx ON menu_orders (phone_e164, created_at);

CREATE TABLE IF NOT EXISTS menu_order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL REFERENCES menu_orders(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES menu_items(id) ON UPDATE CASCADE ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL CHECK (length(btrim(name_snapshot)) BETWEEN 1 AND 160),
  variant TEXT CHECK (variant IS NULL OR length(variant) <= 80),
  qty SMALLINT NOT NULL CHECK (qty BETWEEN 1 AND 50),
  unit_price_snapshot NUMERIC(10, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS menu_order_items_order_idx ON menu_order_items (order_id);
CREATE INDEX IF NOT EXISTS menu_order_items_item_idx ON menu_order_items (item_id);

CREATE OR REPLACE TRIGGER menu_categories_touch BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION tejjora_touch_updated_at();
CREATE OR REPLACE TRIGGER menu_items_touch BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION tejjora_touch_updated_at();
CREATE OR REPLACE TRIGGER restaurant_settings_touch BEFORE UPDATE ON restaurant_settings FOR EACH ROW EXECUTE FUNCTION tejjora_touch_updated_at();
CREATE OR REPLACE TRIGGER menu_orders_touch BEFORE UPDATE ON menu_orders FOR EACH ROW EXECUTE FUNCTION tejjora_touch_updated_at();
