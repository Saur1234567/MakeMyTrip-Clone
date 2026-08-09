-- ============================================================
-- V9: Extend promotions/coupon_codes for server-side validation
--     + seed the 8 coupons shown in the payment UI
-- ============================================================

-- 1. Add extra columns to promotions that are needed for payment-method
--    specific validation (bank, wallet, UPI app) and per-user usage tracking.
ALTER TABLE promotions
    ADD COLUMN IF NOT EXISTS applicable_payment_methods  TEXT,   -- CSV: 'all' | 'card,netbanking' | 'upi' | 'wallet'
    ADD COLUMN IF NOT EXISTS applicable_banks            TEXT,   -- CSV: 'HDFC,SBI'  (null = any)
    ADD COLUMN IF NOT EXISTS applicable_wallets          TEXT,   -- CSV: 'paytm'     (null = any)
    ADD COLUMN IF NOT EXISTS applicable_upi_apps         TEXT,   -- CSV: 'gpay'      (null = any)
    ADD COLUMN IF NOT EXISTS banner_image_url            TEXT,   -- already in entity, add if missing
    ADD COLUMN IF NOT EXISTS booking_window_start        DATE,
    ADD COLUMN IF NOT EXISTS booking_window_end          DATE;

-- 2. Add per-user usage tracking table
CREATE TABLE IF NOT EXISTS coupon_user_usage (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id  UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    booking_id    UUID REFERENCES bookings(id),
    used_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (promotion_id, user_id, booking_id)
);
CREATE INDEX IF NOT EXISTS idx_coupon_user_usage ON coupon_user_usage(promotion_id, user_id);

-- 3. Add booking_id column to coupon_codes if not present
ALTER TABLE coupon_codes
    ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id),
    ADD COLUMN IF NOT EXISTS is_single_use BOOLEAN DEFAULT false;

-- ============================================================
-- 4. Seed the 8 coupons that match the frontend UI
--    All valid for 1 year from now.
-- ============================================================

-- FLAT500 — ₹500 off, all methods, min ₹2,000
INSERT INTO promotions (id, promotion_name, promotion_type, discount_type, discount_value,
    min_booking_amount, valid_from, valid_until, total_usage_limit, per_user_limit,
    current_usage, is_active, applicable_payment_methods)
VALUES (
    '00000000-0000-0000-0001-000000000001',
    'FLAT500 – Flat ₹500 Off', 'COUPON', 'FLAT', 500,
    2000, NOW(), NOW() + INTERVAL '365 days',
    10000, 1, 0, true, 'all'
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000001',
        '00000000-0000-0000-0001-000000000001', 'FLAT500', false, false)
ON CONFLICT (code) DO NOTHING;

-- TRAVEL10 — 10% off, max ₹1,500, all methods, min ₹3,000
INSERT INTO promotions (id, promotion_name, promotion_type, discount_type, discount_value,
    max_discount_amount, min_booking_amount, valid_from, valid_until,
    total_usage_limit, per_user_limit, current_usage, is_active, applicable_payment_methods)
VALUES (
    '00000000-0000-0000-0001-000000000002',
    'TRAVEL10 – 10% Off Travel Deal', 'COUPON', 'PERCENT', 10,
    1500, 3000, NOW(), NOW() + INTERVAL '365 days',
    10000, 1, 0, true, 'all'
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000002',
        '00000000-0000-0000-0001-000000000002', 'TRAVEL10', false, false)
ON CONFLICT (code) DO NOTHING;

-- HDFC15 — 15% off, max ₹2,000, card/netbanking, HDFC bank
INSERT INTO promotions (id, promotion_name, promotion_type, discount_type, discount_value,
    max_discount_amount, valid_from, valid_until,
    total_usage_limit, per_user_limit, current_usage, is_active,
    applicable_payment_methods, applicable_banks)
VALUES (
    '00000000-0000-0000-0001-000000000003',
    'HDFC15 – 15% Off with HDFC', 'COUPON', 'PERCENT', 15,
    2000, NOW(), NOW() + INTERVAL '365 days',
    10000, 1, 0, true, 'card,netbanking', 'HDFC'
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000003',
        '00000000-0000-0000-0001-000000000003', 'HDFC15', false, false)
ON CONFLICT (code) DO NOTHING;

-- SBICARD — ₹800 off, card/netbanking, SBI bank, min ₹5,000
INSERT INTO promotions (id, promotion_name, promotion_type, discount_type, discount_value,
    min_booking_amount, valid_from, valid_until,
    total_usage_limit, per_user_limit, current_usage, is_active,
    applicable_payment_methods, applicable_banks)
VALUES (
    '00000000-0000-0000-0001-000000000004',
    'SBICARD – ₹800 Off with SBI', 'COUPON', 'FLAT', 800,
    5000, NOW(), NOW() + INTERVAL '365 days',
    10000, 1, 0, true, 'card,netbanking', 'SBI'
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000004',
        '00000000-0000-0000-0001-000000000004', 'SBICARD', false, false)
ON CONFLICT (code) DO NOTHING;

-- GPAY200 — ₹200 off, UPI, Google Pay only
INSERT INTO promotions (id, promotion_name, promotion_type, discount_type, discount_value,
    valid_from, valid_until,
    total_usage_limit, per_user_limit, current_usage, is_active,
    applicable_payment_methods, applicable_upi_apps)
VALUES (
    '00000000-0000-0000-0001-000000000005',
    'GPAY200 – ₹200 Off via Google Pay', 'COUPON', 'FLAT', 200,
    NOW(), NOW() + INTERVAL '365 days',
    10000, 1, 0, true, 'upi', 'gpay'
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000005',
        '00000000-0000-0000-0001-000000000005', 'GPAY200', false, false)
ON CONFLICT (code) DO NOTHING;

-- UPI5 — 5% off, max ₹750, any UPI
INSERT INTO promotions (id, promotion_name, promotion_type, discount_type, discount_value,
    max_discount_amount, valid_from, valid_until,
    total_usage_limit, per_user_limit, current_usage, is_active,
    applicable_payment_methods)
VALUES (
    '00000000-0000-0000-0001-000000000006',
    'UPI5 – 5% Off on UPI', 'COUPON', 'PERCENT', 5,
    750, NOW(), NOW() + INTERVAL '365 days',
    10000, 1, 0, true, 'upi'
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000006',
        '00000000-0000-0000-0001-000000000006', 'UPI5', false, false)
ON CONFLICT (code) DO NOTHING;

-- PAYTM300 — ₹300 off, wallet, Paytm only
INSERT INTO promotions (id, promotion_name, promotion_type, discount_type, discount_value,
    valid_from, valid_until,
    total_usage_limit, per_user_limit, current_usage, is_active,
    applicable_payment_methods, applicable_wallets)
VALUES (
    '00000000-0000-0000-0001-000000000007',
    'PAYTM300 – ₹300 Off via Paytm Wallet', 'COUPON', 'FLAT', 300,
    NOW(), NOW() + INTERVAL '365 days',
    10000, 1, 0, true, 'wallet', 'paytm'
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000007',
        '00000000-0000-0000-0001-000000000007', 'PAYTM300', false, false)
ON CONFLICT (code) DO NOTHING;

-- WALLET8 — 8% off, max ₹1,000, any wallet
INSERT INTO promotions (id, promotion_name, promotion_type, discount_type, discount_value,
    max_discount_amount, valid_from, valid_until,
    total_usage_limit, per_user_limit, current_usage, is_active,
    applicable_payment_methods)
VALUES (
    '00000000-0000-0000-0001-000000000008',
    'WALLET8 – 8% Off on Wallets', 'COUPON', 'PERCENT', 8,
    1000, NOW(), NOW() + INTERVAL '365 days',
    10000, 1, 0, true, 'wallet'
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000008',
        '00000000-0000-0000-0001-000000000008', 'WALLET8', false, false)
ON CONFLICT (code) DO NOTHING;
