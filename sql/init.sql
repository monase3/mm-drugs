-- =====================================================================
-- MM Drugs (أدوية اليمن) — SQL Init Script
-- PostgreSQL + PostGIS
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'citizen'
                    CHECK (role IN ('citizen', 'pharmacy_owner', 'pharmacy_staff', 'admin', 'supplier')),
  city            TEXT,
  pharmacy_id     UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- PHARMACIES (PostGIS enabled)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pharmacies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  license_number  TEXT NOT NULL UNIQUE,
  city            TEXT NOT NULL,
  address         TEXT,
  phone           TEXT,
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,
  geom            GEOGRAPHY(Point, 4326) NOT NULL,
  api_key         TEXT NOT NULL UNIQUE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pharmacies_geom_gix ON pharmacies USING GIST (geom);

CREATE OR REPLACE FUNCTION pharmacies_sync_geom() RETURNS TRIGGER AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pharmacies_sync_geom ON pharmacies;
CREATE TRIGGER trg_pharmacies_sync_geom
  BEFORE INSERT OR UPDATE OF latitude, longitude ON pharmacies
  FOR EACH ROW EXECUTE FUNCTION pharmacies_sync_geom();

-- ---------------------------------------------------------------------
-- DRUGS (master catalogue)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drugs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  generic_name    TEXT,
  manufacturer    TEXT,
  category        TEXT,
  unit            TEXT NOT NULL DEFAULT 'علبة',
  barcode         TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS drugs_name_trgm_idx ON drugs USING GIN (name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- SUPPLIERS (legacy, linked to pharmacy)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id     UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT,
  address         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- INVENTORY (per pharmacy stock)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id     UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  drug_id         UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  quantity        INTEGER NOT NULL DEFAULT 0,
  cost_price      NUMERIC(12,2) NOT NULL DEFAULT '0',
  retail_price    NUMERIC(12,2) NOT NULL DEFAULT '0',
  expiry_date     DATE,
  batch_number    TEXT NOT NULL DEFAULT 'GENERAL',
  min_stock_level INTEGER NOT NULL DEFAULT 10,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pharmacy_id, drug_id, batch_number)
);

CREATE INDEX IF NOT EXISTS inventory_drug_id_idx ON inventory (drug_id);
CREATE INDEX IF NOT EXISTS inventory_pharmacy_id_idx ON inventory (pharmacy_id);

-- ---------------------------------------------------------------------
-- INVENTORY MOVEMENTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id     UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  drug_id         UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  batch_number    TEXT NOT NULL DEFAULT 'GENERAL',
  movement_type   TEXT NOT NULL CHECK (movement_type IN ('purchase','sale','waste','adjustment','return','transfer')),
  quantity_change INTEGER NOT NULL,
  unit_cost       NUMERIC(12,2),
  reference_type  TEXT,
  reference_id    UUID,
  reason          TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- PURCHASE INVOICES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id     UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  invoice_number  TEXT NOT NULL,
  total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
  invoice_date    DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_invoice_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  drug_id         UUID NOT NULL REFERENCES drugs(id) ON DELETE RESTRICT,
  quantity        INTEGER NOT NULL DEFAULT 1,
  unit_cost       NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- PURCHASE ORDERS (marketplace / supplier orders)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id     UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  supplier_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled','expired')),
  total_amount    NUMERIC(14,2) NOT NULL DEFAULT '0',
  notes           TEXT,
  confirmed_at    TIMESTAMPTZ,
  shipped_at      TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  drug_id         UUID NOT NULL REFERENCES drugs(id) ON DELETE RESTRICT,
  quantity        INTEGER NOT NULL DEFAULT 1,
  unit_price      NUMERIC(12,2) NOT NULL
);

-- ---------------------------------------------------------------------
-- SUPPLIER PRODUCTS (marketplace catalog)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplier_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drug_id         UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  price           NUMERIC(12,2) NOT NULL,
  min_quantity    INTEGER NOT NULL DEFAULT 1,
  available       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, drug_id)
);

-- ---------------------------------------------------------------------
-- RATINGS (pharmacy owner → supplier)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ratings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  from_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score           INTEGER NOT NULL,
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, from_user_id)
);

-- ---------------------------------------------------------------------
-- PHARMACY REQUESTS (citizen → pharmacy)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pharmacy_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pharmacy_id     UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  drug_name       TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','rejected','fulfilled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- PHARMACY REVIEWS (citizen → pharmacy)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pharmacy_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pharmacy_id     UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  request_id      UUID NOT NULL REFERENCES pharmacy_requests(id) ON DELETE CASCADE,
  score           INTEGER NOT NULL,
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  reference_id    UUID,
  reference_type  TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- ADMIN AUDIT LOG
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       TEXT,
  details         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
