-- ============================================================
-- V10: Extend promotions with scope/city/roomType/isStackable
--      + seed 10 diverse coupons covering all scope types
-- ============================================================

-- 1. Add new columns to promotions table
ALTER TABLE promotions
    ADD COLUMN IF NOT EXISTS scope          VARCHAR(20) DEFAULT 'UNIVERSAL',  -- UNIVERSAL | HOTEL | CITY | ROOM_TYPE
    ADD COLUMN IF NOT EXISTS city           VARCHAR(100),                      -- for CITY scope
    ADD COLUMN IF NOT EXISTS room_type      VARCHAR(100),                      -- for ROOM_TYPE scope (e.g. 'Deluxe,Suite')
    ADD COLUMN IF NOT EXISTS is_stackable   BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMP DEFAULT NOW();

-- 2. Back-fill existing rows to UNIVERSAL scope
UPDATE promotions SET scope = 'UNIVERSAL' WHERE scope IS NULL;

-- ============================================================
-- 3. Seed 10 diverse coupons covering all scope types
--    IDs in range 00000000-0000-0000-0001-0000000000xx
--    Code IDs in range 00000000-0000-0000-0002-0000000000xx
--    (V9 used 01-08, V10 uses 09-18)
-- ============================================================

-- ── UNIVERSAL coupons ──────────────────────────────────────

-- WELCOME200: ₹200 off for all new users, all methods, min ₹1,000
INSERT INTO promotions (id, promotion_name, promotion_type, discount_type, discount_value,
    min_booking_amount, valid_from, valid_until,
    total_usage_limit, per_user_limit, current_usage, is_active,
    applicable_payment_methods, scope, is_stackable)
VALUES (
    '00000000-0000-0000-0001-000000000009',
    'WELCOME200 – ₹200 Welcome Discount', 'COUPON', 'FLAT', 200,
    1000, NOW(), NOW() + INTERVAL '365 days',
    50000, 1, 0, true, 'all', 'UNIVERSAL', false
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000009',
        '00000000-0000-0000-0001-000000000009', 'WELCOME200', false, false)
ON CONFLICT (code) DO NOTHING;

-- SUMMER15: 15% off, max ₹2,500, all methods, min ₹5,000, universal
INSERT INTO promotions (id, promotion_name, promotion_type, discount_type, discount_value,
    max_discount_amount, min_booking_amount, valid_from, valid_until,
    total_usage_limit, per_user_limit, current_usage, is_active,
    applicable_payment_methods, scope, is_stackable)
VALUES (
    '00000000-0000-0000-0001-000000000010',
    'SUMMER15 – 15% Summer Sale', 'COUPON', 'PERCENT', 15,
    2500, 5000, NOW(), NOW() + INTERVAL '180 days',
    20000, 2, 0, true, 'all', 'UNIVERSAL', false
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000010',
        '00000000-0000-0000-0001-000000000010', 'SUMMER15', false, false)
ON CONFLICT (code) DO NOTHING;

-- ── CITY-specific coupons ──────────────────────────────────

-- MUMBAI500: ₹500 off for Mumbai bookings, all methods, min ₹3,000
INSERT INTO promotions (id, promotion_name, promotion_type, discount_type, discount_value,
    min_booking_amount, valid_from, valid_until,
    total_usage_limit, per_user_limit, current_usage, is_active,
    applicable_payment_methods, scope, city, is_stackable)
VALUES (
    '00000000-0000-0000-0001-000000000011',
    'MUMBAI500 – ₹500 Off in Mumbai', 'COUPON', 'FLAT', 500,
    3000, NOW(), NOW() + INTERVAL '365 days',
    10000, 2, 0, true, 'all', 'CITY', 'Mumbai', false
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000011',
        '00000000-0000-0000-0001-000000000011', 'MUMBAI500', false, false)
ON CONFLICT (code) DO NOTHING;

-- DELHI10: 10% off for Delhi bookings, max ₹1,200, all methods, min ₹2,500
INSERT INTO promotions (id, promotion_name, promotion_type, discount_type, discount_value,
    max_discount_amount, min_booking_amount, valid_from, valid_until,
    total_usage_limit, per_user_limit, current_usage, is_active,
    applicable_payment_methods, scope, city, is_stackable)
VALUES (
    '00000000-0000-0000-0001-000000000012',
    'DELHI10 – 10% Off in Delhi', 'COUPON', 'PERCENT', 10,
    1200, 2500, NOW(), NOW() + INTERVAL '365 days',
    10000, 2, 0, true, 'all', 'CITY', 'Delhi', false
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000012',
        '00000000-0000-0000-0001-000000000012', 'DELHI10', false, false)
ON CONFLICT (code) DO NOTHING;

-- GOA300: ₹300 off for Goa bookings, UPI only
INSERT INTO promotions (id, promotion_name, promotion_type, discount_type, discount_value,
    valid_from, valid_until,
    total_usage_limit, per_user_limit, current_usage, is_active,
    applicable_payment_methods, scope, city, is_stackable)
VALUES (
    '00000000-0000-0000-0001-000000000013',
    'GOA300 – ₹300 Off in Goa via UPI', 'COUPON', 'FLAT', 300,
    NOW(), NOW() + INTERVAL '365 days',
    10000, 2, 0, true, 'upi', 'CITY', 'Goa', false
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000013',
        '00000000-0000-0000-0001-000000000013', 'GOA300', false, false)
ON CONFLICT (code) DO NOTHING;

-- ── ROOM_TYPE-specific coupons ─────────────────────────────

-- SUITE20: 20% off for Suite rooms, max ₹3,000, all methods, min ₹8,000
INSERT INTO promotions (id, promotion_name, promotion_type, discount_type, discount_value,
    max_discount_amount, min_booking_amount, valid_from, valid_until,
    total_usage_limit, per_user_limit, current_usage, is_active,
    applicable_payment_methods, scope, room_type, is_stackable)
VALUES (
    '00000000-0000-0000-0001-000000000014',
    'SUITE20 – 20% Off on Suite Rooms', 'COUPON', 'PERCENT', 20,
    3000, 8000, NOW(), NOW() + INTERVAL '365 days',
    5000, 1, 0, true, 'all', 'ROOM_TYPE', 'Suite', false
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000014',
        '00000000-0000-0000-0001-000000000014', 'SUITE20', false, false)
ON CONFLICT (code) DO NOTHING;

-- DELUXE400: ₹400 off for Deluxe rooms, all methods, min ₹4,000
INSERT INTO promotions (id, promotion_name, promotion_type, discount_type, discount_value,
    min_booking_amount, valid_from, valid_until,
    total_usage_limit, per_user_limit, current_usage, is_active,
    applicable_payment_methods, scope, room_type, is_stackable)
VALUES (
    '00000000-0000-0000-0001-000000000015',
    'DELUXE400 – ₹400 Off on Deluxe Rooms', 'COUPON', 'FLAT', 400,
    4000, NOW(), NOW() + INTERVAL '365 days',
    10000, 2, 0, true, 'all', 'ROOM_TYPE', 'Deluxe', false
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000015',
        '00000000-0000-0000-0001-000000000015', 'DELUXE400', false, false)
ON CONFLICT (code) DO NOTHING;

-- STANDARD5: 5% off for Standard rooms, max ₹500, all methods
INSERT INTO promotions (id, promotion_name, promotion_type, discount_type, discount_value,
    max_discount_amount, valid_from, valid_until,
    total_usage_limit, per_user_limit, current_usage, is_active,
    applicable_payment_methods, scope, room_type, is_stackable)
VALUES (
    '00000000-0000-0000-0001-000000000016',
    'STANDARD5 – 5% Off on Standard Rooms', 'COUPON', 'PERCENT', 5,
    500, NOW(), NOW() + INTERVAL '365 days',
    20000, 3, 0, true, 'all', 'ROOM_TYPE', 'Standard', false
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000016',
        '00000000-0000-0000-0001-000000000016', 'STANDARD5', false, false)
ON CONFLICT (code) DO NOTHING;

-- ── HOTEL-specific coupons ─────────────────────────────────
-- (hotel_id is NULL here — hotel-specific coupons are seeded by hotel admins;
--  these two demonstrate the HOTEL scope with the first seeded hotel)

-- HOTEL1DEAL: ₹600 off for hotel 10000000-0000-0000-0000-000000000001, all methods, min ₹4,000
INSERT INTO promotions (id, hotel_id, promotion_name, promotion_type, discount_type, discount_value,
    min_booking_amount, valid_from, valid_until,
    total_usage_limit, per_user_limit, current_usage, is_active,
    applicable_payment_methods, scope, is_stackable)
VALUES (
    '00000000-0000-0000-0001-000000000017',
    '10000000-0000-0000-0000-000000000001',
    'HOTEL1DEAL – ₹600 Off at Grand Hyatt', 'COUPON', 'FLAT', 600,
    4000, NOW(), NOW() + INTERVAL '365 days',
    5000, 1, 0, true, 'all', 'HOTEL', false
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000017',
        '00000000-0000-0000-0001-000000000017', 'HOTEL1DEAL', false, false)
ON CONFLICT (code) DO NOTHING;

-- HOTEL3VIP: 12% off for hotel 10000000-0000-0000-0000-000000000003, card only, min ₹6,000
INSERT INTO promotions (id, hotel_id, promotion_name, promotion_type, discount_type, discount_value,
    max_discount_amount, min_booking_amount, valid_from, valid_until,
    total_usage_limit, per_user_limit, current_usage, is_active,
    applicable_payment_methods, scope, is_stackable)
VALUES (
    '00000000-0000-0000-0001-000000000018',
    '10000000-0000-0000-0000-000000000003',
    'HOTEL3VIP – 12% VIP Discount', 'COUPON', 'PERCENT', 12,
    1800, 6000, NOW(), NOW() + INTERVAL '365 days',
    3000, 1, 0, true, 'card', 'HOTEL', false
) ON CONFLICT DO NOTHING;

INSERT INTO coupon_codes (id, promotion_id, code, is_single_use, is_used)
VALUES ('00000000-0000-0000-0002-000000000018',
        '00000000-0000-0000-0001-000000000018', 'HOTEL3VIP', false, false)
ON CONFLICT (code) DO NOTHING;
