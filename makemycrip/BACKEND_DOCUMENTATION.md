# MakeMyCrip — Backend Developer Reference Guide

> **Version:** 1.0.0 · **Java:** 21 · **Spring Boot:** 3.2.5 · **Database:** PostgreSQL 15+ · **Port:** 8081

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack & Dependencies](#2-technology-stack--dependencies)
3. [Project Structure](#3-project-structure)
4. [Configuration Reference](#4-configuration-reference)
5. [Database Design](#5-database-design)
6. [Authentication & Session System](#6-authentication--session-system)
7. [API Reference](#7-api-reference)
8. [Module Breakdown](#8-module-breakdown)
9. [Payment Integration (Stripe)](#9-payment-integration-stripe)
10. [Notification System](#10-notification-system)
11. [File Uploads](#11-file-uploads)
12. [Error Handling](#12-error-handling)
13. [Testing Guide](#13-testing-guide)
14. [Deployment & Developer Workflow](#14-deployment--developer-workflow)

---

## 1. Architecture Overview

MakeMyCrip is a **hotel booking platform** built as a monolithic Spring Boot application with a clean layered architecture. The backend exposes a REST API consumed by a React/Vite frontend.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend (Vite)                     │
│                     http://localhost:5173                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/REST + WebSocket (SockJS/STOMP)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Spring Boot Backend (Port 8081)                  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Auth Module │  │Booking Module│  │ Notification Module  │   │
│  │  JWT + OAuth2│  │ Pricing Eng. │  │ Email + WebSocket    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Hotel Module │  │Payment Module│  │   Admin Module       │   │
│  │  Search/CRUD │  │   Stripe     │  │ Campaigns/Audit      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Common / Cross-Cutting Concerns             │    │
│  │  Security · Rate Limiting · Exception Handling · Audit  │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────┬──────────────────────────┬───────────────────────────┘
           │                          │
           ▼                          ▼
  ┌─────────────────┐       ┌──────────────────┐
  │   PostgreSQL 15  │       │   Redis (Cache)  │
  │  (Primary Store) │       │  OTP · Sessions  │
  └─────────────────┘       └──────────────────┘
```

### Design Principles

- **Package-by-feature**: Each domain (`auth`, `booking`, `hotel`, `payment`, `notification`, `user`, `pricing`, `promotion`) is a self-contained package with its own `entity`, `dto`, `repository`, `service`, and `controller` sub-packages.
- **Layered architecture**: Controller → Service → Repository, with DTOs crossing layer boundaries.
- **Async notifications**: All email and in-app notification dispatch is `@Async` — never blocks the request thread.
- **Scheduled jobs**: `@Scheduled` cron jobs handle abandoned bookings, check-in reminders, review requests, and email verification reminders.
- **Idempotent webhooks**: Stripe webhook handlers check for duplicate `chargeId` before processing.

---

## 2. Technology Stack & Dependencies

### Core Framework

| Dependency | Version | Purpose |
|---|---|---|
| Spring Boot | 3.2.5 | Application framework |
| Java | 21 | Runtime (LTS) |
| Spring Security | (Boot-managed) | Authentication & authorization |
| Spring Data JPA | (Boot-managed) | ORM / repository layer |
| Spring WebSocket | (Boot-managed) | STOMP/SockJS real-time |
| Spring Mail | (Boot-managed) | Email via JavaMailSender |
| Spring Actuator | (Boot-managed) | Health/metrics endpoints |

### Database & Caching

| Dependency | Version | Purpose |
|---|---|---|
| PostgreSQL Driver | (Boot-managed) | JDBC driver |
| Flyway (PostgreSQL) | 10.10.0 | Database migrations |
| Spring Data Redis | (Boot-managed) | Redis client (Lettuce pool) |

### Security

| Dependency | Version | Purpose |
|---|---|---|
| jjwt-api | 0.12.5 | JWT token creation |
| jjwt-impl | 0.12.5 | JWT implementation |
| jjwt-jackson | 0.12.5 | JWT JSON serialization |
| Spring OAuth2 Client | (Boot-managed) | Google OAuth2 login |
| Bucket4j Core | 8.10.1 | Token-bucket rate limiting |

### Payments & Documents

| Dependency | Version | Purpose |
|---|---|---|
| stripe-java | 24.3.0 | Stripe payment processing |
| itext-core | 8.0.3 | PDF invoice generation |

### Utilities

| Dependency | Version | Purpose |
|---|---|---|
| MapStruct | 1.5.5.Final | DTO ↔ Entity mapping |
| Lombok | 1.18.32 | Boilerplate reduction |
| springdoc-openapi-ui | 2.5.0 | Swagger UI / OpenAPI 3 |
| Jackson | (Boot-managed) | JSON serialization |
| Thymeleaf | (Boot-managed) | HTML email templates |

### Testing

| Dependency | Version | Purpose |
|---|---|---|
| Spring Boot Test | (Boot-managed) | Integration test support |
| Testcontainers (BOM) | 1.19.7 | Containerized DB/Redis tests |
| REST Assured | (Boot-managed) | HTTP API testing |
| JaCoCo | 0.8.11 | Code coverage (60% minimum) |

---

## 3. Project Structure

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/makemycrip/
│   │   │   ├── MakeMyCripApplication.java          # Main entry point
│   │   │   ├── auth/                               # Authentication module
│   │   │   │   ├── controller/AuthController.java
│   │   │   │   ├── dto/                            # RegisterRequest, LoginRequest, AuthResponse, etc.
│   │   │   │   ├── entity/UserSession.java
│   │   │   │   ├── enums/OtpPurpose.java
│   │   │   │   ├── repository/UserSessionRepository.java
│   │   │   │   ├── security/
│   │   │   │   │   ├── JwtAuthenticationFilter.java
│   │   │   │   │   └── JwtTokenProvider.java
│   │   │   │   └── service/
│   │   │   │       ├── AuthService.java
│   │   │   │       ├── GeoLocationService.java
│   │   │   │       ├── OtpService.java
│   │   │   │       └── UserAgentParser.java
│   │   │   ├── booking/                            # Booking module
│   │   │   │   ├── controller/BookingController.java
│   │   │   │   ├── dto/                            # BookingResponse, InitiateBookingRequest, etc.
│   │   │   │   ├── entity/                         # Booking, BookingGuest, BookingAddOn, etc.
│   │   │   │   ├── enums/                          # BookingStatus, BookingSource, AddOnType
│   │   │   │   ├── repository/BookingRepository.java
│   │   │   │   └── service/
│   │   │   │       ├── BookingService.java
│   │   │   │       ├── BookingSchedulerService.java
│   │   │   │       └── PdfInvoiceService.java
│   │   │   ├── common/                             # Cross-cutting concerns
│   │   │   │   ├── audit/                          # AdminAuditLog, AuditService
│   │   │   │   ├── config/                         # SecurityConfig, WebSocketConfig, etc.
│   │   │   │   ├── exception/                      # GlobalExceptionHandler + custom exceptions
│   │   │   │   ├── logging/                        # CorrelationIdFilter, RequestLoggingInterceptor
│   │   │   │   ├── response/ApiResponse.java       # Unified API response wrapper
│   │   │   │   └── util/                           # DateUtil, EncryptionUtil, SlugUtil
│   │   │   ├── hotel/                              # Hotel module
│   │   │   │   ├── controller/                     # HotelController, AdminHotelController
│   │   │   │   ├── entity/                         # Hotel, RoomType, Room, RoomInventory, etc.
│   │   │   │   ├── enums/                          # CancellationPolicy, HotelStatus, etc.
│   │   │   │   ├── repository/                     # HotelRepository, RoomTypeRepository, etc.
│   │   │   │   └── service/                        # HotelService, HotelSearchService
│   │   │   ├── notification/                       # Notification module
│   │   │   │   ├── controller/NotificationController.java
│   │   │   │   ├── dto/                            # NotificationDto, CreateNotificationRequest
│   │   │   │   ├── entity/                         # Notification, Campaign, EmailVerificationReminder, etc.
│   │   │   │   ├── enums/                          # NotificationType, NotificationStatus, NotificationChannel
│   │   │   │   ├── repository/                     # NotificationRepository, CampaignRepository, etc.
│   │   │   │   └── service/
│   │   │   │       ├── NotificationService.java
│   │   │   │       ├── NotificationDispatcher.java
│   │   │   │       ├── EmailService.java
│   │   │   │       ├── CampaignService.java
│   │   │   │       └── ReminderSchedulerService.java
│   │   │   ├── payment/                            # Payment module
│   │   │   │   ├── controller/PaymentController.java
│   │   │   │   ├── entity/                         # Payment, Refund
│   │   │   │   ├── enums/                          # PaymentMethod, PaymentStatus, PaymentType, RefundStatus
│   │   │   │   ├── repository/                     # PaymentRepository, RefundRepository
│   │   │   │   ├── service/PaymentService.java
│   │   │   │   └── webhook/StripeWebhookController.java
│   │   │   ├── pricing/                            # Pricing engine
│   │   │   │   ├── dto/                            # PricingContext, PricingResult
│   │   │   │   ├── engine/PricingEngineService.java
│   │   │   │   └── entity/                         # PricingRule, PricingAuditLog
│   │   │   ├── promotion/                          # Promotions & coupons
│   │   │   │   ├── entity/                         # Promotion, CouponCode
│   │   │   │   └── service/CouponService.java
│   │   │   └── user/                               # User module
│   │   │       ├── dto/                            # UserProfileDto, UpdateProfileRequest
│   │   │       ├── entity/User.java
│   │   │       ├── enums/                          # UserRole, LoyaltyTier, Gender, DeviceType, IdType
│   │   │       ├── repository/UserRepository.java
│   │   │       └── service/UserService.java
│   │   └── resources/
│   │       ├── application.yml                     # Main configuration
│   │       ├── db/migration/                       # Flyway SQL migrations V1–V12
│   │       └── templates/email/                    # Thymeleaf HTML email templates (18 templates)
│   └── test/
│       └── java/com/makemycrip/                    # Integration tests
├── uploads/                                        # Local file storage (hotels, room-types)
├── pom.xml
└── Dockerfile
```

---

## 4. Configuration Reference

All configuration lives in [`backend/src/main/resources/application.yml`](backend/src/main/resources/application.yml).

### Server

```yaml
server:
  port: 8081
  servlet:
    context-path: /
```

### Database (PostgreSQL)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/makemycrip
    username: postgres
    password: <from env>
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      connection-timeout: 30000
```

### Redis

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
      lettuce:
        pool:
          max-active: 8
          min-idle: 2
```

Redis is used for:
- **OTP storage** — keys expire after 10 minutes
- **Price locks** — 15-minute TTL during booking checkout
- **Session caching** (optional)

### JWT

```yaml
app:
  jwt:
    secret: <256-bit base64 secret>
    access-token-expiry: 900000      # 15 minutes (ms)
    refresh-token-expiry: 2592000000 # 30 days (ms)
```

### Email (Gmail SMTP)

```yaml
spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: <gmail address>
    password: <app password>
    properties:
      mail.smtp.starttls.enable: true
      mail.smtp.auth: true
```

### OAuth2 (Google)

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: <google client id>
            client-secret: <google client secret>
            scope: email, profile
```

### Stripe

```yaml
app:
  stripe:
    secret-key: sk_test_...
    webhook-secret: whsec_...
```

### CORS

```yaml
app:
  cors:
    allowed-origins: http://localhost:5173
```

### Flyway

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
```

### Kafka (Disabled)

```yaml
app:
  kafka:
    enabled: false
```

Kafka integration is scaffolded but disabled. All event dispatch uses direct method calls and `@Async` threads.

### File Upload

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 50MB

app:
  upload:
    base-dir: uploads/
```

---

## 5. Database Design

The database uses **PostgreSQL** with **Flyway** migrations. All migrations are in [`backend/src/main/resources/db/migration/`](backend/src/main/resources/db/migration/).

### Migration History

| Version | File | Description |
|---|---|---|
| V1 | `V1__schema.sql` | Full initial schema (33 tables) |
| V2 | `V2__seed.sql` | Seed data (hotels, rooms, users) |
| V3 | `V3__user_roles.sql` | User roles table |
| V4 | `V4__fix_passwords.sql` | Password hash fixes |
| V5 | `V5__fix_schema_gaps.sql` | Schema gap corrections |
| V6 | `V6__add_hotel_extra_fields.sql` | Hotel extra fields |
| V7 | `V7__add_room_type_extra_fields.sql` | Room type extra fields |
| V8 | `V8__extend_inventory_future_dates.sql` | Inventory date extension |
| V9 | `V9__coupon_server_validation.sql` | Coupon validation columns |
| V10 | `V10__coupon_scope_extension.sql` | Coupon scope (city/room type) |
| V11 | `V11__tax_config.sql` | Tax configuration table |
| V12 | `V12__notification_system.sql` | Notification system enhancements |

### Core Tables (V1 Schema)

#### Users & Auth

```sql
-- users: core user record
users (
  id UUID PK,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name, last_name, phone, date_of_birth, gender,
  profile_picture_url, is_email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  role VARCHAR(50) DEFAULT 'USER',
  loyalty_tier VARCHAR(20) DEFAULT 'BRONZE',
  loyalty_points INT DEFAULT 0,
  created_at, updated_at
)

-- user_sessions: active login sessions (max 5 per user)
user_sessions (
  id UUID PK,
  user_id UUID FK → users,
  refresh_token_hash VARCHAR(255),
  device_type, device_name, browser, os,
  ip_address, city, country,
  is_active BOOLEAN DEFAULT TRUE,
  last_active TIMESTAMP,
  created_at
)

-- otp_store: OTP codes cached in Redis (not this table — legacy)
otp_store (id, email, otp_hash, purpose, expires_at, used BOOLEAN)
```

#### Hotels & Rooms

```sql
-- hotels: hotel master record
hotels (
  id UUID PK,
  name, slug UNIQUE, description, star_rating,
  city, state, country, address, latitude, longitude,
  check_in_time, check_out_time,
  cancellation_policy VARCHAR(50),
  status VARCHAR(30) DEFAULT 'ACTIVE',
  owner_id UUID FK → users,
  created_at, updated_at
)

-- room_types: room category within a hotel
room_types (
  id UUID PK,
  hotel_id UUID FK → hotels,
  name, description, base_price DECIMAL,
  max_adults, max_children, max_occupancy,
  size_sqft, bed_type, view_type,
  is_active BOOLEAN DEFAULT TRUE
)

-- rooms: individual physical rooms
rooms (
  id UUID PK,
  room_type_id UUID FK → room_types,
  room_number VARCHAR(20),
  floor INT,
  status VARCHAR(30) DEFAULT 'AVAILABLE'
)

-- room_inventory: availability per date
room_inventory (
  id UUID PK,
  room_type_id UUID FK → room_types,
  date DATE,
  available_count INT DEFAULT 0,
  booked_count INT DEFAULT 0,
  UNIQUE (room_type_id, date)
)
```

#### Bookings

```sql
-- bookings: booking lifecycle record
bookings (
  id UUID PK,
  booking_reference VARCHAR(20) UNIQUE,
  user_id UUID FK → users,
  hotel_id UUID FK → hotels,
  room_type_id UUID FK → room_types,
  status VARCHAR(30),           -- PAYMENT_PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW
  check_in DATE, check_out DATE,
  total_nights INT,
  adults INT, children INT, infants INT,
  base_amount DECIMAL, tax_amount DECIMAL,
  discount_amount DECIMAL, total_amount DECIMAL,
  coupon_code VARCHAR(50),
  special_requests TEXT,
  source VARCHAR(30),           -- WEB, MOBILE, ADMIN
  ip_address VARCHAR(45),
  cancelled_at, cancellation_reason,
  refund_amount DECIMAL,
  created_at, updated_at
)

-- booking_guests: guest details per booking
booking_guests (
  id UUID PK,
  booking_id UUID FK → bookings,
  first_name, last_name, email, phone,
  id_type VARCHAR(30), id_number VARCHAR(50),
  is_primary BOOLEAN DEFAULT FALSE
)

-- booking_add_ons: extras added to booking
booking_add_ons (
  id UUID PK,
  booking_id UUID FK → bookings,
  add_on_type VARCHAR(50),      -- BREAKFAST, AIRPORT_TRANSFER, SPA, etc.
  quantity INT,
  unit_price DECIMAL,
  total_price DECIMAL
)
```

#### Payments

```sql
-- payments: Stripe payment intent tracking
payments (
  id UUID PK,
  booking_id UUID FK → bookings,
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  payment_type VARCHAR(30),     -- FULL, PARTIAL, DEPOSIT
  amount DECIMAL, currency VARCHAR(10),
  status VARCHAR(30),           -- PENDING, SUCCEEDED, FAILED, REFUNDED
  failure_reason TEXT,
  paid_at TIMESTAMP,
  created_at
)

-- refunds: refund tracking
refunds (
  id UUID PK,
  booking_id UUID FK → bookings,
  payment_id UUID FK → payments,
  stripe_refund_id VARCHAR(255),
  amount DECIMAL,
  reason TEXT,
  status VARCHAR(30),           -- PROCESSING, SUCCEEDED, FAILED
  initiated_by UUID,
  initiated_by_role VARCHAR(30),
  processed_at TIMESTAMP,
  created_at
)
```

#### Notifications (V1 + V12)

```sql
-- notifications: in-app notification records
notifications (
  id UUID PK,
  user_id UUID FK → users,
  type VARCHAR(50),             -- BOOKING, PAYMENT, REMINDER, OFFER, SYSTEM, SECURITY
  title VARCHAR(255),
  message TEXT,
  action_url VARCHAR(500),      -- Added in V12
  expires_at TIMESTAMP,         -- Added in V12
  category VARCHAR(50),         -- Added in V12
  status VARCHAR(20),           -- UNREAD, READ, ARCHIVED
  reference_id VARCHAR(255),
  reference_type VARCHAR(50),
  read_at TIMESTAMP,
  channel VARCHAR(30),          -- IN_APP, EMAIL, PUSH
  created_at
)

-- campaigns: promotional email campaigns (V12)
campaigns (
  id UUID PK,
  name, subject, body TEXT,
  cta_text, cta_url, discount_code,
  expires_at TIMESTAMP,
  status VARCHAR(30),           -- DRAFT, SCHEDULED, SENDING, SENT, CANCELLED
  target_type VARCHAR(50),      -- ALL, CITY, SPECIFIC, CONDITION
  target_cities TEXT,
  target_user_ids TEXT,
  target_condition VARCHAR(100),
  condition_value VARCHAR(100),
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  total_sent INT,
  created_by UUID,
  created_at, updated_at
)

-- email_verification_reminders: tracks 24h/48h/72h reminders (V12)
email_verification_reminders (
  id UUID PK,
  user_id UUID FK → users,
  reminder_count INT DEFAULT 0,
  last_sent_at TIMESTAMP,
  next_send_at TIMESTAMP,
  completed BOOLEAN DEFAULT FALSE,
  created_at
)

-- booking_reminder_log: tracks which abandoned booking reminders sent (V12)
booking_reminder_log (
  id UUID PK,
  booking_id UUID FK → bookings,
  reminder_number INT,
  sent_at TIMESTAMP,
  UNIQUE (booking_id, reminder_number)
)
```

### Key Indexes

```sql
-- Notification pagination
CREATE INDEX idx_notif_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notif_user_status ON notifications(user_id, status);

-- Campaign scheduling
CREATE INDEX idx_campaigns_scheduled ON campaigns(scheduled_at) WHERE status = 'SCHEDULED';

-- Email verification reminders
CREATE INDEX idx_evr_next_send ON email_verification_reminders(next_send_at) WHERE completed = FALSE;
```

---

## 6. Authentication & Session System

### Overview

The system uses **stateless JWT authentication** with **refresh token rotation**. Sessions are tracked in the `user_sessions` table (max 5 per user). OAuth2 (Google) is also supported.

### JWT Token Structure

**Access Token** (15-minute expiry):
```json
{
  "sub": "<userId>",
  "email": "user@example.com",
  "role": "USER",
  "roles": ["USER"],
  "type": "ACCESS",
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Refresh Token** (30-day expiry):
```json
{
  "sub": "<userId>",
  "sessionId": "<sessionId>",
  "type": "REFRESH",
  "iat": 1234567890,
  "exp": 1237159890
}
```

### Authentication Flow

```
1. POST /api/v1/auth/register
   → Creates user (unverified), sends OTP email, schedules verification reminders

2. POST /api/v1/auth/verify-email  { identifier, otp }
   → Verifies OTP, marks email verified, cancels reminders, sends welcome email
   → Returns AuthResponse (access + refresh tokens) — user is logged in immediately

3. POST /api/v1/auth/login  { email, password }
   → Validates credentials, creates UserSession, returns tokens
   → Detects new device → sends security alert email

4. POST /api/v1/auth/refresh  { refreshToken }
   → Validates refresh token, rotates session (old invalidated, new created)
   → Returns new access + refresh tokens

5. POST /api/v1/auth/logout  ?sessionId=<id>
   → Deactivates specific session (or all if no sessionId)

6. POST /api/v1/auth/forgot-password  { email }
   → Generates OTP, sends password reset email

7. POST /api/v1/auth/reset-password  { email, otp, newPassword }
   → Verifies OTP, updates password hash, invalidates ALL sessions
```

### Session Management

- **Max 5 concurrent sessions** per user
- When limit reached, the **oldest session** (by `lastActive`) is evicted
- Refresh token is stored as a **bcrypt hash** in `user_sessions.refresh_token_hash`
- Session stores: `deviceType`, `deviceName`, `browser`, `os`, `ipAddress`, `city`, `country`

### OTP Service

OTPs are stored in **Redis** with a 10-minute TTL:
- Key format: `otp:<email>:<purpose>`
- Purposes: `EMAIL_VERIFY`, `PASSWORD_RESET`
- OTP is a 6-digit numeric code

### Security Filter Chain

Defined in [`SecurityConfig.java`](backend/src/main/java/com/makemycrip/common/config/SecurityConfig.java):

| Path Pattern | Access |
|---|---|
| `POST /api/v1/auth/**` | Public |
| `GET /oauth2/**` | Public |
| `GET /api/v1/hotels/**` | Public |
| `POST /api/v1/webhooks/**` | Public (Stripe signature verified) |
| `/ws/**` | Public (WebSocket handshake) |
| `/swagger-ui/**`, `/v3/api-docs/**` | Public |
| `/actuator/health` | Public |
| `ALL /api/v1/admin/**` | Requires `ADMIN` or `HOTEL_MANAGER` role |
| `ALL /api/v1/notifications/**` | Requires authentication |
| All other requests | Requires authentication |

### JWT Filter

[`JwtAuthenticationFilter`](backend/src/main/java/com/makemycrip/auth/security/JwtAuthenticationFilter.java) runs before `UsernamePasswordAuthenticationFilter`:
1. Extracts `Authorization: Bearer <token>` header
2. Validates token signature and expiry
3. Sets `SecurityContextHolder` with `UsernamePasswordAuthenticationToken`
4. Principal is the `userId` string (UUID)

### Rate Limiting

[`RateLimitingFilter`](backend/src/main/java/com/makemycrip/common/config/RateLimitingFilter.java) uses **Bucket4j** token-bucket algorithm:
- Applied to auth endpoints to prevent brute-force attacks
- Returns `429 Too Many Requests` with `Retry-After` header when exceeded

---

## 7. API Reference

Base URL: `http://localhost:8081/api/v1`

Interactive docs: `http://localhost:8081/swagger-ui.html`

### Authentication Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register new user |
| `POST` | `/auth/verify-email` | Public | Verify email OTP → returns tokens |
| `POST` | `/auth/login` | Public | Login with email/password |
| `POST` | `/auth/refresh` | Public | Rotate refresh token |
| `POST` | `/auth/logout` | Bearer | Logout current/all sessions |
| `POST` | `/auth/logout-all` | Bearer | Logout all sessions |
| `POST` | `/auth/forgot-password` | Public | Request password reset OTP |
| `POST` | `/auth/reset-password` | Public | Reset password with OTP |
| `POST` | `/auth/change-password` | Bearer | Change password (authenticated) |
| `GET` | `/auth/sessions` | Bearer | List active sessions |
| `DELETE` | `/auth/sessions/{sessionId}` | Bearer | Revoke specific session |

### Hotel Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/hotels` | Public | Search hotels (city, dates, guests) |
| `GET` | `/hotels/{slug}` | Public | Get hotel detail by slug |
| `GET` | `/hotels/{hotelId}/room-types` | Public | List room types for hotel |
| `GET` | `/hotels/{hotelId}/reviews` | Public | Get hotel reviews |
| `POST` | `/hotels/{hotelId}/reviews` | Bearer | Submit review |
| `GET` | `/hotels/wishlist` | Bearer | Get user wishlist |
| `POST` | `/hotels/{hotelId}/wishlist` | Bearer | Toggle wishlist |

### Booking Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/bookings/initiate` | Bearer | Initiate booking (step 1 — creates PAYMENT_PENDING) |
| `GET` | `/bookings` | Bearer | List user bookings (paginated, filterable by status) |
| `GET` | `/bookings/{bookingRef}` | Bearer | Get booking detail |
| `GET` | `/bookings/{bookingRef}/cancel/preview` | Bearer | Preview refund amount before cancellation |
| `POST` | `/bookings/{bookingRef}/cancel` | Bearer | Cancel booking |
| `GET` | `/bookings/{bookingRef}/invoice` | Bearer | Download PDF invoice |

### Payment Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/payments/booking/{bookingRef}` | Bearer | Get payment status for booking |
| `POST` | `/webhooks/stripe` | Public | Stripe webhook receiver |

### Notification Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/notifications` | Bearer | Get paginated notifications (filter by `type`, `page`, `size`) |
| `GET` | `/notifications/unread-count` | Bearer | Get unread notification count |
| `PATCH` | `/notifications/{id}/read` | Bearer | Mark single notification as read |
| `PATCH` | `/notifications/read-all` | Bearer | Mark all notifications as read |
| `DELETE` | `/notifications/{id}` | Bearer | Delete a notification |

### User Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/users/profile` | Bearer | Get own profile |
| `PUT` | `/users/profile` | Bearer | Update profile |
| `POST` | `/users/profile/picture` | Bearer | Upload profile picture |

### Admin Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/users` | ADMIN | List all users |
| `GET` | `/admin/hotels` | ADMIN | List all hotels |
| `POST` | `/admin/hotels` | ADMIN | Create hotel |
| `PUT` | `/admin/hotels/{id}` | ADMIN | Update hotel |
| `GET` | `/admin/bookings` | ADMIN | List all bookings |
| `GET` | `/admin/campaigns` | ADMIN | List campaigns |
| `POST` | `/admin/campaigns` | ADMIN | Create campaign |
| `POST` | `/admin/campaigns/{id}/send` | ADMIN | Send/trigger campaign immediately |
| `POST` | `/admin/campaigns/{id}/cancel` | ADMIN | Cancel scheduled campaign |
| `GET` | `/admin/audit-logs` | ADMIN | View admin audit log |

### Standard Response Envelope

All endpoints return a consistent `ApiResponse<T>` wrapper:

```json
{
  "success": true,
  "status": 200,
  "message": "Bookings fetched successfully",
  "data": { ... },
  "timestamp": "2026-05-07T06:00:00",
  "path": "/api/v1/bookings"
}
```

Error responses include optional `errors` array for validation failures:

```json
{
  "success": false,
  "status": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "checkIn", "rejectedValue": "2020-01-01", "message": "must be a future date" }
  ],
  "timestamp": "2026-05-07T06:00:00",
  "path": "/api/v1/bookings/initiate"
}
```

---

## 8. Module Breakdown

### Auth Module

**Package:** `com.makemycrip.auth`

| Class | Responsibility |
|---|---|
| [`AuthController`](backend/src/main/java/com/makemycrip/auth/controller/AuthController.java) | REST endpoints for all auth operations |
| [`AuthService`](backend/src/main/java/com/makemycrip/auth/service/AuthService.java) | Core auth logic: register, login, token refresh, session management |
| [`OtpService`](backend/src/main/java/com/makemycrip/auth/service/OtpService.java) | OTP generation and verification via Redis |
| [`JwtTokenProvider`](backend/src/main/java/com/makemycrip/auth/security/JwtTokenProvider.java) | JWT creation, parsing, and validation using jjwt 0.12.5 |
| [`JwtAuthenticationFilter`](backend/src/main/java/com/makemycrip/auth/security/JwtAuthenticationFilter.java) | Spring Security filter — extracts JWT from `Authorization` header |
| [`GeoLocationService`](backend/src/main/java/com/makemycrip/auth/service/GeoLocationService.java) | IP → city/country lookup for session metadata |
| [`UserAgentParser`](backend/src/main/java/com/makemycrip/auth/service/UserAgentParser.java) | Parses `User-Agent` header → browser, OS, device type |

**Key behaviors:**
- On `register`: user created (unverified), OTP sent, email verification reminders scheduled at +24h/+48h/+72h
- On `verifyEmail`: OTP validated, reminders cancelled, welcome email sent, session created and tokens returned
- On `login`: new-device detection → security alert email if IP not seen before
- On `resetPassword`: all sessions invalidated after password change

### Booking Module

**Package:** `com.makemycrip.booking`

| Class | Responsibility |
|---|---|
| [`BookingController`](backend/src/main/java/com/makemycrip/booking/controller/BookingController.java) | REST endpoints for booking lifecycle |
| [`BookingService`](backend/src/main/java/com/makemycrip/booking/service/BookingService.java) | Core booking logic: initiate, cancel, list, detail |
| [`BookingSchedulerService`](backend/src/main/java/com/makemycrip/booking/service/BookingSchedulerService.java) | Scheduled jobs: check-in reminders, review requests, abandoned booking reminders |
| [`PdfInvoiceService`](backend/src/main/java/com/makemycrip/booking/service/PdfInvoiceService.java) | Generates PDF invoices using iText 8 |

**Booking Lifecycle:**

```
PAYMENT_PENDING → (Stripe webhook payment.succeeded) → CONFIRMED
                → (Stripe webhook payment.failed)    → PAYMENT_FAILED
CONFIRMED       → (user cancels)                     → CANCELLED
CONFIRMED       → (check-in date passes)             → COMPLETED (via scheduler)
CONFIRMED       → (no check-in detected)             → NO_SHOW (via scheduler)
```

**Price Lock (Redis):**
- When `initiateBooking` is called, pricing is calculated and stored in Redis with a 15-minute TTL
- Key: `price_lock:<bookingId>`
- If the price lock expires before payment, `PriceLockExpiredException` is thrown (HTTP 410 Gone)

**Add-On Prices (INR, fixed):**

| Add-On | Price |
|---|---|
| BREAKFAST | ₹350 |
| AIRPORT_TRANSFER / PICKUP / DROP | ₹800 |
| DINNER | ₹600 |
| SPA | ₹1,500 |
| EXTRA_BED | ₹1,000 |
| BICYCLE_RENTAL | ₹200 |
| LAUNDRY | ₹300 |

**Cancellation Refund Policy:**

Refund percentage is determined by `CancellationPolicy` and days before check-in:
- `FLEXIBLE`: Full refund if cancelled ≥1 day before; 50% if same day
- `MODERATE`: Full refund if ≥5 days; 50% if 1–4 days; no refund same day
- `STRICT`: 50% refund if ≥7 days; no refund otherwise
- `NON_REFUNDABLE`: No refund ever

**Scheduled Jobs (`BookingSchedulerService`):**

| Cron | Job |
|---|---|
| `0 0 6 * * *` (6 AM daily) | Send check-in reminder emails for tomorrow's bookings |
| `0 0 10 * * *` (10 AM daily) | Send review request emails for yesterday's checkouts |
| `0 */30 * * * *` (every 30 min) | Mark CONFIRMED bookings as COMPLETED if check-out passed |
| `0 */5 * * * *` (every 5 min) | Send abandoned booking reminders (3 reminders: 30min, 2h, 24h) |

### Hotel Module

**Package:** `com.makemycrip.hotel`

Key entities: `Hotel`, `RoomType`, `Room`, `RoomInventory`, `PricingRule`, `Promotion`, `CouponCode`, `Review`, `Wishlist`

The hotel search supports filtering by:
- `city` (required)
- `checkIn` / `checkOut` dates
- `adults`, `children`
- `minPrice` / `maxPrice`
- `starRating`
- `amenities`

### Pricing Engine

**Package:** `com.makemycrip.pricing`

[`PricingEngineService`](backend/src/main/java/com/makemycrip/pricing/engine/PricingEngineService.java) calculates the final price given a `PricingContext`:

1. Fetches base price from `room_types.base_price`
2. Applies `pricing_rules` (date-range overrides, weekend surcharges, occupancy-based pricing)
3. Applies loyalty tier discount (BRONZE: 0%, SILVER: 5%, GOLD: 10%, PLATINUM: 15%)
4. Applies coupon code discount (if provided)
5. Calculates tax (from `tax_config` table — V11)
6. Returns `PricingResult` with itemized breakdown

### User Module

**Package:** `com.makemycrip.user`

**Loyalty Tiers:**

| Tier | Points Required | Discount |
|---|---|---|
| BRONZE | 0 | 0% |
| SILVER | 500 | 5% |
| GOLD | 2000 | 10% |
| PLATINUM | 5000 | 15% |

Points are awarded on booking completion. Tier is upgraded automatically in `BookingService.updateLoyaltyTier()`.

**User Roles:**

| Role | Access |
|---|---|
| `USER` | Standard customer — can book, review, manage profile |
| `HOTEL_MANAGER` | Can manage their own hotel(s) via admin endpoints |
| `ADMIN` | Full access to all admin endpoints |

### Promotion Module

**Package:** `com.makemycrip.promotion`

`CouponService` validates coupon codes with:
- Expiry date check
- Usage limit check (per coupon and per user)
- Scope validation: `ALL`, `CITY`, `ROOM_TYPE`, `HOTEL`
- Minimum booking amount check
- Returns discount amount or percentage

### Admin Audit Module

**Package:** `com.makemycrip.common.audit`

[`AuditService`](backend/src/main/java/com/makemycrip/common/audit/AuditService.java) logs all admin actions to `admin_audit_logs` table:
- `adminId`, `action`, `entityType`, `entityId`, `details`, `ipAddress`, `timestamp`

---

## 9. Payment Integration (Stripe)

### Overview

Payments use **Stripe PaymentIntents** with the `@stripe/stripe-js` + `@stripe/react-stripe-js` frontend library. The backend creates a PaymentIntent and returns the `clientSecret` to the frontend, which then confirms the payment directly with Stripe.

### Payment Flow

```
1. Frontend: POST /api/v1/bookings/initiate
   ← Returns BookingResponse with clientSecret (from Stripe PaymentIntent)

2. Frontend: Stripe.confirmCardPayment(clientSecret, { payment_method: { card } })
   ← Stripe processes payment directly

3. Stripe → Backend: POST /api/v1/webhooks/stripe
   Event: payment_intent.succeeded
   → PaymentService.handlePaymentSucceeded()
   → Booking status → CONFIRMED
   → NotificationDispatcher.sendBookingConfirmation()
   → NotificationDispatcher.sendPaymentSuccessNotification()

   Event: payment_intent.payment_failed
   → PaymentService.handlePaymentFailed()
   → NotificationDispatcher.sendPaymentFailedNotification()

   Event: charge.refund.updated
   → PaymentService.handleRefundSucceeded()
```

### PaymentIntent Configuration

```java
PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
    .setAmount(amountInPaise)           // amount × 100 (INR paise)
    .setCurrency("inr")
    .setReceiptEmail(customerEmail)
    .putMetadata("bookingId", bookingId.toString())
    .setAutomaticPaymentMethods(
        AutomaticPaymentMethods.builder()
            .setEnabled(true)
            .setAllowRedirects(AllowRedirects.NEVER)  // Card-only, no redirects
            .build())
    .build();
```

### Webhook Security

The Stripe webhook endpoint at `POST /api/v1/webhooks/stripe` verifies the `Stripe-Signature` header using the webhook secret (`app.stripe.webhook-secret`). Requests with invalid signatures are rejected with `400 Bad Request`.

### Idempotency

`handlePaymentSucceeded` checks `paymentRepository.existsByStripeChargeId(chargeId)` before processing — duplicate webhook deliveries are safely ignored.

### Refund Flow

```java
// Triggered by BookingService.cancelBooking()
paymentService.processRefund(bookingId, refundAmount, reason, userId);
// → Creates Stripe Refund via API
// → Saves Refund entity with status PROCESSING
// → Stripe webhook charge.refund.updated → status SUCCEEDED
```

---

## 10. Notification System

### Architecture

The notification system has three layers:

```
NotificationDispatcher (@Async)
    ├── EmailService (Thymeleaf → JavaMailSender)
    └── NotificationService
            ├── NotificationRepository (PostgreSQL)
            └── SimpMessagingTemplate (WebSocket push)
```

### NotificationDispatcher

[`NotificationDispatcher`](backend/src/main/java/com/makemycrip/notification/service/NotificationDispatcher.java) is the single entry point for all notification dispatch. Every method is `@Async` — it never blocks the calling thread.

| Method | Email Template | In-App Created |
|---|---|---|
| `sendOtpEmail()` | `email-otp-verify` / `email-otp-reset` | No |
| `sendWelcomeEmail()` | `welcome` | No |
| `sendPasswordChangedEmail()` | `security-alert` | No |
| `sendNewDeviceLoginAlert()` | `new-device-login` | No |
| `sendBookingConfirmation()` | `booking-confirmation` | Yes (BOOKING) |
| `sendCancellationEmail()` | `booking-cancellation` | Yes (BOOKING) |
| `sendCheckInReminder()` | `check-in-reminder` | No |
| `sendReviewRequest()` | `review-request` | No |
| `sendAbandonedBookingEmail()` | `abandoned-booking` | Yes (REMINDER) |
| `sendPaymentSuccessNotification()` | — | Yes (PAYMENT) |
| `sendPaymentFailedNotification()` | — | Yes (PAYMENT) |
| `sendRefundNotification()` | — | Yes (PAYMENT) |
| `sendRoomUpgradeEmail()` | `room-upgrade` | No |
| `sendLoyaltyPointsEmail()` | `loyalty-tier-upgrade` | No |
| `sendWaitlistNotification()` | `waitlist-available` | No |
| `sendEmailVerificationReminder()` | `email-otp-verify` | No |
| `sendCampaignEmail()` | `promotional-offer` | Yes (OFFER) |

### NotificationService

[`NotificationService`](backend/src/main/java/com/makemycrip/notification/service/NotificationService.java) handles CRUD for in-app notifications:

```java
// Create + WebSocket push
NotificationDto create(CreateNotificationRequest req)

// Paginated fetch with optional type filter
Page<NotificationDto> getNotifications(UUID userId, String type, int page, int size)

// Unread count
long getUnreadCount(UUID userId)

// Mark single as read
void markRead(UUID userId, UUID notificationId)

// Mark all as read (bulk update)
int markAllRead(UUID userId)

// Delete
void delete(UUID userId, UUID notificationId)
```

After saving to the database, `create()` pushes the notification via WebSocket:
```java
messagingTemplate.convertAndSendToUser(
    userId.toString(),
    "/queue/notifications",
    dto
);
```

### Notification Types

| Type | Description |
|---|---|
| `BOOKING` | Booking confirmed, cancelled |
| `PAYMENT` | Payment success, failure, refund |
| `REMINDER` | Abandoned booking, check-in reminder |
| `OFFER` | Promotional campaign notifications |
| `SYSTEM` | System-level messages |
| `SECURITY` | New device login, password changes |

### WebSocket Configuration

[`WebSocketConfig`](backend/src/main/java/com/makemycrip/common/config/WebSocketConfig.java):

```
STOMP Endpoint:  /ws  (with SockJS fallback)
App prefix:      /app
User prefix:     /user
Broker:          /topic, /queue (in-memory SimpleBroker)
```

Frontend subscribes to: `/user/{userId}/queue/notifications`

### Email Verification Reminders

[`ReminderSchedulerService`](backend/src/main/java/com/makemycrip/notification/service/ReminderSchedulerService.java) runs hourly (`0 0 * * * *`) and sends reminders to unverified users:

| Reminder | Delay After Registration |
|---|---|
| Reminder 1 | 24 hours |
| Reminder 2 | 48 hours |
| Reminder 3 | 72 hours (final warning) |

After 3 reminders, the schedule is marked `completed`. When the user verifies their email, `cancelEmailVerificationReminders()` marks it `completed` immediately.

### Campaign System

[`CampaignService`](backend/src/main/java/com/makemycrip/notification/service/CampaignService.java) manages promotional email campaigns:

**Target Types:**

| Target Type | Description |
|---|---|
| `ALL` | All active, verified users |
| `CITY` | Users who have booked in specified cities |
| `SPECIFIC` | Specific user IDs (comma-separated) |
| `CONDITION` | Users matching a condition |

**Conditions (for `CONDITION` target type):**

| Condition | Description |
|---|---|
| `LOYALTY_TIER` | Users with specific loyalty tier |
| `BOOKING_COUNT_GTE` | Users with ≥ N bookings |
| `NO_BOOKING_DAYS` | Users with no booking in last N days |
| `REGISTERED_DAYS_AGO` | Users registered N days ago |

**Campaign Statuses:** `DRAFT` → `SCHEDULED` → `SENDING` → `SENT` / `CANCELLED`

The scheduler runs every minute (`0 * * * * *`) and triggers campaigns whose `scheduled_at` has passed and status is `SCHEDULED`.

### Email Templates

All templates are Thymeleaf HTML files in [`backend/src/main/resources/templates/email/`](backend/src/main/resources/templates/email/):

| Template | Trigger |
|---|---|
| `email-otp-verify.html` | Registration OTP, email verification reminders |
| `email-otp-reset.html` | Password reset OTP |
| `welcome.html` | After email verification |
| `security-alert.html` | Password changed |
| `new-device-login.html` | Login from new IP |
| `booking-confirmation.html` | Booking confirmed |
| `booking-cancellation.html` | Booking cancelled |
| `check-in-reminder.html` | Day before check-in |
| `review-request.html` | Day after checkout |
| `abandoned-booking.html` | Incomplete payment reminders |
| `payment-success.html` | Payment succeeded |
| `payment-failed.html` | Payment failed |
| `refund-confirmation.html` | Refund initiated |
| `room-upgrade.html` | Complimentary room upgrade |
| `loyalty-tier-upgrade.html` | Loyalty points earned / tier upgrade |
| `no-show.html` | No-show notification |
| `promotional-offer.html` | Campaign emails |
| `booking-reminder.html` | General booking reminder |

---

## 11. File Uploads

### Configuration

```yaml
app:
  upload:
    base-dir: uploads/
spring:
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 50MB
```

### Storage Structure

Files are stored on the local filesystem under `backend/uploads/`:

```
uploads/
└── hotels/
    └── {hotelId}/
        ├── {uuid}_{filename}.jpg       # Hotel images
        └── room-types/
            └── {roomTypeId}/
                └── {uuid}_{filename}.jpg   # Room type images
```

### Upload Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/admin/hotels/{hotelId}/images` | Upload hotel image |
| `DELETE` | `/admin/hotels/{hotelId}/images/{imageId}` | Delete hotel image |
| `POST` | `/admin/hotels/{hotelId}/room-types/{rtId}/images` | Upload room type image |
| `POST` | `/users/profile/picture` | Upload user profile picture |

### Serving Static Files

Static files are served via Spring MVC's resource handler configured in [`WebMvcConfig`](backend/src/main/java/com/makemycrip/common/config/WebMvcConfig.java):

```
GET /uploads/**  →  backend/uploads/
```

---

## 12. Error Handling

### Exception Hierarchy

All custom exceptions extend `BaseException`:

```
BaseException (RuntimeException)
├── ResourceNotFoundException      → 404 Not Found
├── DuplicateResourceException     → 409 Conflict
├── BusinessLogicException         → 422 Unprocessable Entity
├── BookingConflictException       → 409 Conflict
├── InventoryUnavailableException  → 409 Conflict
├── PriceLockExpiredException      → 410 Gone
├── PaymentException               → 402 Payment Required
└── RateLimitExceededException     → 429 Too Many Requests
```

### GlobalExceptionHandler

[`GlobalExceptionHandler`](backend/src/main/java/com/makemycrip/common/exception/GlobalExceptionHandler.java) (`@RestControllerAdvice`) handles all exceptions:

| Exception | HTTP Status | Notes |
|---|---|---|
| `MethodArgumentNotValidException` | 400 | Bean Validation failures — includes field-level errors |
| `ConstraintViolationException` | 400 | Path/query param validation failures |
| `HttpMessageNotReadableException` | 400 | Malformed JSON body |
| `MethodArgumentTypeMismatchException` | 400 | Wrong parameter type |
| `NoHandlerFoundException` | 404 | Route not found |
| `HttpRequestMethodNotSupportedException` | 405 | Wrong HTTP method |
| `ResourceNotFoundException` | 404 | Entity not found |
| `BusinessLogicException` | 422 | Business rule violation |
| `DuplicateResourceException` | 409 | Duplicate email, etc. |
| `BookingConflictException` | 409 | Booking overlap |
| `InventoryUnavailableException` | 409 | No rooms available |
| `PriceLockExpiredException` | 410 | Price lock TTL expired |
| `PaymentException` | 402 | Stripe error |
| `AuthenticationException` | 401 | Invalid/missing JWT |
| `AccessDeniedException` | 403 | Insufficient role |
| `RateLimitExceededException` | 429 | Rate limit hit (includes `Retry-After` header) |
| `DataIntegrityViolationException` | 409 | DB constraint violation |
| `Exception` (catch-all) | 500 | Unexpected error |

### Correlation IDs

[`CorrelationIdFilter`](backend/src/main/java/com/makemycrip/common/logging/CorrelationIdFilter.java) generates a UUID correlation ID for every request and stores it in MDC (`correlationId`). All log messages include `[correlationId]` for request tracing.

### Request Logging

[`RequestLoggingInterceptor`](backend/src/main/java/com/makemycrip/common/logging/RequestLoggingInterceptor.java) logs method, URI, status code, and duration for every request.

---

## 13. Testing Guide

### Test Stack

- **Spring Boot Test** — `@SpringBootTest` for integration tests
- **Testcontainers** — spins up real PostgreSQL and Redis containers
- **REST Assured** — fluent HTTP API testing
- **JUnit 5** — test framework
- **JaCoCo** — code coverage (minimum 60% line coverage enforced at build time)

### Running Tests

```bash
# Run all tests
cd backend && mvn test

# Run with coverage report
cd backend && mvn verify

# Coverage report location
backend/target/site/jacoco/index.html
```

### Test Configuration

Tests use Testcontainers to spin up isolated PostgreSQL and Redis instances — no external services needed.

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class BookingIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7").withExposedPorts(6379);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
    }
}
```

### Coverage Enforcement

JaCoCo is configured in `pom.xml` to fail the build if line coverage drops below 60%:

```xml
<rule>
  <element>BUNDLE</element>
  <limits>
    <limit>
      <counter>LINE</counter>
      <value>COVEREDRATIO</value>
      <minimum>0.60</minimum>
    </limit>
  </limits>
</rule>
```

---

## 14. Deployment & Developer Workflow

### Prerequisites

| Tool | Version |
|---|---|
| Java | 21 (JDK) |
| Maven | 3.9+ |
| PostgreSQL | 15+ |
| Redis | 7+ |
| Node.js | 18+ (for frontend) |

### Local Development Setup

#### 1. Start Infrastructure (Docker Compose)

```bash
# Start PostgreSQL + Redis
docker-compose up -d postgres redis
```

`docker-compose.yml` at project root provides PostgreSQL on port 5432 and Redis on port 6379.

#### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```bash
# Database
DB_URL=jdbc:postgresql://localhost:5432/makemycrip
DB_USERNAME=postgres
DB_PASSWORD=yourpassword

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-256-bit-base64-secret

# Email (Gmail)
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=your-app-password

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google OAuth2
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

#### 3. Build & Run Backend

```bash
cd backend

# Build JAR (skip tests for speed)
mvn clean package -DskipTests

# Run
java -jar target/makemycrip-backend-1.0.0.jar

# Or run directly with Maven
mvn spring-boot:run
```

Backend starts on **http://localhost:8081**

#### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts on **http://localhost:5173** with Vite proxy forwarding `/api` and `/ws` to `http://localhost:8081`.

### Build Artifacts

```bash
# Production build
cd backend && mvn clean package

# Output: backend/target/makemycrip-backend-1.0.0.jar
```

### Docker Deployment

```bash
# Build backend image
docker build -t makemycrip-backend ./backend

# Build frontend image
docker build -t makemycrip-frontend ./frontend

# Production stack
docker-compose -f docker-compose.prod.yml up -d
```

### Flyway Migrations

Migrations run automatically on startup. To run manually:

```bash
cd backend && mvn flyway:migrate
```

To check migration status:

```bash
cd backend && mvn flyway:info
```

### Swagger / OpenAPI

Interactive API documentation is available at:

```
http://localhost:8081/swagger-ui.html
http://localhost:8081/v3/api-docs        (JSON)
http://localhost:8081/v3/api-docs.yaml   (YAML)
```

### Health Check

```
GET http://localhost:8081/actuator/health
→ { "status": "UP" }
```

### Useful Development Commands

```bash
# Check backend logs (if running as JAR)
tail -f backend/backend.log

# Rebuild and restart backend
cd backend && mvn clean package -DskipTests && java -jar target/makemycrip-backend-1.0.0.jar

# Run a specific test class
cd backend && mvn test -Dtest=BookingServiceTest

# Generate coverage report
cd backend && mvn verify && start target/site/jacoco/index.html

# Frontend type check
cd frontend && npx tsc --noEmit

# Frontend production build
cd frontend && npm run build
```

### Common Issues & Solutions

| Issue | Cause | Fix |
|---|---|---|
| `Flyway migration failed` | Schema mismatch | Run `mvn flyway:repair` then `mvn flyway:migrate` |
| `Redis connection refused` | Redis not running | `docker-compose up -d redis` |
| `JWT signature invalid` | Wrong secret in config | Ensure `app.jwt.secret` is consistent |
| `Stripe webhook 400` | Wrong webhook secret | Update `app.stripe.webhook-secret` to match Stripe dashboard |
| `CORS error from frontend` | Wrong allowed origin | Update `app.cors.allowed-origins` in `application.yml` |
| `WebSocket connection failed` | Vite proxy not configured | Ensure `vite.config.ts` has `/ws` proxy with `ws: true` |
| `OTP expired` | Redis TTL passed | OTPs expire in 10 minutes — request a new one |
| `Price lock expired` | 15-min checkout timeout | Re-initiate booking to get fresh price lock |

---

*Last updated: May 2026 — MakeMyCrip Backend v1.0.0*