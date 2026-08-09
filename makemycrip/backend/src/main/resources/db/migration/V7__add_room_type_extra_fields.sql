-- V7: Add missing columns to room_types table used by admin UI
ALTER TABLE room_types
    ADD COLUMN IF NOT EXISTS bathroom_type  VARCHAR(50),
    ADD COLUMN IF NOT EXISTS floor_numbers  VARCHAR(255);
