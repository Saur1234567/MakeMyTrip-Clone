-- =============================================================================
-- V2__seed.sql — Seed data for development/demo
-- =============================================================================

-- ── Schema patches (columns missing from V1) ──────────────────────────────────
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_type VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(100);

-- ── Users ─────────────────────────────────────────────────────────────────────
-- Passwords are BCrypt of 'Password@123'
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role,
                   loyalty_tier, loyalty_points, is_email_verified, is_active, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@makemycrip.com',
   '$2a$12$CXFTDtOcO9ooZ/rbdmHYmOJWrLKS2Bz3pYIAHIzaTnknA09UvQ6ii',
   'Admin', 'User', '+919999999901', 'ADMIN', 'PLATINUM', 99999, true, true, NOW()),

  ('00000000-0000-0000-0000-000000000002', 'manager@makemycrip.com',
   '$2a$12$CXFTDtOcO9ooZ/rbdmHYmOJWrLKS2Bz3pYIAHIzaTnknA09UvQ6ii',
   'Hotel', 'Manager', '+919999999902', 'HOTEL_MANAGER', 'GOLD', 5000, true, true, NOW()),

  ('00000000-0000-0000-0000-000000000003', 'user@makemycrip.com',
   '$2a$12$CXFTDtOcO9ooZ/rbdmHYmOJWrLKS2Bz3pYIAHIzaTnknA09UvQ6ii',
   'Test', 'User', '+919876543210', 'USER', 'SILVER', 1500, true, true, NOW()),

  ('00000000-0000-0000-0000-000000000004', 'john.doe@example.com',
   '$2a$12$CXFTDtOcO9ooZ/rbdmHYmOJWrLKS2Bz3pYIAHIzaTnknA09UvQ6ii',
   'John', 'Doe', '+919876543211', 'USER', 'BRONZE', 250, true, true, NOW()),

  ('00000000-0000-0000-0000-000000000005', 'priya.sharma@example.com',
   '$2a$12$CXFTDtOcO9ooZ/rbdmHYmOJWrLKS2Bz3pYIAHIzaTnknA09UvQ6ii',
   'Priya', 'Sharma', '+919876543212', 'USER', 'GOLD', 8200, true, true, NOW());

-- ── Hotels ────────────────────────────────────────────────────────────────────

-- Mumbai Hotels
INSERT INTO hotels (id, name, slug, city, neighborhood, address_line1, star_rating, hotel_type,
                    description, latitude, longitude, checkin_time, checkout_time,
                    primary_phone, email, status, is_featured, created_at)
VALUES
  ('10000000-0000-0000-0000-000000000001',
   'The Grand Taj Palace', 'the-grand-taj-palace-mumbai', 'Mumbai', 'Colaba',
   '18 Apollo Bunder, Colaba, Mumbai, Maharashtra 400001',
   5, 'RESORT',
   'An iconic luxury hotel overlooking the Gateway of India.',
   18.9217, 72.8330, '14:00', '11:00', '+912266651234', 'reservations@grandtajpalace.com',
   'ACTIVE', true, NOW()),

  ('10000000-0000-0000-0000-000000000002',
   'Trident Nariman Point', 'trident-nariman-point-mumbai', 'Mumbai', 'Nariman Point',
   'Nariman Point, Mumbai, Maharashtra 400021',
   5, 'BUSINESS',
   'Premium business hotel in the heart of Mumbai financial district.',
   18.9270, 72.8235, '15:00', '12:00', '+912266391234', 'reservations@tridentmumbai.com',
   'ACTIVE', true, NOW()),

  ('10000000-0000-0000-0000-000000000003',
   'The Lalit Mumbai', 'the-lalit-mumbai', 'Mumbai', 'Andheri East',
   'Sahar Airport Road, Andheri East, Mumbai 400059',
   5, 'BUSINESS',
   'Contemporary luxury near the international airport with rooftop pool.',
   19.0969, 72.8519, '14:00', '12:00', '+912244446000', 'mumbai@thelalit.com',
   'ACTIVE', false, NOW()),

  ('10000000-0000-0000-0000-000000000004',
   'Ibis Mumbai Vikhroli', 'ibis-mumbai-vikhroli', 'Mumbai', 'Vikhroli',
   'Eastern Express Highway, Vikhroli, Mumbai 400079',
   3, 'BUDGET',
   'Smart budget hotel with clean comfortable rooms and free WiFi.',
   19.1125, 72.9219, '14:00', '11:00', '+912261396666', 'h6396@accor.com',
   'ACTIVE', false, NOW()),

  ('10000000-0000-0000-0000-000000000005',
   'FabHotel Prime Lotus', 'fabhotel-prime-lotus-mumbai', 'Mumbai', 'Andheri West',
   'Lokhandwala Complex, Andheri West, Mumbai 400053',
   2, 'BUDGET',
   'Clean and affordable accommodation in the vibrant Andheri area.',
   19.1368, 72.8275, '13:00', '11:00', '+919833301234', 'lotus@fabhotel.com',
   'ACTIVE', false, NOW());

-- Goa Hotels
INSERT INTO hotels (id, name, slug, city, neighborhood, address_line1, star_rating, hotel_type,
                    description, latitude, longitude, checkin_time, checkout_time,
                    primary_phone, email, status, is_featured, created_at)
VALUES
  ('20000000-0000-0000-0000-000000000001',
   'Taj Exotica Resort & Spa', 'taj-exotica-resort-spa-goa', 'Goa', 'Benaulim',
   'Calvaddo, Benaulim, Salcete, South Goa 403716',
   5, 'RESORT',
   'A breathtaking beachfront resort in South Goa with private pool villas.',
   15.2587, 73.9465, '15:00', '12:00', '+918322771234', 'exotica.goa@tajhotels.com',
   'ACTIVE', true, NOW()),

  ('20000000-0000-0000-0000-000000000002',
   'Park Hyatt Goa Resort', 'park-hyatt-goa-resort', 'Goa', 'Arossim',
   'Arossim Beach, Cansaulim, South Goa 403712',
   5, 'RESORT',
   'Portuguese-inspired luxury resort on a secluded beach.',
   15.2319, 73.9397, '15:00', '12:00', '+918326461234', 'goa.park@hyatt.com',
   'ACTIVE', true, NOW()),

  ('20000000-0000-0000-0000-000000000003',
   'Leoney Resort Goa', 'leoney-resort-goa', 'Goa', 'Calangute',
   'Calangute Beach Road, North Goa 403516',
   4, 'RESORT',
   'Charming mid-range beach resort in the heart of Calangute.',
   15.5442, 73.7561, '14:00', '11:00', '+918322281234', 'info@leoneyresort.com',
   'ACTIVE', false, NOW()),

  ('20000000-0000-0000-0000-000000000004',
   'Old Quarter Hostel', 'old-quarter-hostel-goa', 'Goa', 'Panaji',
   'Fontainhas, Old Goa, Panaji 403001',
   2, 'HOSTEL',
   'Boutique hostel in the historic Latin Quarter.',
   15.4986, 73.8314, '12:00', '10:00', '+918322221234', 'stay@oldquarterhostel.com',
   'ACTIVE', false, NOW()),

  ('20000000-0000-0000-0000-000000000005',
   'The Baga Beach Resort', 'the-baga-beach-resort-goa', 'Goa', 'Baga',
   'Baga Beach Road, North Goa 403516',
   3, 'RESORT',
   'Lively beach resort right on Baga Beach with direct beach access.',
   15.5522, 73.7515, '14:00', '11:00', '+918322271234', 'info@bagabeachresort.com',
   'ACTIVE', false, NOW());

-- Delhi Hotels
INSERT INTO hotels (id, name, slug, city, neighborhood, address_line1, star_rating, hotel_type,
                    description, latitude, longitude, checkin_time, checkout_time,
                    primary_phone, email, status, is_featured, created_at)
VALUES
  ('30000000-0000-0000-0000-000000000001',
   'The Imperial New Delhi', 'the-imperial-new-delhi', 'Delhi', 'Connaught Place',
   'Janpath Road, New Delhi 110001',
   5, 'BOUTIQUE',
   'A heritage luxury hotel from 1931 set along the majestic Janpath boulevard.',
   28.6253, 77.2197, '14:00', '12:00', '+911123341234', 'reservations@theimperialindia.com',
   'ACTIVE', true, NOW()),

  ('30000000-0000-0000-0000-000000000002',
   'The Lodhi New Delhi', 'the-lodhi-new-delhi', 'Delhi', 'Lodhi Road',
   'Lodhi Road, New Delhi 110003',
   5, 'BOUTIQUE',
   'India first all-suite luxury hotel with private pool suites.',
   28.5921, 77.2274, '15:00', '12:00', '+911146776000', 'reservations@thelodhi.com',
   'ACTIVE', true, NOW()),

  ('30000000-0000-0000-0000-000000000003',
   'Radisson Blu Delhi', 'radisson-blu-delhi-connaught', 'Delhi', 'Connaught Place',
   'Block B, Connaught Place, New Delhi 110001',
   5, 'BUSINESS',
   'Contemporary luxury in Connaught Place with rooftop pool.',
   28.6328, 77.2196, '14:00', '12:00', '+911146764000', 'reservations.delhi@radissonblu.com',
   'ACTIVE', false, NOW()),

  ('30000000-0000-0000-0000-000000000004',
   'Bloom Hotel - Vasant Kunj', 'bloom-hotel-vasant-kunj-delhi', 'Delhi', 'Vasant Kunj',
   'Block F, Vasant Kunj, New Delhi 110070',
   3, 'BOUTIQUE',
   'Stylish boutique hotel with thoughtfully designed rooms.',
   28.5244, 77.1550, '13:00', '11:00', '+911146576000', 'vasantkunj@bloomhotels.com',
   'ACTIVE', false, NOW()),

  ('30000000-0000-0000-0000-000000000005',
   'Zostel Delhi', 'zostel-delhi-paharganj', 'Delhi', 'Paharganj',
   'Main Bazaar, Paharganj, New Delhi 110055',
   1, 'HOSTEL',
   'Vibrant backpacker hostel in the heart of Paharganj.',
   28.6447, 77.2134, '12:00', '10:00', '+919876543213', 'delhi@zostel.com',
   'ACTIVE', false, NOW());

-- ── Hotel Amenities ───────────────────────────────────────────────────────────
INSERT INTO hotel_amenities (hotel_id, amenity_name, category, is_active) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Free WiFi', 'CONNECTIVITY', true),
  ('10000000-0000-0000-0000-000000000001', 'Swimming Pool', 'RECREATION', true),
  ('10000000-0000-0000-0000-000000000001', 'Air Conditioning', 'COMFORT', true),
  ('10000000-0000-0000-0000-000000000001', 'Restaurant', 'DINING', true),
  ('10000000-0000-0000-0000-000000000001', 'Gym', 'FITNESS', true),
  ('10000000-0000-0000-0000-000000000001', 'Spa', 'WELLNESS', true),
  ('10000000-0000-0000-0000-000000000001', 'Free Parking', 'TRANSPORT', true),
  ('10000000-0000-0000-0000-000000000001', 'Room Service', 'SERVICES', true),
  ('10000000-0000-0000-0000-000000000002', 'Free WiFi', 'CONNECTIVITY', true),
  ('10000000-0000-0000-0000-000000000002', 'Swimming Pool', 'RECREATION', true),
  ('10000000-0000-0000-0000-000000000002', 'Air Conditioning', 'COMFORT', true),
  ('10000000-0000-0000-0000-000000000002', 'Restaurant', 'DINING', true),
  ('10000000-0000-0000-0000-000000000002', 'Gym', 'FITNESS', true),
  ('10000000-0000-0000-0000-000000000003', 'Free WiFi', 'CONNECTIVITY', true),
  ('10000000-0000-0000-0000-000000000003', 'Swimming Pool', 'RECREATION', true),
  ('10000000-0000-0000-0000-000000000003', 'Air Conditioning', 'COMFORT', true),
  ('10000000-0000-0000-0000-000000000003', 'Restaurant', 'DINING', true),
  ('10000000-0000-0000-0000-000000000004', 'Free WiFi', 'CONNECTIVITY', true),
  ('10000000-0000-0000-0000-000000000004', 'Air Conditioning', 'COMFORT', true),
  ('10000000-0000-0000-0000-000000000004', 'Restaurant', 'DINING', true),
  ('10000000-0000-0000-0000-000000000005', 'Free WiFi', 'CONNECTIVITY', true),
  ('10000000-0000-0000-0000-000000000005', 'Air Conditioning', 'COMFORT', true),
  ('20000000-0000-0000-0000-000000000001', 'Free WiFi', 'CONNECTIVITY', true),
  ('20000000-0000-0000-0000-000000000001', 'Swimming Pool', 'RECREATION', true),
  ('20000000-0000-0000-0000-000000000001', 'Air Conditioning', 'COMFORT', true),
  ('20000000-0000-0000-0000-000000000001', 'Restaurant', 'DINING', true),
  ('20000000-0000-0000-0000-000000000001', 'Spa', 'WELLNESS', true),
  ('20000000-0000-0000-0000-000000000001', 'Free Parking', 'TRANSPORT', true),
  ('20000000-0000-0000-0000-000000000001', 'Beach Access', 'RECREATION', true),
  ('20000000-0000-0000-0000-000000000002', 'Free WiFi', 'CONNECTIVITY', true),
  ('20000000-0000-0000-0000-000000000002', 'Swimming Pool', 'RECREATION', true),
  ('20000000-0000-0000-0000-000000000002', 'Air Conditioning', 'COMFORT', true),
  ('20000000-0000-0000-0000-000000000002', 'Restaurant', 'DINING', true),
  ('20000000-0000-0000-0000-000000000002', 'Spa', 'WELLNESS', true),
  ('20000000-0000-0000-0000-000000000002', 'Beach Access', 'RECREATION', true),
  ('30000000-0000-0000-0000-000000000001', 'Free WiFi', 'CONNECTIVITY', true),
  ('30000000-0000-0000-0000-000000000001', 'Swimming Pool', 'RECREATION', true),
  ('30000000-0000-0000-0000-000000000001', 'Air Conditioning', 'COMFORT', true),
  ('30000000-0000-0000-0000-000000000001', 'Restaurant', 'DINING', true),
  ('30000000-0000-0000-0000-000000000001', 'Spa', 'WELLNESS', true),
  ('30000000-0000-0000-0000-000000000001', 'Gym', 'FITNESS', true),
  ('30000000-0000-0000-0000-000000000002', 'Free WiFi', 'CONNECTIVITY', true),
  ('30000000-0000-0000-0000-000000000002', 'Swimming Pool', 'RECREATION', true),
  ('30000000-0000-0000-0000-000000000002', 'Air Conditioning', 'COMFORT', true),
  ('30000000-0000-0000-0000-000000000002', 'Restaurant', 'DINING', true),
  ('30000000-0000-0000-0000-000000000002', 'Spa', 'WELLNESS', true);

-- ── Room Types ────────────────────────────────────────────────────────────────

-- Grand Taj Palace Mumbai rooms
INSERT INTO room_types (id, hotel_id, name, room_category, description, max_occupancy,
                        bed_type, room_size_sqft, view_type, base_price,
                        is_active, is_available_for_booking, sort_order, created_at)
VALUES
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Deluxe Sea View Room', 'DELUXE', 'Elegantly appointed room with panoramic Arabian Sea views',
   2, 'King Bed', 450, 'SEA_VIEW', 12000, true, true, 1, NOW()),

  ('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
   'Luxury Suite', 'SUITE', 'Spacious suite with separate living area, butler service, and sea views',
   3, 'King Bed + Sofa', 900, 'SEA_VIEW', 28000, true, true, 2, NOW()),

  ('11000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
   'Superior Room', 'STANDARD', 'Comfortable room with city or pool views',
   2, 'Twin Beds', 380, 'CITY_VIEW', 9500, true, true, 3, NOW());

-- Taj Exotica Goa rooms
INSERT INTO room_types (id, hotel_id, name, room_category, description, max_occupancy,
                        bed_type, room_size_sqft, view_type, base_price,
                        is_active, is_available_for_booking, sort_order, created_at)
VALUES
  ('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Deluxe Sea View Room', 'DELUXE', 'Beachfront room with direct sea views and private balcony',
   2, 'King Bed', 600, 'SEA_VIEW', 18000, true, true, 1, NOW()),

  ('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
   'Pool Villa', 'VILLA', 'Private pool villa with plunge pool and garden',
   4, 'King Bed', 1800, 'GARDEN_VIEW', 55000, true, true, 2, NOW()),

  ('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
   'Garden Room', 'STANDARD', 'Serene garden-view room with easy beach access',
   2, 'Twin Beds', 480, 'GARDEN_VIEW', 14000, true, true, 3, NOW());

-- The Imperial Delhi rooms
INSERT INTO room_types (id, hotel_id, name, room_category, description, max_occupancy,
                        bed_type, room_size_sqft, view_type, base_price,
                        is_active, is_available_for_booking, sort_order, created_at)
VALUES
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
   'Classic Room', 'STANDARD', 'Art deco furnished room with heritage ambience',
   2, 'King Bed', 520, 'GARDEN_VIEW', 14000, true, true, 1, NOW()),

  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001',
   'Imperial Suite', 'SUITE', 'Grand suite with hand-painted murals and historic artefacts',
   3, 'King Bed + Sofa', 1400, 'CITY_VIEW', 38000, true, true, 2, NOW());

-- ── Room Type Amenities ───────────────────────────────────────────────────────
INSERT INTO room_type_amenities (room_type_id, amenity_name, is_complimentary) VALUES
  ('11000000-0000-0000-0000-000000000001', 'Free WiFi', true),
  ('11000000-0000-0000-0000-000000000001', 'Air Conditioning', true),
  ('11000000-0000-0000-0000-000000000001', 'Flat Screen TV', true),
  ('11000000-0000-0000-0000-000000000001', 'Mini Bar', false),
  ('11000000-0000-0000-0000-000000000001', 'In-room Safe', true),
  ('11000000-0000-0000-0000-000000000001', 'Coffee Maker', true),
  ('21000000-0000-0000-0000-000000000001', 'Free WiFi', true),
  ('21000000-0000-0000-0000-000000000001', 'Air Conditioning', true),
  ('21000000-0000-0000-0000-000000000001', 'Flat Screen TV', true),
  ('21000000-0000-0000-0000-000000000001', 'Balcony', true),
  ('21000000-0000-0000-0000-000000000001', 'In-room Safe', true),
  ('21000000-0000-0000-0000-000000000002', 'Free WiFi', true),
  ('21000000-0000-0000-0000-000000000002', 'Air Conditioning', true),
  ('21000000-0000-0000-0000-000000000002', 'Flat Screen TV', true),
  ('21000000-0000-0000-0000-000000000002', 'Private Pool', true),
  ('21000000-0000-0000-0000-000000000002', 'Butler Service', true),
  ('31000000-0000-0000-0000-000000000001', 'Free WiFi', true),
  ('31000000-0000-0000-0000-000000000001', 'Air Conditioning', true),
  ('31000000-0000-0000-0000-000000000001', 'Flat Screen TV', true),
  ('31000000-0000-0000-0000-000000000001', 'In-room Safe', true);

-- ── Pricing Rules ─────────────────────────────────────────────────────────────
INSERT INTO pricing_rules (id, hotel_id, room_type_id, rule_type, rule_name,
                           date_from, date_to, days_of_week, adjustment_type,
                           adjustment_value, priority, is_active, created_by, created_at)
VALUES
  -- Weekend surge for Grand Taj
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', NULL,
   'WEEKEND_SURGE', 'Weekend Premium',
   NULL, NULL, '5,6,0', 'PERCENTAGE', 20.00, 100, true,
   '00000000-0000-0000-0000-000000000001', NOW()),

  -- Seasonal peak (Goa winter)
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000001', NULL,
   'SEASONAL', 'Goa Peak Season',
   '2025-11-01', '2026-02-28', NULL, 'PERCENTAGE', 35.00, 200, true,
   '00000000-0000-0000-0000-000000000001', NOW()),

  -- Early bird discount
  (gen_random_uuid(), '30000000-0000-0000-0000-000000000001', NULL,
   'ADVANCE_BOOKING', 'Early Bird 60-day',
   NULL, NULL, NULL, 'PERCENTAGE', -15.00, 50, true,
   '00000000-0000-0000-0000-000000000001', NOW());

-- ── Inventory for Room Types (next 365 days) ──────────────────────────────────
INSERT INTO room_inventory (id, room_type_id, date, total_rooms, available_rooms,
                             booked_rooms, base_price, admin_override_price, created_at)
SELECT
  gen_random_uuid(),
  rt.id,
  d.date::date,
  CASE rt.room_category
    WHEN 'VILLA' THEN 5
    WHEN 'SUITE' THEN 8
    WHEN 'DELUXE' THEN 15
    ELSE 20
  END AS total_rooms,
  CASE rt.room_category
    WHEN 'VILLA' THEN 5
    WHEN 'SUITE' THEN 8
    WHEN 'DELUXE' THEN 15
    ELSE 20
  END AS available_rooms,
  0 AS booked_rooms,
  rt.base_price AS base_price,
  NULL AS admin_override_price,
  NOW()
FROM room_types rt
CROSS JOIN generate_series(
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '365 days',
  INTERVAL '1 day'
) AS d(date)
WHERE rt.id IN (
  '11000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000002',
  '11000000-0000-0000-0000-000000000003',
  '21000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000002',
  '21000000-0000-0000-0000-000000000003',
  '31000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000002'
)
ON CONFLICT (room_type_id, date) DO NOTHING;

-- ── Sample Bookings ───────────────────────────────────────────────────────────
INSERT INTO bookings (id, booking_reference, hotel_id, room_type_id, user_id,
                      check_in, check_out, total_nights, adults, children,
                      base_amount, tax_amount, convenience_fee, discount_amount, total_amount,
                      currency, status, booked_at, confirmed_at)
VALUES
  ('50000000-0000-0000-0000-000000000001', 'MMC2025001',
   '10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000003',
   CURRENT_DATE + 10, CURRENT_DATE + 13, 3, 2, 0,
   36000, 6480, 99, 0, 42579,
   'INR', 'CONFIRMED',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes'),

  ('50000000-0000-0000-0000-000000000002', 'MMC2025002',
   '20000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000005',
   CURRENT_DATE + 30, CURRENT_DATE + 35, 5, 2, 0,
   90000, 16200, 99, 0, 106299,
   'INR', 'CONFIRMED',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '3 minutes'),

  ('50000000-0000-0000-0000-000000000003', 'MMC2025003',
   '30000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000004',
   CURRENT_DATE - 5, CURRENT_DATE - 3, 2, 2, 0,
   28000, 5040, 99, 0, 33139,
   'INR', 'CHECKED_OUT',
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '2 minutes');

-- Booking Guests
INSERT INTO booking_guests (booking_id, guest_type, is_primary, first_name, last_name, email, phone)
VALUES
  ('50000000-0000-0000-0000-000000000001', 'ADULT', true, 'Test', 'User', 'user@makemycrip.com', '+919876543210'),
  ('50000000-0000-0000-0000-000000000002', 'ADULT', true, 'Priya', 'Sharma', 'priya.sharma@example.com', '+919876543212'),
  ('50000000-0000-0000-0000-000000000003', 'ADULT', true, 'John', 'Doe', 'john.doe@example.com', '+919876543211');

-- ── Reviews ───────────────────────────────────────────────────────────────────
INSERT INTO reviews (id, booking_id, hotel_id, user_id, overall_rating,
                     cleanliness_rating, service_rating, location_rating, value_rating,
                     title, review_text, travel_type, status, helpful_count, created_at)
VALUES
  (gen_random_uuid(), '50000000-0000-0000-0000-000000000003',
   '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004',
   9.2, 9.5, 9.0, 9.8, 8.5,
   'Timeless luxury in the heart of Delhi',
   'The Imperial is in a class of its own. The 1930s art deco architecture is simply breathtaking.',
   'LEISURE', 'APPROVED', 12, NOW() - INTERVAL '2 days');

-- ── Notifications ─────────────────────────────────────────────────────────────
INSERT INTO notifications (id, user_id, type, title, message, channel, status, reference_type, reference_id, created_at)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003',
   'BOOKING_CONFIRMED', 'Booking Confirmed!', 'Your booking MMC2025001 at The Grand Taj Palace has been confirmed.',
   'IN_APP', 'UNREAD', 'BOOKING', '50000000-0000-0000-0000-000000000001', NOW()),

  (gen_random_uuid(), '00000000-0000-0000-0000-000000000005',
   'BOOKING_CONFIRMED', 'Booking Confirmed!', 'Your booking MMC2025002 at Taj Exotica Resort & Spa has been confirmed.',
   'IN_APP', 'UNREAD', 'BOOKING', '50000000-0000-0000-0000-000000000002', NOW());
