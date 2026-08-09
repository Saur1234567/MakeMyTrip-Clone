# MakeMyCrip API Test Documentation

Base URL: `http://localhost:8081`  
All authenticated requests require: `Authorization: Bearer <accessToken>`

---

## 1. AUTH APIs

### 1.1 Register
```
POST /api/v1/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "Password@123"
}
```
**Expected:** `200 OK`
```json
{ "success": true, "message": "Registration successful. Please verify your email." }
```

---

### 1.2 Verify Email (OTP)
```
POST /api/v1/auth/verify-email
Content-Type: application/json

{
  "identifier": "john.doe@example.com",
  "otp": "123456"
}
```
**Expected:** `200 OK`
```json
{ "success": true, "message": "Email verified successfully." }
```

---

### 1.3 Login
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@makemycrip.com",
  "password": "Password@123"
}
```
**Expected:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "00000000-0000-0000-0000-000000000001",
      "email": "admin@makemycrip.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "ADMIN",
      "roles": ["ADMIN", "HOTEL_MANAGER", "USER"],
      "loyaltyTier": "PLATINUM",
      "isEmailVerified": true
    }
  }
}
```

---

### 1.4 Refresh Token
```
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refreshToken>"
}
```
**Expected:** `200 OK` — new `accessToken` + `refreshToken`

---

### 1.5 Logout
```
POST /api/v1/auth/logout
Authorization: Bearer <accessToken>
```
**Expected:** `200 OK`

---

### 1.6 Forgot Password
```
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "john.doe@example.com"
}
```
**Expected:** `200 OK` — OTP sent to email

---

### 1.7 Reset Password
```
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "identifier": "john.doe@example.com",
  "otp": "123456",
  "newPassword": "NewPassword@456"
}
```
**Expected:** `200 OK`

---

## 2. USER APIs

### 2.1 Get Profile
```
GET /api/v1/users/profile
Authorization: Bearer <accessToken>
```
**Expected:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "user@makemycrip.com",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+919876543210",
    "loyaltyTier": "SILVER",
    "loyaltyPoints": 1500,
    "role": "USER",
    "roles": ["USER"]
  }
}
```

---

### 2.2 Update Profile
```
PUT /api/v1/users/profile
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Updated",
  "phone": "+919876543210",
  "dateOfBirth": "1995-06-15",
  "gender": "MALE",
  "nationality": "Indian"
}
```
**Expected:** `200 OK` — updated profile

---

### 2.3 Get Sessions
```
GET /api/v1/auth/sessions
Authorization: Bearer <accessToken>
```
**Expected:** `200 OK` — list of active sessions

---

### 2.4 Revoke Session
```
DELETE /api/v1/auth/sessions/{sessionId}
Authorization: Bearer <accessToken>
```
**Expected:** `200 OK`

---

## 3. HOTEL SEARCH APIs

### 3.1 Search Hotels
```
GET /api/v1/hotels/search?city=Mumbai&checkIn=2026-06-01&checkOut=2026-06-03&adults=2&page=0&size=12&sortBy=popularity
```
**Expected:** `200 OK`
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "...",
        "name": "Grand Hyatt Mumbai",
        "slug": "grand-hyatt-mumbai",
        "city": "Mumbai",
        "locality": "Bandra Kurla Complex",
        "starRating": 5,
        "rating": 8.7,
        "reviewCount": 342,
        "basePrice": 8500,
        "discountedPrice": 7225,
        "taxAmount": 1300,
        "freeCancellation": true,
        "amenities": ["FREE_WIFI", "SWIMMING_POOL", "GYM"],
        "minAvailableRooms": 5
      }
    ],
    "totalElements": 24,
    "totalPages": 2,
    "page": 0,
    "size": 12
  }
}
```

---

### 3.2 Search with Filters
```
GET /api/v1/hotels/search?city=Goa&checkIn=2026-06-01&checkOut=2026-06-03&adults=2&minPrice=2000&maxPrice=10000&starRatings=4,5&freeCancellation=true&amenities=FREE_WIFI,SWIMMING_POOL&hotelType=RESORT&sortBy=price_asc
```

---

### 3.3 Get Hotel Detail
```
GET /api/v1/hotels/{city}/{slug}
```
Example:
```
GET /api/v1/hotels/mumbai/grand-hyatt-mumbai?checkIn=2026-06-01&checkOut=2026-06-03&adults=2
```
**Expected:** `200 OK` — full hotel detail with room types, amenities, reviews

---

### 3.4 Get Hotel by ID
```
GET /api/v1/hotels/{hotelId}
```

---

### 3.5 City Autocomplete (Nominatim — frontend only)
```
GET https://nominatim.openstreetmap.org/search?q=Mum&countrycodes=in&featuretype=city&format=json&limit=6
```
**Expected:** Array of city objects — frontend extracts `display_name.split(',')[0]`

---

### 3.6 Reverse Geocode (Geolocation — frontend only)
```
GET https://nominatim.openstreetmap.org/reverse?lat=19.0760&lon=72.8777&format=json
```
**Expected:** `address.city` = "Mumbai"

---

## 4. WISHLIST APIs

### 4.1 Toggle Wishlist
```
POST /api/v1/hotels/{hotelId}/wishlist
Authorization: Bearer <accessToken>
```
**Expected:** `200 OK` — `{ "wishlisted": true }` or `{ "wishlisted": false }`

---

### 4.2 Get Wishlist
```
GET /api/v1/users/wishlist
Authorization: Bearer <accessToken>
```

---

## 5. BOOKING APIs

### 5.1 Initiate Booking
```
POST /api/v1/bookings
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "hotelId": "...",
  "roomTypeId": "...",
  "checkIn": "2026-06-01",
  "checkOut": "2026-06-03",
  "adults": 2,
  "children": 0,
  "specialRequests": "High floor room preferred"
}
```
**Expected:** `201 Created`
```json
{
  "success": true,
  "data": {
    "bookingId": "...",
    "bookingRef": "MMC-2026-ABCD",
    "status": "PENDING",
    "totalAmount": 17050,
    "expiresAt": "2026-05-04T20:30:00"
  }
}
```

---

### 5.2 Confirm Booking (after payment)
```
POST /api/v1/bookings/{bookingId}/confirm
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "paymentIntentId": "pi_3OxYZ..."
}
```
**Expected:** `200 OK` — booking status = `CONFIRMED`

---

### 5.3 Get My Bookings
```
GET /api/v1/bookings/my?page=0&size=10
Authorization: Bearer <accessToken>
```

---

### 5.4 Get Booking Detail
```
GET /api/v1/bookings/{bookingId}
Authorization: Bearer <accessToken>
```

---

### 5.5 Cancel Booking
```
POST /api/v1/bookings/{bookingId}/cancel
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "reason": "Change of plans"
}
```
**Expected:** `200 OK` — booking status = `CANCELLED`

---

## 6. REVIEW APIs

### 6.1 Submit Review
```
POST /api/v1/hotels/{hotelId}/reviews
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "bookingId": "...",
  "overallRating": 8.5,
  "cleanlinessRating": 9.0,
  "serviceRating": 8.0,
  "locationRating": 9.5,
  "valueRating": 7.5,
  "title": "Great stay!",
  "reviewText": "Excellent hotel with amazing views. Staff was very helpful.",
  "travelType": "BUSINESS"
}
```
**Expected:** `201 Created`

---

### 6.2 Get Hotel Reviews
```
GET /api/v1/hotels/{hotelId}/reviews?page=0&size=10
```

---

## 7. ADMIN APIs

> All admin endpoints require `Authorization: Bearer <adminToken>` with role `ADMIN` or `HOTEL_MANAGER`.

### 7.1 Dashboard Stats
```
GET /api/v1/admin/dashboard/stats
Authorization: Bearer <adminToken>
```
**Expected:** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalBookings": 1247,
    "bookingsChange": 12.5,
    "totalRevenue": 45230000,
    "revenueChange": 8.3,
    "activeHotels": 18,
    "totalGuests": 3891,
    "occupancyRate": 72.4,
    "avgBookingValue": 36270,
    "recentBookings": [...],
    "revenueByDay": [...],
    "bookingsByStatus": [...],
    "topHotels": [...]
  }
}
```

---

### 7.2 List Hotels (Admin)
```
GET /api/v1/admin/hotels?page=0&size=12
Authorization: Bearer <adminToken>
```

---

### 7.3 Create Hotel
```
POST /api/v1/admin/hotels
Authorization: Bearer <adminToken>
Content-Type: application/json

{
  "name": "The Leela Palace",
  "city": "Delhi",
  "locality": "Chanakyapuri",
  "address": "Diplomatic Enclave, Chanakyapuri, New Delhi 110023",
  "starRating": 5,
  "hotelType": "RESORT",
  "description": "An iconic luxury hotel in the heart of New Delhi's diplomatic enclave offering world-class amenities.",
  "checkInTime": "14:00",
  "checkOutTime": "12:00",
  "phone": "+911123611234",
  "email": "reservations@theleela.com",
  "basePrice": 15000
}
```
**Expected:** `201 Created` — full hotel detail DTO

---

### 7.4 Update Hotel
```
PUT /api/v1/admin/hotels/{hotelId}
Authorization: Bearer <adminToken>
Content-Type: application/json

{
  "name": "The Leela Palace New Delhi",
  "starRating": 5,
  "isFeatured": true,
  "isVerified": true
}
```

---

### 7.5 Change Hotel Status
```
PATCH /api/v1/admin/hotels/{hotelId}/status
Authorization: Bearer <adminToken>
Content-Type: application/json

{
  "status": "INACTIVE",
  "reason": "Renovation in progress"
}
```

---

### 7.6 Generate Inventory (365 days)
```
POST /api/v1/admin/hotels/{hotelId}/inventory/generate
Authorization: Bearer <adminToken>
```
**Expected:** `200 OK`

---

### 7.7 Get Hotel Inventory
```
GET /api/v1/admin/hotels/{hotelId}/inventory?from=2026-06-01&to=2026-06-14
Authorization: Bearer <adminToken>
```

---

### 7.8 List Bookings (Admin)
```
GET /api/v1/admin/bookings?page=0&size=20&status=CONFIRMED
Authorization: Bearer <adminToken>
```

---

### 7.9 Check In Booking
```
POST /api/v1/admin/bookings/{bookingId}/check-in
Authorization: Bearer <adminToken>
Content-Type: application/json

{
  "roomNumber": "501"
}
```

---

### 7.10 Check Out Booking
```
POST /api/v1/admin/bookings/{bookingId}/check-out
Authorization: Bearer <adminToken>
Content-Type: application/json

{}
```

---

### 7.11 Issue Refund
```
POST /api/v1/admin/bookings/{bookingId}/refund
Authorization: Bearer <adminToken>
Content-Type: application/json

{
  "amount": "5000",
  "reason": "Customer complaint — room not as described"
}
```

---

## 8. WALLET / LOYALTY APIs

### 8.1 Get Wallet Balance
```
GET /api/v1/users/wallet
Authorization: Bearer <accessToken>
```
**Expected:** `200 OK`
```json
{
  "success": true,
  "data": {
    "loyaltyPoints": 1500,
    "loyaltyTier": "SILVER",
    "pointsValue": 750,
    "nextTier": "GOLD",
    "pointsToNextTier": 3500
  }
}
```

---

## 9. NOTIFICATION APIs

### 9.1 Get Notifications
```
GET /api/v1/notifications?page=0&size=20
Authorization: Bearer <accessToken>
```

### 9.2 Mark as Read
```
PATCH /api/v1/notifications/{notificationId}/read
Authorization: Bearer <accessToken>
```

---

## 10. HEALTH CHECK

```
GET /actuator/health
```
**Expected:** `200 OK`
```json
{
  "status": "UP",
  "components": {
    "db": { "status": "UP" },
    "redis": { "status": "DOWN" }
  }
}
```

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin (all roles) | admin@makemycrip.com | Password@123 |
| Hotel Manager | manager@makemycrip.com | Password@123 |
| Regular User | user@makemycrip.com | Password@123 |

---

## Multi-Role Notes

A user can hold multiple roles simultaneously. The JWT `roles` array contains all roles:
```json
{
  "role": "ADMIN",
  "roles": ["ADMIN", "HOTEL_MANAGER", "USER"]
}
```
Spring Security grants `ROLE_ADMIN`, `ROLE_HOTEL_MANAGER`, and `ROLE_USER` authorities from the token.  
To assign additional roles to a user, insert into `user_roles` table:
```sql
INSERT INTO user_roles (user_id, role) VALUES ('<userId>', 'HOTEL_MANAGER');
```
