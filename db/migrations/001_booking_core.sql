BEGIN;

CREATE TABLE IF NOT EXISTS room_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO room_types (id, name) VALUES
  ('deluxe', 'Deluxe Room'),
  ('super-deluxe', 'Super Deluxe Room'),
  ('premium', 'Premium Room')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  room_id TEXT NOT NULL REFERENCES room_types(id),
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  adults INTEGER NOT NULL CHECK (adults > 0),
  children INTEGER NOT NULL CHECK (children >= 0),
  rooms INTEGER NOT NULL CHECK (rooms > 0),
  rate_plan_id TEXT NOT NULL,
  addon_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  promo_code TEXT,
  guest JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'website',
  pricing JSONB NOT NULL,
  status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT,
  payment_order_id TEXT,
  payment_id TEXT,
  staff_notes TEXT,
  access_token_hash TEXT,
  confirmation_email_status TEXT,
  confirmation_email_sent_at TEXT,
  confirmation_email_error TEXT
);

CREATE INDEX IF NOT EXISTS reservations_stay_idx
  ON reservations (room_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS reservations_status_idx
  ON reservations (status, payment_status);
CREATE INDEX IF NOT EXISTS reservations_created_idx
  ON reservations (created_at);

CREATE TABLE IF NOT EXISTS inventory_blocks (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES room_types(id),
  date TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS inventory_blocks_room_date_idx
  ON inventory_blocks (room_id, date);

CREATE TABLE IF NOT EXISTS booking_operations (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processed_webhooks (
  event_id TEXT PRIMARY KEY,
  position INTEGER NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
