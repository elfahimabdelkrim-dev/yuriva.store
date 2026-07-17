-- ============================================================
-- YURIVA — Tracking idempotency + Google Sheets sync migration
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to run multiple times (IF NOT EXISTS everywhere).
-- ============================================================

-- Meta Purchase idempotency (server-side CAPI + browser pixel)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS meta_purchase_sent     boolean     DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS meta_purchase_sent_at  timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS meta_purchase_error    text;

-- Browser pixel status — set to 'fired' by /api/orders/pixel-status (atomic claim)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pixel_status           text;

-- CAPI tracking
-- capi_status state machine: pending → processing → sent | failed
ALTER TABLE orders ADD COLUMN IF NOT EXISTS purchase_event_id      text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS capi_status            text DEFAULT 'pending';

-- Google Sheets sync tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS google_sheet_synced_at   timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS google_sheet_retry_count integer DEFAULT 0;

-- Attribution fields (from earlier attribution patch — included here so one
-- migration covers everything; skipped automatically if already added)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fbclid        text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fbp           text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fbc           text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS landing_page  text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS referrer      text;

-- Backfill: existing orders have already fired their events —
-- mark them sent so no old order can ever re-send a Purchase.
UPDATE orders
SET meta_purchase_sent = true,
    capi_status        = COALESCE(NULLIF(capi_status, 'pending'), 'sent'),
    pixel_status       = COALESCE(pixel_status, 'fired')
WHERE meta_purchase_sent IS DISTINCT FROM true;

-- ============================================================
-- Reconciliation system columns (integration status per order)
-- ============================================================

-- Google Sheets integration state machine: pending -> processing -> synced | failed
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sheet_status    text DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sheet_error     text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sheet_attempts  integer DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sheet_synced_at timestamptz;

-- CAPI attempt counter (capi_status state machine already added above)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS capi_attempts   integer DEFAULT 0;

-- Backfill sheet_status from the legacy google_sheet_synced flag
UPDATE orders
SET sheet_status = CASE WHEN google_sheet_synced = true THEN 'synced' ELSE COALESCE(sheet_status, 'pending') END
WHERE sheet_status IS NULL OR sheet_status = 'pending';
