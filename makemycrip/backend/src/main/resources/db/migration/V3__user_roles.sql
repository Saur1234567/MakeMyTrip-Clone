-- ============================================================
-- V3: Multi-role support — user_roles junction table
-- A user can hold multiple roles simultaneously:
--   e.g. ADMIN + HOTEL_MANAGER + USER
-- ============================================================

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role    VARCHAR(30) NOT NULL,
    PRIMARY KEY (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- Backfill existing users: copy their current single role into user_roles
INSERT INTO user_roles (user_id, role)
SELECT id, role FROM users
ON CONFLICT DO NOTHING;

-- Give admin user all three roles so they can access everything
INSERT INTO user_roles (user_id, role)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000001', 'HOTEL_MANAGER'),
  ('00000000-0000-0000-0000-000000000001', 'USER'),
  ('00000000-0000-0000-0000-000000000002', 'HOTEL_MANAGER'),
  ('00000000-0000-0000-0000-000000000002', 'USER')
ON CONFLICT DO NOTHING;
