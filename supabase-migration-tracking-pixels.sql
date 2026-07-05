-- ============================================================
-- Migration: tracking_pixels table
-- Dynamic Meta (and future provider) pixel management.
-- Run this in your Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS tracking_pixels (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider    TEXT        NOT NULL DEFAULT 'meta',
  label       TEXT        NOT NULL,
  pixel_id    TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_tracking_pixels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tracking_pixels_updated_at ON tracking_pixels;
CREATE TRIGGER trg_tracking_pixels_updated_at
  BEFORE UPDATE ON tracking_pixels
  FOR EACH ROW EXECUTE FUNCTION update_tracking_pixels_updated_at();

-- Default Meta Pixels (idempotent — skipped if pixel_id already exists)
INSERT INTO tracking_pixels (provider, label, pixel_id, is_active)
SELECT 'meta', 'Main Pixel', '4569111183412330', true
WHERE NOT EXISTS (
  SELECT 1 FROM tracking_pixels WHERE pixel_id = '4569111183412330'
);

INSERT INTO tracking_pixels (provider, label, pixel_id, is_active)
SELECT 'meta', 'Second Pixel', '1162700877684124', true
WHERE NOT EXISTS (
  SELECT 1 FROM tracking_pixels WHERE pixel_id = '1162700877684124'
);
