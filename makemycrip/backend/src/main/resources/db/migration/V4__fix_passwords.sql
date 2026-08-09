-- ============================================================
-- V4: Fix seed user passwords
-- BCrypt cost=12 hash of 'Password@123'
-- Generated with bcryptjs: hashSync('Password@123', 12)
-- Hash: $2b$12$ll8dfF3amzJGPymKhLNHN.7/vkMO6CBzTN./Myu9hvSx16QXk.ER6
-- Spring BCryptPasswordEncoder accepts both $2a$ and $2b$ prefixes
-- ============================================================

UPDATE users
SET password_hash = '$2b$12$ll8dfF3amzJGPymKhLNHN.7/vkMO6CBzTN./Myu9hvSx16QXk.ER6'
WHERE email IN (
    'admin@makemycrip.com',
    'manager@makemycrip.com',
    'user@makemycrip.com',
    'john.doe@example.com',
    'priya.sharma@example.com'
);
