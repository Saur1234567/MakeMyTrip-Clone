-- V8: Extend room inventory to cover the next 730 days for all active room types.
-- This fixes the "No rooms available" error caused by inventory rows not existing
-- for dates beyond the original seed window (which only covered 365 days from
-- the time V2 was first applied).
--
-- Logic:
--   • For each active, bookable room type, insert one inventory row per day
--     from TODAY through TODAY + 730 days.
--   • ON CONFLICT DO NOTHING ensures existing rows (with real booked/blocked
--     counts) are never overwritten.
--   • available_rooms defaults to a sensible capacity based on room_category.

INSERT INTO room_inventory (
    id,
    room_type_id,
    date,
    total_rooms,
    available_rooms,
    booked_rooms,
    base_price,
    admin_override_price,
    is_blocked,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid()                          AS id,
    rt.id                                      AS room_type_id,
    d.date::date                               AS date,
    CASE rt.room_category
        WHEN 'VILLA'   THEN 5
        WHEN 'SUITE'   THEN 8
        WHEN 'DELUXE'  THEN 15
        ELSE 20
    END                                        AS total_rooms,
    CASE rt.room_category
        WHEN 'VILLA'   THEN 5
        WHEN 'SUITE'   THEN 8
        WHEN 'DELUXE'  THEN 15
        ELSE 20
    END                                        AS available_rooms,
    0                                          AS booked_rooms,
    rt.base_price                              AS base_price,
    NULL                                       AS admin_override_price,
    false                                      AS is_blocked,
    NOW()                                      AS created_at,
    NOW()                                      AS updated_at
FROM room_types rt
CROSS JOIN generate_series(
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '730 days',
    INTERVAL '1 day'
) AS d(date)
WHERE rt.is_active = true
  AND rt.is_available_for_booking = true
ON CONFLICT (room_type_id, date) DO NOTHING;
