-- V5: Fix schema gaps between entities and DB tables
-- ============================================================

-- 1. coupon_codes: add booking_id and created_at
ALTER TABLE coupon_codes
    ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- 2. promotions: add banner_image_url, booking_window_start, booking_window_end, updated_at
ALTER TABLE promotions
    ADD COLUMN IF NOT EXISTS banner_image_url TEXT,
    ADD COLUMN IF NOT EXISTS booking_window_start DATE,
    ADD COLUMN IF NOT EXISTS booking_window_end DATE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
