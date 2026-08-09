-- V12: Notification System - enhance notifications table, add campaigns, reminder schedules

-- 1. Add missing columns to notifications table
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS action_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'SYSTEM';

-- 2. Create index for pagination
CREATE INDEX IF NOT EXISTS idx_notif_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user_status ON notifications(user_id, status);

-- 3. Email verification reminder tracking
CREATE TABLE IF NOT EXISTS email_verification_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    reminder_count INT NOT NULL DEFAULT 0,
    last_sent_at TIMESTAMP,
    next_send_at TIMESTAMP,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_evr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_evr_user ON email_verification_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_evr_next_send ON email_verification_reminders(next_send_at) WHERE completed = FALSE;

-- 4. Abandoned booking reminder tracking (track which reminders already sent)
CREATE TABLE IF NOT EXISTS booking_reminder_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    reminder_number INT NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_brl_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT uq_brl_booking_reminder UNIQUE (booking_id, reminder_number)
);
CREATE INDEX IF NOT EXISTS idx_brl_booking ON booking_reminder_log(booking_id);

-- 5. Promotional campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    subject VARCHAR(300) NOT NULL,
    body TEXT NOT NULL,
    cta_text VARCHAR(100),
    cta_url VARCHAR(500),
    discount_code VARCHAR(50),
    expires_at TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    target_type VARCHAR(50) NOT NULL,
    target_cities TEXT,
    target_user_ids TEXT,
    target_condition VARCHAR(100),
    condition_value VARCHAR(100),
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    total_sent INT DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON campaigns(scheduled_at) WHERE status = 'SCHEDULED';

-- 6. Campaign send log (per-user tracking)
CREATE TABLE IF NOT EXISTS campaign_send_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL,
    user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_csl_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    CONSTRAINT uq_csl_campaign_user UNIQUE (campaign_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_csl_campaign ON campaign_send_log(campaign_id);
