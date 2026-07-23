-- =====================================================================
-- MM Drugs (أدوية اليمن) — SQL Init Script
-- PostgreSQL + PostGIS
--
-- Run this once against a fresh database to provision the full schema
-- used by the MM Drugs platform (Web dashboards, POS sync API, and the
-- Flutter citizens app). This file is idempotent and safe to re-run.
--
-- Note: the Next.js application manages this same schema through
-- Drizzle ORM (see src/db/schema.ts). This script is provided as the
-- canonical, framework-agnostic reference for DevOps / DBAs and mirrors
-- exactly what `npx drizzle-kit push` provisions, plus PostGIS specific
-- indexes and triggers that keep `geom` in sync with lat/lng.
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
                    CHECK (role IN ('citizen', 'pharmacy_owner', 'pharmacy_staff', 'admin')),
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

-- Spatial index — critical for ST_DWithin performance at scale.
CREATE INDEX IF NOT EXISTS pharmacies_geom_gix ON pharmacies USING GIST (geom);

-- Keep geom automatically in sync whenever lat/lng change.
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

CREATE INDEX IF NOT EXISTS drugs_name_trgm_idx ON drugs USING GIN (name gin_trgm_ops);
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------
-- SUPPLIERS
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
-- INVENTORY (per pharmacy stock, synced from local POS systems)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id     UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  drug_id         UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  quantity        INTEGER NOT NULL DEFAULT 0,
  price           NUMERIC(12,2) NOT NULL DEFAULT 0,
  expiry_date     DATE,
  batch_number    TEXT NOT NULL DEFAULT 'GENERAL',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pharmacy_id, drug_id, batch_number)
);

CREATE INDEX IF NOT EXISTS inventory_drug_id_idx ON inventory (drug_id);
CREATE INDEX IF NOT EXISTS inventory_pharmacy_id_idx ON inventory (pharmacy_id);

-- ---------------------------------------------------------------------
-- PURCHASE INVOICES + ITEMS
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
-- Example: nearby-drug search query used by /api/drugs/nearby
-- ---------------------------------------------------------------------
-- SELECT p.id, p.name, p.city, p.phone, p.latitude, p.longitude,
--        i.quantity, i.price,
--        ST_Distance(p.geom, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) AS distance_m
-- FROM pharmacies p
-- JOIN inventory i ON i.pharmacy_id = p.id
-- JOIN drugs d ON d.id = i.drug_id
-- WHERE p.is_active = TRUE
--   AND i.quantity > 0
--   AND d.name ILIKE '%' || :drug_name || '%'
--   AND ST_DWithin(p.geom, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius_m)
-- ORDER BY distance_m ASC
-- LIMIT 50;
