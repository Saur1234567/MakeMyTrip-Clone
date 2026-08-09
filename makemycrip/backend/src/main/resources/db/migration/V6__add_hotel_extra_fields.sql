-- V6: Add missing columns to hotels table that are used by the admin edit UI
ALTER TABLE hotels
    ADD COLUMN IF NOT EXISTS secondary_phone   VARCHAR(20),
    ADD COLUMN IF NOT EXISTS website           VARCHAR(500),
    ADD COLUMN IF NOT EXISTS facebook_url      VARCHAR(500),
    ADD COLUMN IF NOT EXISTS instagram_url     VARCHAR(500),
    ADD COLUMN IF NOT EXISTS pan_number        VARCHAR(20),
    ADD COLUMN IF NOT EXISTS events_allowed    BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS year_renovated    INTEGER,
    ADD COLUMN IF NOT EXISTS cancellation_policy_details TEXT,
    ADD COLUMN IF NOT EXISTS address_line2     VARCHAR(255);
