-- ============================================================
-- Migration: WhatsApp admin notification status columns
-- Run this against your Supabase project (SQL Editor or CLI).
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS whatsapp_notify_status  TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_notify_error   TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_notify_sent_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN orders.whatsapp_notify_status  IS 'sent | failed | disabled | skipped';
COMMENT ON COLUMN orders.whatsapp_notify_error   IS 'Error message when notification failed';
COMMENT ON COLUMN orders.whatsapp_notify_sent_at IS 'Timestamp when notification was successfully sent';
