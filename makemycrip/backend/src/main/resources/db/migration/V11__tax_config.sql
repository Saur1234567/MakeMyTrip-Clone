-- ============================================================
-- V11: Configurable Tax System
--      tax_slabs  — tiered GST based on booking total
--      tax_fees   — global and hotel-specific flat/percent fees
-- ============================================================

-- ── Tax Slabs (tiered GST) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS tax_slabs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_amount      NUMERIC(12,2) NOT NULL,          -- lower bound (inclusive)
    max_amount      NUMERIC(12,2),                    -- upper bound (exclusive); NULL = no ceiling
    gst_rate        NUMERIC(5,2)  NOT NULL,           -- total GST % (e.g. 12 = 12%)
    label           VARCHAR(100)  NOT NULL,           -- display label, e.g. "12% GST"
    is_active       BOOLEAN       NOT NULL DEFAULT true,
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Default Indian hotel GST slabs (admin can modify via UI)
INSERT INTO tax_slabs (min_amount, max_amount, gst_rate, label) VALUES
    (0,       1000,  0,  '0% GST (below ₹1,000)')   ON CONFLICT DO NOTHING;
INSERT INTO tax_slabs (min_amount, max_amount, gst_rate, label) VALUES
    (1000,    2000,  5,  '5% GST (₹1,000 – ₹2,000)') ON CONFLICT DO NOTHING;
INSERT INTO tax_slabs (min_amount, max_amount, gst_rate, label) VALUES
    (2000,    5000,  12, '12% GST (₹2,000 – ₹5,000)') ON CONFLICT DO NOTHING;
INSERT INTO tax_slabs (min_amount, max_amount, gst_rate, label) VALUES
    (5000,    7500,  12, '12% GST (₹5,000 – ₹7,500)') ON CONFLICT DO NOTHING;
INSERT INTO tax_slabs (min_amount, max_amount, gst_rate, label) VALUES
    (7500,    NULL,  18, '18% GST (above ₹7,500)')    ON CONFLICT DO NOTHING;

-- ── Tax Fees (global + hotel-specific) ───────────────────────
CREATE TABLE IF NOT EXISTS tax_fees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_name        VARCHAR(100)  NOT NULL,           -- e.g. "Convenience Fee"
    fee_type        VARCHAR(20)   NOT NULL,           -- FLAT | PERCENT
    amount          NUMERIC(12,2) NOT NULL,           -- flat INR or percent value
    scope           VARCHAR(20)   NOT NULL DEFAULT 'GLOBAL', -- GLOBAL | HOTEL
    hotel_id        UUID          REFERENCES hotels(id) ON DELETE CASCADE,
    is_active       BOOLEAN       NOT NULL DEFAULT true,
    display_order   INT           NOT NULL DEFAULT 0,
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_hotel_fee CHECK (scope = 'GLOBAL' OR hotel_id IS NOT NULL)
);

-- Default global fees
INSERT INTO tax_fees (fee_name, fee_type, amount, scope, display_order) VALUES
    ('Convenience Fee', 'FLAT', 99, 'GLOBAL', 1)   ON CONFLICT DO NOTHING;
