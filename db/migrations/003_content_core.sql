-- Phase 2: content core. Additive only: creates new tables, functions and triggers; never
-- modifies or deletes reservations, payments, inventory or booking configuration.
-- scripts/db-migrate.mjs applies this file and its schema_migrations row in ONE transaction.
--
-- Authority rules encoded here (see docs/TEJJORA_CONTENT_SOURCE_LEDGER.md):
--   * room ids (deluxe, super-deluxe, premium) are stable keys and cannot be renamed;
--   * live room pricing and inventory stay in the booking system, so `rooms` has no price columns;
--   * demo reviews can never be published; policies are published only once approved;
--   * unknown property values stay NULL instead of being guessed.

CREATE OR REPLACE FUNCTION tejjora_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION tejjora_keep_stable_id() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Room ids are stable keys and cannot be renamed (% -> %)', OLD.id, NEW.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- Existing booking table from 001: guard the stable ids without touching any row.
CREATE OR REPLACE TRIGGER room_types_keep_id
  BEFORE UPDATE OF id ON room_types
  FOR EACH ROW EXECUTE FUNCTION tejjora_keep_stable_id();

-- ---------------------------------------------------------------------------------------------
-- Media
-- storage_path is a site path ("/images/...") today; Phase 3 adds Supabase Storage object keys.
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  storage_path TEXT NOT NULL UNIQUE CHECK (length(storage_path) BETWEEN 2 AND 512),
  width INTEGER CHECK (width BETWEEN 1 AND 20000),
  height INTEGER CHECK (height BETWEEN 1 AND 20000),
  blur_data TEXT CHECK (blur_data IS NULL OR length(blur_data) <= 4096),
  alt TEXT NOT NULL DEFAULT '' CHECK (length(alt) <= 300),
  credit TEXT CHECK (credit IS NULL OR length(credit) <= 200),
  provenance TEXT NOT NULL CHECK (provenance IN ('tejjora', 'licensed', 'illustrative', 'placeholder')),
  licence TEXT CHECK (licence IS NULL OR length(licence) <= 200),
  source_url TEXT CHECK (source_url IS NULL OR source_url ~ '^https://'),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT media_assets_licensed_needs_licence CHECK (provenance <> 'licensed' OR licence IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS media_assets_provenance_idx ON media_assets (provenance);

CREATE TABLE IF NOT EXISTS entity_media (
  entity_type TEXT NOT NULL CHECK (entity_type IN ('room', 'gallery', 'restaurant', 'offer', 'tour', 'home', 'page')),
  entity_id TEXT NOT NULL CHECK (entity_id ~ '^[a-z0-9][a-z0-9_-]{0,119}$'),
  media_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'gallery' CHECK (role ~ '^[a-z][a-z0-9-]{0,39}$'),
  sort_order INTEGER NOT NULL DEFAULT 0,
  layout_hint TEXT CHECK (layout_hint IS NULL OR layout_hint IN ('landscape', 'portrait', 'wide', 'square')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entity_type, entity_id, role, media_id)
);

-- Read pattern: all media for one or many entities of a type, in display order.
CREATE INDEX IF NOT EXISTS entity_media_lookup_idx ON entity_media (entity_type, entity_id, role, sort_order);
CREATE INDEX IF NOT EXISTS entity_media_media_idx ON entity_media (media_id);

-- ---------------------------------------------------------------------------------------------
-- Rooms: descriptive content only. Rates, overrides and inventory remain in the booking system.
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY REFERENCES room_types(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  summary TEXT CHECK (summary IS NULL OR length(summary) <= 600),
  body TEXT CHECK (body IS NULL OR length(body) <= 6000),
  size_sqft INTEGER CHECK (size_sqft BETWEEN 50 AND 10000),
  bed_type TEXT CHECK (bed_type IS NULL OR length(bed_type) <= 120),
  max_adults SMALLINT CHECK (max_adults BETWEEN 1 AND 12),
  max_children SMALLINT CHECK (max_children BETWEEN 0 AND 12),
  view TEXT CHECK (view IS NULL OR length(view) <= 160),
  amenities JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(amenities) = 'array'),
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rooms_published_sort_idx ON rooms (published, sort_order);

CREATE OR REPLACE TRIGGER rooms_keep_id
  BEFORE UPDATE OF id ON rooms
  FOR EACH ROW EXECUTE FUNCTION tejjora_keep_stable_id();

-- ---------------------------------------------------------------------------------------------
-- Property facts. Public readers return a fact only when status = 'verified' AND public.
CREATE TABLE IF NOT EXISTS property_facts (
  key TEXT PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_.]{1,79}$'),
  value JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('verified', 'provisional', 'placeholder', 'conflict')),
  source TEXT NOT NULL CHECK (length(btrim(source)) BETWEEN 1 AND 300),
  public BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS property_facts_public_idx ON property_facts (key) WHERE status = 'verified' AND public;

-- ---------------------------------------------------------------------------------------------
-- Offers. adjustment_* and promo_code describe an offer; the booking pricing engine
-- (PROMO_CODES_JSON / rate plans) stays the only authority that prices a stay.
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 160),
  summary TEXT CHECK (summary IS NULL OR length(summary) <= 800),
  terms TEXT CHECK (terms IS NULL OR length(terms) <= 4000),
  valid_from DATE,
  valid_to DATE,
  room_ids TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(room_ids) <= 10),
  adjustment_type TEXT CHECK (adjustment_type IN ('percent', 'fixed')),
  adjustment_value NUMERIC(10, 2) CHECK (adjustment_value >= 0),
  promo_code TEXT CHECK (promo_code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$'),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT offers_window_chk CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_to >= valid_from),
  CONSTRAINT offers_adjustment_pair_chk CHECK ((adjustment_type IS NULL) = (adjustment_value IS NULL)),
  CONSTRAINT offers_percent_chk CHECK (adjustment_type IS DISTINCT FROM 'percent' OR adjustment_value <= 100),
  CONSTRAINT offers_demo_never_published CHECK (NOT (is_demo AND published))
);

CREATE INDEX IF NOT EXISTS offers_public_idx ON offers (published, valid_from, valid_to);

-- ---------------------------------------------------------------------------------------------
-- FAQs and policies
CREATE TABLE IF NOT EXISTS faqs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category ~ '^[a-z][a-z0-9-]{0,39}$'),
  question TEXT NOT NULL CHECK (length(btrim(question)) BETWEEN 1 AND 300),
  answer TEXT NOT NULL CHECK (length(btrim(answer)) BETWEEN 1 AND 3000),
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT faqs_approval_pair_chk CHECK ((approved_by IS NULL) = (approved_at IS NULL))
);

CREATE INDEX IF NOT EXISTS faqs_public_idx ON faqs (published, category, sort_order);

CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 160),
  body TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 6000),
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT policies_approval_pair_chk CHECK ((approved_by IS NULL) = (approved_at IS NULL)),
  -- A policy is hotel policy only once the hotel has approved its wording.
  CONSTRAINT policies_published_needs_approval CHECK (NOT published OR approved_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS policies_public_idx ON policies (published, sort_order);

-- ---------------------------------------------------------------------------------------------
-- Testimonials: genuine guest reviews only. 'demo' rows can exist for layout work but can never
-- be published; third-party reviews must carry their source link when published.
CREATE TABLE IF NOT EXISTS testimonials (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  author_display TEXT NOT NULL CHECK (length(btrim(author_display)) BETWEEN 1 AND 80),
  text TEXT NOT NULL CHECK (length(btrim(text)) BETWEEN 1 AND 2000),
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  source TEXT NOT NULL CHECK (source IN ('google', 'tripadvisor', 'direct', 'demo')),
  source_url TEXT CHECK (source_url IS NULL OR source_url ~ '^https://'),
  review_date DATE,
  consent BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT testimonials_demo_never_published CHECK (NOT (published AND source = 'demo')),
  CONSTRAINT testimonials_published_needs_consent CHECK (NOT published OR consent),
  CONSTRAINT testimonials_third_party_needs_link CHECK (
    NOT published OR source NOT IN ('google', 'tripadvisor') OR source_url IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS testimonials_public_idx ON testimonials (published, sort_order, review_date DESC);

-- ---------------------------------------------------------------------------------------------
-- Announcements (site banner), filtered by publication window at read time.
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  text TEXT NOT NULL CHECK (length(btrim(text)) BETWEEN 1 AND 280),
  link TEXT CHECK (link IS NULL OR link ~ '^(/|https://)'),
  publish_from TIMESTAMPTZ,
  publish_until TIMESTAMPTZ,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT announcements_window_chk CHECK (publish_from IS NULL OR publish_until IS NULL OR publish_until > publish_from)
);

CREATE INDEX IF NOT EXISTS announcements_public_idx ON announcements (published, publish_from, publish_until);

-- ---------------------------------------------------------------------------------------------
-- Per-path SEO overrides. Routes without a row keep their code-defined metadata.
CREATE TABLE IF NOT EXISTS seo_pages (
  path TEXT PRIMARY KEY CHECK (path ~ '^/[a-z0-9/_-]*$' AND length(path) <= 200),
  title TEXT CHECK (title IS NULL OR length(btrim(title)) BETWEEN 1 AND 120),
  description TEXT CHECK (description IS NULL OR length(btrim(description)) BETWEEN 1 AND 320),
  og_media_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
  noindex BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------------------------
-- Virtual tour. Angles are radians (Marzipano). A scene can be `ready` only with a panorama.
CREATE TABLE IF NOT EXISTS tour_scenes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label TEXT NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 120),
  eyebrow TEXT CHECK (eyebrow IS NULL OR length(eyebrow) <= 120),
  description TEXT CHECK (description IS NULL OR length(description) <= 2000),
  media_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
  panorama_path TEXT CHECK (panorama_path IS NULL OR panorama_path ~ '^/[A-Za-z0-9/_.-]+$'),
  panorama_width INTEGER CHECK (panorama_width BETWEEN 256 AND 32768),
  fallback_image_path TEXT CHECK (fallback_image_path IS NULL OR fallback_image_path ~ '^/[A-Za-z0-9/_.-]+$'),
  initial_yaw DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (initial_yaw BETWEEN -6.2832 AND 6.2832),
  initial_pitch DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (initial_pitch BETWEEN -1.5708 AND 1.5708),
  initial_fov DOUBLE PRECISION NOT NULL DEFAULT 1.25 CHECK (initial_fov BETWEEN 0.1 AND 3.2),
  ready BOOLEAN NOT NULL DEFAULT false,
  provenance TEXT NOT NULL CHECK (provenance IN ('tejjora', 'licensed', 'illustrative', 'placeholder')),
  source_note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tour_scenes_ready_needs_panorama CHECK (NOT ready OR panorama_path IS NOT NULL OR media_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS tour_scenes_ready_idx ON tour_scenes (ready, sort_order);

CREATE TABLE IF NOT EXISTS tour_hotspots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  scene_id TEXT NOT NULL REFERENCES tour_scenes(id) ON DELETE CASCADE,
  yaw DOUBLE PRECISION NOT NULL CHECK (yaw BETWEEN -6.2832 AND 6.2832),
  pitch DOUBLE PRECISION NOT NULL CHECK (pitch BETWEEN -1.5708 AND 1.5708),
  label TEXT NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 80),
  target_type TEXT NOT NULL CHECK (target_type IN ('scene', 'room', 'booking', 'url')),
  target_value TEXT NOT NULL CHECK (length(target_value) BETWEEN 1 AND 300),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tour_hotspots_target_chk CHECK (
    (target_type = 'url' AND target_value ~ '^(/|https://)')
    OR (target_type <> 'url' AND target_value ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
  )
);

CREATE INDEX IF NOT EXISTS tour_hotspots_scene_idx ON tour_hotspots (scene_id, sort_order);

-- ---------------------------------------------------------------------------------------------
-- AI knowledge. The concierge may use an entry only when public AND approved.
CREATE TABLE IF NOT EXISTS ai_knowledge (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  topic TEXT NOT NULL CHECK (topic ~ '^[a-z][a-z0-9-]{0,39}$'),
  question TEXT NOT NULL CHECK (length(btrim(question)) BETWEEN 1 AND 300),
  answer TEXT NOT NULL CHECK (length(btrim(answer)) BETWEEN 1 AND 3000),
  public BOOLEAN NOT NULL DEFAULT false,
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_knowledge_public_idx ON ai_knowledge (topic) WHERE public AND approved;

-- ---------------------------------------------------------------------------------------------
-- updated_at maintenance
CREATE OR REPLACE TRIGGER media_assets_touch BEFORE UPDATE ON media_assets FOR EACH ROW EXECUTE FUNCTION tejjora_touch_updated_at();
CREATE OR REPLACE TRIGGER rooms_touch BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION tejjora_touch_updated_at();
CREATE OR REPLACE TRIGGER property_facts_touch BEFORE UPDATE ON property_facts FOR EACH ROW EXECUTE FUNCTION tejjora_touch_updated_at();
CREATE OR REPLACE TRIGGER offers_touch BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION tejjora_touch_updated_at();
CREATE OR REPLACE TRIGGER faqs_touch BEFORE UPDATE ON faqs FOR EACH ROW EXECUTE FUNCTION tejjora_touch_updated_at();
CREATE OR REPLACE TRIGGER policies_touch BEFORE UPDATE ON policies FOR EACH ROW EXECUTE FUNCTION tejjora_touch_updated_at();
CREATE OR REPLACE TRIGGER testimonials_touch BEFORE UPDATE ON testimonials FOR EACH ROW EXECUTE FUNCTION tejjora_touch_updated_at();
CREATE OR REPLACE TRIGGER announcements_touch BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION tejjora_touch_updated_at();
CREATE OR REPLACE TRIGGER seo_pages_touch BEFORE UPDATE ON seo_pages FOR EACH ROW EXECUTE FUNCTION tejjora_touch_updated_at();
CREATE OR REPLACE TRIGGER tour_scenes_touch BEFORE UPDATE ON tour_scenes FOR EACH ROW EXECUTE FUNCTION tejjora_touch_updated_at();
CREATE OR REPLACE TRIGGER tour_hotspots_touch BEFORE UPDATE ON tour_hotspots FOR EACH ROW EXECUTE FUNCTION tejjora_touch_updated_at();
CREATE OR REPLACE TRIGGER ai_knowledge_touch BEFORE UPDATE ON ai_knowledge FOR EACH ROW EXECUTE FUNCTION tejjora_touch_updated_at();
