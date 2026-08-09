-- ============================================================
-- V1: Full Schema for MakeMyCrip Hotel Booking System
-- ============================================================

-- USERS & AUTH
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),
    profile_picture_url TEXT,
    nationality VARCHAR(100),
    loyalty_tier VARCHAR(20) DEFAULT 'BRONZE',
    loyalty_points INTEGER DEFAULT 0,
    is_email_verified BOOLEAN DEFAULT false,
    is_phone_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    preferred_currency VARCHAR(3) DEFAULT 'INR',
    preferred_language VARCHAR(10) DEFAULT 'en',
    role VARCHAR(20) DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_type VARCHAR(20),
    device_name VARCHAR(100),
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address VARCHAR(45),
    city VARCHAR(100),
    country VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE otp_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(30) NOT NULL,
    attempts INTEGER DEFAULT 0,
    is_used BOOLEAN DEFAULT false,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50),
    address_line1 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    pincode VARCHAR(20),
    is_default BOOLEAN DEFAULT false
);

-- HOTELS
CREATE TABLE hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    hotel_type VARCHAR(30),
    star_rating DECIMAL(2,1),
    checkin_time TIME DEFAULT '14:00',
    checkout_time TIME DEFAULT '11:00',
    total_floors INTEGER,
    total_rooms INTEGER,
    year_built INTEGER,
    address_line1 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    pincode VARCHAR(20),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    neighborhood VARCHAR(100),
    distance_from_airport DECIMAL(5,2),
    distance_from_city_center DECIMAL(5,2),
    primary_phone VARCHAR(20),
    email VARCHAR(255),
    gstin_encrypted VARCHAR(500),
    status VARCHAR(40) DEFAULT 'ACTIVE',
    status_reason TEXT,
    status_changed_at TIMESTAMP,
    status_changed_by UUID REFERENCES users(id),
    is_featured BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    cancellation_policy VARCHAR(30) DEFAULT 'MODERATE',
    pets_allowed BOOLEAN DEFAULT false,
    smoking_allowed BOOLEAN DEFAULT false,
    minimum_age_checkin INTEGER DEFAULT 18,
    managed_by UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE hotel_amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    category VARCHAR(100),
    amenity_name VARCHAR(100) NOT NULL,
    amenity_icon VARCHAR(50),
    is_paid BOOLEAN DEFAULT false,
    price_info VARCHAR(100),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE hotel_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption VARCHAR(255),
    category VARCHAR(30),
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE hotel_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    policy_type VARCHAR(100),
    title VARCHAR(255),
    description TEXT,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE hotel_nearby_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    place_name VARCHAR(255),
    place_type VARCHAR(50),
    distance_km DECIMAL(5,2),
    travel_time_minutes INTEGER,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8)
);

CREATE TABLE hotel_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- ROOM TYPES
CREATE TABLE room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    room_category VARCHAR(30),
    bed_type VARCHAR(100),
    max_occupancy INTEGER NOT NULL DEFAULT 2,
    max_adults INTEGER DEFAULT 2,
    max_children INTEGER DEFAULT 1,
    room_size_sqft INTEGER,
    view_type VARCHAR(30),
    base_price DECIMAL(12,2) NOT NULL,
    extra_adult_charge DECIMAL(10,2) DEFAULT 0,
    extra_child_charge DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_available_for_booking BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE room_type_amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id UUID REFERENCES room_types(id) ON DELETE CASCADE,
    amenity_name VARCHAR(100) NOT NULL,
    amenity_icon VARCHAR(50),
    is_complimentary BOOLEAN DEFAULT true
);

CREATE TABLE room_type_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id UUID REFERENCES room_types(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false
);

-- PHYSICAL ROOMS
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id UUID REFERENCES room_types(id),
    room_number VARCHAR(20) NOT NULL,
    floor_number INTEGER,
    is_active BOOLEAN DEFAULT true,
    is_blocked BOOLEAN DEFAULT false,
    block_reason TEXT,
    blocked_from TIMESTAMP,
    blocked_until TIMESTAMP,
    blocked_by UUID REFERENCES users(id),
    notes TEXT,
    UNIQUE(hotel_id, room_number)
);

-- INVENTORY & PRICING
CREATE TABLE room_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id UUID REFERENCES room_types(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_rooms INTEGER NOT NULL,
    available_rooms INTEGER NOT NULL,
    booked_rooms INTEGER DEFAULT 0,
    blocked_rooms INTEGER DEFAULT 0,
    base_price DECIMAL(12,2) NOT NULL,
    admin_override_price DECIMAL(12,2),
    final_price DECIMAL(12,2),
    min_price_floor DECIMAL(12,2),
    max_price_ceiling DECIMAL(12,2),
    is_blocked BOOLEAN DEFAULT false,
    block_reason TEXT,
    min_nights INTEGER DEFAULT 1,
    max_nights INTEGER DEFAULT 30,
    closed_to_arrival BOOLEAN DEFAULT false,
    closed_to_departure BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(room_type_id, date)
);

CREATE TABLE pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES hotels(id),
    room_type_id UUID REFERENCES room_types(id),
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(30),
    priority INTEGER DEFAULT 0,
    date_from DATE,
    date_to DATE,
    days_of_week VARCHAR(20),
    adjustment_type VARCHAR(20),
    adjustment_value DECIMAL(10,2),
    min_nights_to_apply INTEGER DEFAULT 1,
    advance_booking_days_min INTEGER,
    advance_booking_days_max INTEGER,
    occupancy_threshold_percent INTEGER,
    device_type VARCHAR(20),
    loyalty_tier VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pricing_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100),
    user_id UUID REFERENCES users(id),
    room_type_id UUID REFERENCES room_types(id),
    check_in DATE,
    check_out DATE,
    base_price DECIMAL(12,2),
    rules_applied JSONB,
    final_price DECIMAL(12,2),
    device_type VARCHAR(20),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

-- PROMOTIONS
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES hotels(id),
    promotion_name VARCHAR(255) NOT NULL,
    promotion_type VARCHAR(50),
    discount_type VARCHAR(20),
    discount_value DECIMAL(10,2),
    max_discount_amount DECIMAL(10,2),
    min_booking_amount DECIMAL(10,2) DEFAULT 0,
    min_nights INTEGER DEFAULT 1,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    total_usage_limit INTEGER,
    per_user_limit INTEGER DEFAULT 1,
    current_usage INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE coupon_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID REFERENCES promotions(id),
    code VARCHAR(50) UNIQUE NOT NULL,
    is_single_use BOOLEAN DEFAULT false,
    is_used BOOLEAN DEFAULT false,
    used_by UUID REFERENCES users(id),
    used_at TIMESTAMP
);

-- BOOKINGS
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    hotel_id UUID REFERENCES hotels(id),
    room_type_id UUID REFERENCES room_types(id),
    room_id UUID REFERENCES rooms(id),
    status VARCHAR(30) DEFAULT 'PENDING',
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    total_nights INTEGER,
    adults INTEGER NOT NULL DEFAULT 1,
    children INTEGER DEFAULT 0,
    infants INTEGER DEFAULT 0,
    base_amount DECIMAL(12,2),
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2),
    convenience_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    price_breakdown JSONB,
    coupon_code VARCHAR(50),
    coupon_discount DECIMAL(10,2) DEFAULT 0,
    promotion_id UUID REFERENCES promotions(id),
    special_requests TEXT,
    internal_notes TEXT,
    arrival_time VARCHAR(50),
    early_checkin_requested BOOLEAN DEFAULT false,
    late_checkout_requested BOOLEAN DEFAULT false,
    early_checkin_approved BOOLEAN DEFAULT false,
    late_checkout_approved BOOLEAN DEFAULT false,
    early_checkin_charge DECIMAL(10,2),
    late_checkout_charge DECIMAL(10,2),
    source VARCHAR(20) DEFAULT 'WEB',
    device_type VARCHAR(20),
    ip_address VARCHAR(45),
    booked_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    cancelled_by VARCHAR(20),
    checked_in_at TIMESTAMP,
    checked_in_by UUID REFERENCES users(id),
    checked_out_at TIMESTAMP,
    no_show_at TIMESTAMP,
    loyalty_points_earned INTEGER DEFAULT 0,
    loyalty_points_redeemed INTEGER DEFAULT 0
);

CREATE TABLE booking_guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    guest_type VARCHAR(20) DEFAULT 'ADULT',
    is_primary BOOLEAN DEFAULT false,
    title VARCHAR(10),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    date_of_birth DATE,
    nationality VARCHAR(100),
    id_type VARCHAR(30),
    id_number_encrypted VARCHAR(500),
    added_at TIMESTAMP DEFAULT NOW(),
    added_by UUID REFERENCES users(id)
);

CREATE TABLE booking_modification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    modified_by UUID REFERENCES users(id),
    modified_by_role VARCHAR(20),
    modification_type VARCHAR(50),
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    modified_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE booking_add_ons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    add_on_type VARCHAR(50),
    description VARCHAR(255),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'PENDING',
    requested_at TIMESTAMP DEFAULT NOW(),
    confirmed_by UUID REFERENCES users(id)
);

-- WAITLIST
CREATE TABLE booking_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    hotel_id UUID REFERENCES hotels(id),
    room_type_id UUID REFERENCES room_types(id),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    adults INTEGER DEFAULT 1,
    children INTEGER DEFAULT 0,
    position INTEGER NOT NULL,
    notified_at TIMESTAMP,
    confirmation_deadline TIMESTAMP,
    status VARCHAR(20) DEFAULT 'WAITING',
    created_at TIMESTAMP DEFAULT NOW()
);

-- PAYMENTS
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    payment_reference VARCHAR(100) UNIQUE,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    payment_type VARCHAR(30),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(20),
    payment_method VARCHAR(30),
    card_last4 VARCHAR(4),
    card_brand VARCHAR(30),
    failure_reason TEXT,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    payment_id UUID REFERENCES payments(id),
    stripe_refund_id VARCHAR(255),
    refund_reference VARCHAR(100) UNIQUE,
    amount DECIMAL(12,2) NOT NULL,
    reason VARCHAR(255),
    status VARCHAR(20),
    initiated_by UUID REFERENCES users(id),
    initiated_by_role VARCHAR(20),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE saved_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    stripe_payment_method_id VARCHAR(255) NOT NULL,
    card_brand VARCHAR(30),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    nickname VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- REVIEWS
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) UNIQUE,
    hotel_id UUID REFERENCES hotels(id),
    user_id UUID REFERENCES users(id),
    overall_rating DECIMAL(2,1) NOT NULL,
    cleanliness_rating DECIMAL(2,1),
    service_rating DECIMAL(2,1),
    location_rating DECIMAL(2,1),
    value_rating DECIMAL(2,1),
    title VARCHAR(255),
    review_text TEXT,
    travel_type VARCHAR(20),
    status VARCHAR(20) DEFAULT 'PENDING',
    admin_response TEXT,
    admin_responded_at TIMESTAMP,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- WISHLIST
CREATE TABLE wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    hotel_id UUID REFERENCES hotels(id),
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, hotel_id)
);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(100),
    title VARCHAR(255),
    message TEXT,
    data JSONB,
    channel VARCHAR(20),
    status VARCHAR(20) DEFAULT 'UNREAD',
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    to_email VARCHAR(255),
    subject VARCHAR(500),
    template_name VARCHAR(100),
    status VARCHAR(20),
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ADMIN AUDIT
CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES users(id),
    action VARCHAR(255),
    entity_type VARCHAR(100),
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    reason TEXT,
    performed_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_hotels_city ON hotels(city);
CREATE INDEX idx_hotels_status ON hotels(status);
CREATE INDEX idx_hotels_star_rating ON hotels(star_rating);
CREATE INDEX idx_hotels_type ON hotels(hotel_type);
CREATE INDEX idx_hotels_featured ON hotels(is_featured);
CREATE INDEX idx_room_types_hotel ON room_types(hotel_id);
CREATE INDEX idx_room_inventory_date ON room_inventory(room_type_id, date);
CREATE INDEX idx_room_inventory_available ON room_inventory(room_type_id, date, available_rooms);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_hotel ON bookings(hotel_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_checkin ON bookings(check_in);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_stripe ON payments(stripe_payment_intent_id);
CREATE INDEX idx_reviews_hotel ON reviews(hotel_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_notifications_user ON notifications(user_id, status);
CREATE INDEX idx_otp_identifier ON otp_store(identifier, purpose);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id, is_active);
CREATE INDEX idx_pricing_rules_hotel ON pricing_rules(hotel_id, is_active);
CREATE INDEX idx_wishlists_user ON wishlists(user_id);
