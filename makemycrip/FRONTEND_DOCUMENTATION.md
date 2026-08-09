# MakeMyCrip — Frontend Developer Reference Guide

> **Version:** 1.0.0 · **React:** 18.2 · **TypeScript:** 5.4 · **Vite:** 5.2 · **Port:** 5173

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack & Dependencies](#2-technology-stack--dependencies)
3. [Project Structure](#3-project-structure)
4. [Configuration & Environment](#4-configuration--environment)
5. [Routing & Page Map](#5-routing--page-map)
6. [State Management (Redux Toolkit)](#6-state-management-redux-toolkit)
7. [API Layer (RTK Query)](#7-api-layer-rtk-query)
8. [Authentication Flow](#8-authentication-flow)
9. [Component Reference](#9-component-reference)
10. [Notification System (Frontend)](#10-notification-system-frontend)
11. [Booking & Payment Flow](#11-booking--payment-flow)
12. [Admin Panel](#12-admin-panel)
13. [Styling System](#13-styling-system)
14. [Developer Workflow & Tooling](#14-developer-workflow--tooling)

---

## 1. Architecture Overview

MakeMyCrip's frontend is a **React 18 SPA** built with Vite, TypeScript, and Redux Toolkit. It communicates with the Spring Boot backend via REST (RTK Query + Axios) and WebSocket (STOMP over SockJS) for real-time notifications.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React 18 SPA (Vite 5)                        │
│                     http://localhost:5173                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    App.tsx (Root)                         │   │
│  │  ErrorBoundary → BrowserRouter → ToastProvider           │   │
│  │                  → AnimatedRoutes                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Public Pages│  │  User Pages  │  │    Admin Pages       │   │
│  │  Home/Search │  │  Bookings    │  │  Dashboard/Hotels    │   │
│  │  Hotel Detail│  │  Profile     │  │  Campaigns/Audit     │   │
│  │  Auth Pages  │  │  Notifs      │  │  Pricing/Promotions  │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Redux Store                             │    │
│  │  auth slice · search slice                               │    │
│  │  authApi · hotelApi · bookingApi · notificationApi       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────┐    ┌──────────────────────────────────┐   │
│  │  Axios (lib/axios)│    │  WebSocket (STOMP + SockJS)      │   │
│  │  JWT interceptor  │    │  Dynamic import in NotifBell     │   │
│  │  Token refresh    │    │  /user/{id}/queue/notifications  │   │
│  └──────────────────┘    └──────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                           │ Vite Proxy
                           ▼
              Spring Boot Backend (Port 8081)
```

### Design Principles

- **Feature-based pages**: Each route has a dedicated page component in `src/pages/`
- **RTK Query for server state**: All API calls use RTK Query endpoints with automatic caching, invalidation, and tag-based refetching
- **Axios for imperative calls**: Non-RTK calls (file uploads, PDF downloads, coupon validation) use the configured Axios instance with automatic JWT refresh
- **Framer Motion animations**: Page transitions and component animations use `AnimatePresence` + `motion` components
- **Tailwind CSS**: All styling via utility classes; no CSS modules or styled-components
- **TypeScript strict mode**: All components, hooks, and API types are fully typed
- **Global error boundary**: `ErrorBoundary` class component wraps the entire app to prevent blank white screens

---

## 2. Technology Stack & Dependencies

### Core

| Package | Version | Purpose |
|---|---|---|
| react | 18.2.0 | UI framework |
| react-dom | 18.2.0 | DOM renderer |
| typescript | 5.4.5 | Type safety |
| vite | 5.2.10 | Build tool & dev server |
| @vitejs/plugin-react | 4.2.1 | React Fast Refresh |

### Routing

| Package | Version | Purpose |
|---|---|---|
| react-router-dom | 6.23.1 | Client-side routing |

### State Management

| Package | Version | Purpose |
|---|---|---|
| @reduxjs/toolkit | 2.2.3 | Redux + RTK Query |
| react-redux | 9.1.1 | React bindings for Redux |

### HTTP & WebSocket

| Package | Version | Purpose |
|---|---|---|
| axios | 1.6.8 | HTTP client (with interceptors) |
| @stomp/stompjs | 7.3.0 | STOMP WebSocket client |
| sockjs-client | 1.6.1 | SockJS transport fallback |

### Forms & Validation

| Package | Version | Purpose |
|---|---|---|
| react-hook-form | 7.51.3 | Form state management |
| @hookform/resolvers | 3.3.4 | Zod schema integration |
| zod | 3.23.4 | Schema validation |

### UI Components

| Package | Version | Purpose |
|---|---|---|
| @radix-ui/react-* | various | Accessible headless UI primitives |
| lucide-react | 1.14.0 | Icon library |
| framer-motion | 11.1.7 | Animations & transitions |
| tailwindcss | 3.4.3 | Utility-first CSS |
| tailwind-merge | 2.3.0 | Merge Tailwind classes safely |
| class-variance-authority | 0.7.0 | Component variant system |
| tailwindcss-animate | 1.0.7 | Animation utilities |

### Payments

| Package | Version | Purpose |
|---|---|---|
| @stripe/stripe-js | 3.3.0 | Stripe.js loader |
| @stripe/react-stripe-js | 2.7.0 | React Stripe Elements |

### Maps & Charts

| Package | Version | Purpose |
|---|---|---|
| leaflet | 1.9.4 | Interactive maps |
| react-leaflet | 4.2.1 | React bindings for Leaflet |
| recharts | 2.12.5 | Charts for admin dashboard |

### Utilities

| Package | Version | Purpose |
|---|---|---|
| date-fns | 3.6.0 | Date formatting & manipulation |
| react-date-range | 2.0.1 | Date range picker |
| react-helmet-async | 2.0.4 | `<head>` management (SEO) |
| clsx | 2.1.1 | Conditional class names |

---

## 3. Project Structure

```
frontend/
├── index.html                          # Entry HTML — includes window.global polyfill
├── vite.config.ts                      # Vite config: proxy, aliases, define
├── tsconfig.json                       # TypeScript config
├── tailwind.config.ts                  # Tailwind theme (brand colors)
├── postcss.config.js                   # PostCSS (autoprefixer)
├── package.json
├── .env                                # Environment variables (VITE_API_URL)
├── nginx.conf                          # Nginx config for Docker deployment
├── Dockerfile
└── src/
    ├── main.tsx                        # React root — mounts <App> with Redux Provider
    ├── App.tsx                         # Router, ErrorBoundary, AnimatedRoutes
    ├── index.css                       # Global styles + Tailwind directives
    ├── vite-env.d.ts                   # Vite env type declarations
    │
    ├── components/
    │   ├── common/
    │   │   ├── AdminRoute.tsx          # Route guard: requires ADMIN or HOTEL_MANAGER role
    │   │   ├── ProtectedRoute.tsx      # Route guard: requires authentication
    │   │   ├── CityAutocomplete.tsx    # City search autocomplete input
    │   │   └── ToastProvider.tsx       # Global toast notification provider
    │   └── layout/
    │       ├── Layout.tsx              # Public layout: Navbar + Outlet + Footer
    │       ├── AdminLayout.tsx         # Admin layout: sidebar + Outlet
    │       ├── Navbar.tsx              # Top navigation bar with NotificationBell
    │       ├── Footer.tsx              # Site footer
    │       └── NotificationBell.tsx    # Bell icon + dropdown + WebSocket listener
    │
    ├── pages/
    │   ├── HomePage.tsx                # Landing page: search, popular cities
    │   ├── NotFoundPage.tsx            # 404 page
    │   ├── auth/
    │   │   ├── LoginPage.tsx           # Email/password login + Google OAuth2
    │   │   ├── RegisterPage.tsx        # Registration + OTP verification
    │   │   ├── ForgotPasswordPage.tsx  # Password reset flow
    │   │   └── OAuth2CallbackPage.tsx  # Google OAuth2 callback handler
    │   ├── hotel/
    │   │   ├── SearchPage.tsx          # Hotel search results with filters
    │   │   └── HotelDetailPage.tsx     # Hotel detail: rooms, reviews, map
    │   ├── booking/
    │   │   ├── BookingInitiatePage.tsx # Step 1: guest details + add-ons
    │   │   ├── BookingPaymentPage.tsx  # Step 2: payment method + coupon
    │   │   ├── BookingConfirmationPage.tsx # Step 3: confirmation + invoice
    │   │   └── PaymentComponents.tsx   # Stripe card, UPI, wallet, netbanking forms
    │   ├── user/
    │   │   ├── MyBookingsPage.tsx      # Booking list with status filter
    │   │   ├── BookingDetailPage.tsx   # Single booking detail + cancel
    │   │   ├── ProfilePage.tsx         # Edit profile, upload picture
    │   │   ├── SecurityPage.tsx        # Sessions management, change password
    │   │   ├── WalletPage.tsx          # Wallet & loyalty points
    │   │   ├── WishlistPage.tsx        # Saved hotels
    │   │   ├── ReviewsPage.tsx         # User's submitted reviews
    │   │   └── NotificationsPage.tsx   # Full notifications page with infinite scroll
    │   └── admin/
    │       ├── AdminDashboard.tsx      # Stats, charts, recent activity
    │       ├── AdminHotels.tsx         # Hotel CRUD + image upload
    │       ├── AdminRoomTypes.tsx      # Room type management
    │       ├── AdminRooms.tsx          # Individual room management
    │       ├── AdminInventory.tsx      # Room inventory calendar
    │       ├── AdminBookings.tsx       # All bookings management
    │       ├── AdminUsers.tsx          # User management
    │       ├── AdminReviews.tsx        # Review moderation
    │       ├── AdminPromotions.tsx     # Promotions & coupon codes
    │       ├── AdminPricingRules.tsx   # Dynamic pricing rules
    │       ├── AdminTaxConfig.tsx      # Tax configuration
    │       ├── AdminAuditLogs.tsx      # Admin action audit trail
    │       └── AdminCampaigns.tsx      # Promotional email campaigns
    │
    ├── store/
    │   ├── index.ts                    # Redux store configuration
    │   ├── slices/
    │   │   ├── authSlice.ts            # Auth state: user, tokens, isAuthenticated
    │   │   └── searchSlice.ts          # Search state: city, dates, guests
    │   └── api/
    │       ├── authApi.ts              # RTK Query: login, register, verify, refresh
    │       ├── hotelApi.ts             # RTK Query: search, detail, reviews, wishlist
    │       ├── bookingApi.ts           # RTK Query: initiate, list, detail, cancel, coupons
    │       └── notificationApi.ts      # RTK Query: notifications + admin campaigns
    │
    ├── hooks/
    │   └── useToast.ts                 # Toast utility (success/error/info)
    │
    └── lib/
        ├── axios.ts                    # Axios instance with JWT + refresh interceptors
        └── utils.ts                    # Utility functions (cn, formatCurrency, etc.)
```

---

## 4. Configuration & Environment

### Vite Configuration

[`frontend/vite.config.ts`](frontend/vite.config.ts):

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },  // @ → src/
  },
  define: {
    global: 'globalThis',  // Fix: sockjs-client requires 'global' in browser
  },
  optimizeDeps: {
    include: ['sockjs-client', '@stomp/stompjs'],  // Pre-bundle for ESM compatibility
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8081', changeOrigin: true },
      '/ws':  { target: 'http://localhost:8081', changeOrigin: true, ws: true },
    },
  },
})
```

**Key points:**
- `global: 'globalThis'` — required because `sockjs-client` (CJS) references `global` which doesn't exist in browsers
- `/ws` proxy has `ws: true` — required for WebSocket upgrade proxying
- `@` alias maps to `src/` — used throughout the codebase as `@/components/...`

### index.html Polyfill

[`frontend/index.html`](frontend/index.html) includes a `window.global` polyfill before the main script:

```html
<script>window.global = window.global || window;</script>
<script type="module" src="/src/main.tsx"></script>
```

This is a belt-and-suspenders fix alongside the `define: { global: 'globalThis' }` in vite config.

### Environment Variables

[`frontend/.env`](frontend/.env):

```bash
VITE_API_URL=http://localhost:8081
```

Used in [`lib/axios.ts`](frontend/src/lib/axios.ts) and RTK Query base URLs as fallback:
```typescript
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8081'
```

In production (Docker), the Nginx reverse proxy handles `/api` routing, so `VITE_API_URL` can be left empty.

### TypeScript Configuration

[`frontend/tsconfig.json`](frontend/tsconfig.json) — strict mode enabled:
- `"strict": true`
- `"paths": { "@/*": ["./src/*"] }` — mirrors the Vite alias

---

## 5. Routing & Page Map

All routing is defined in [`frontend/src/App.tsx`](frontend/src/App.tsx) using React Router v6.

### Route Structure

```
/                           → HomePage (public)
/hotels/search              → SearchPage (public)
/hotels/:city/:slug         → HotelDetailPage (public)
/auth/login                 → LoginPage (public)
/auth/register              → RegisterPage (public)
/auth/forgot-password       → ForgotPasswordPage (public)
/auth/oauth2/callback       → OAuth2CallbackPage (public)

── Protected (requires login) ──────────────────────────────────
/booking/initiate           → BookingInitiatePage
/booking/payment            → BookingPaymentPage
/booking/confirmation       → BookingConfirmationPage
/user/bookings              → MyBookingsPage
/user/bookings/:bookingRef  → BookingDetailPage
/user/profile               → ProfilePage
/user/security              → SecurityPage
/user/wallet                → WalletPage
/user/wishlist              → WishlistPage
/user/reviews               → ReviewsPage
/user/notifications         → NotificationsPage

── Admin (requires ADMIN or HOTEL_MANAGER role) ─────────────────
/admin                      → redirect to /admin/dashboard
/admin/dashboard            → AdminDashboard
/admin/hotels               → AdminHotels
/admin/hotels/:id/room-types → AdminRoomTypes
/admin/hotels/:id/rooms     → AdminRooms
/admin/hotels/:id/inventory → AdminInventory
/admin/bookings             → AdminBookings
/admin/users                → AdminUsers
/admin/reviews              → AdminReviews
/admin/promotions           → AdminPromotions
/admin/pricing-rules        → AdminPricingRules
/admin/tax-config           → AdminTaxConfig
/admin/audit-logs           → AdminAuditLogs
/admin/campaigns            → AdminCampaigns

── Legacy redirects ─────────────────────────────────────────────
/login                      → /auth/login
/register                   → /auth/register
/my-bookings                → /user/bookings
/my-profile                 → /user/profile

*                           → NotFoundPage
```

### Route Guards

**[`ProtectedRoute`](frontend/src/components/common/ProtectedRoute.tsx)**:
- Reads `isAuthenticated` from Redux `auth` slice
- Redirects to `/auth/login` if not authenticated
- Passes `state={{ from: location }}` so login can redirect back

**[`AdminRoute`](frontend/src/components/common/AdminRoute.tsx)**:
- Checks `user.roles` includes `ADMIN` or `HOTEL_MANAGER`
- Redirects to `/` if authenticated but not admin
- Redirects to `/auth/login` if not authenticated

### Page Transitions

All routes are wrapped in `AnimatePresence mode="wait"` with `key={location.pathname}`. Each page uses `framer-motion` `motion.div` with `initial/animate/exit` props for smooth transitions.

---

## 6. State Management (Redux Toolkit)

### Store Configuration

[`frontend/src/store/index.ts`](frontend/src/store/index.ts):

```typescript
export const store = configureStore({
  reducer: {
    auth: authReducer,
    search: searchReducer,
    [hotelApi.reducerPath]: hotelApi.reducer,
    [bookingApi.reducerPath]: bookingApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [notificationApi.reducerPath]: notificationApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(hotelApi.middleware)
      .concat(bookingApi.middleware)
      .concat(authApi.middleware)
      .concat(notificationApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

### Auth Slice

[`frontend/src/store/slices/authSlice.ts`](frontend/src/store/slices/authSlice.ts)

**State shape:**
```typescript
interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
}
```

**User shape:**
```typescript
interface User {
  id: string
  email: string
  firstName: string
  lastName?: string
  phone?: string
  role: string           // Primary role (legacy)
  roles?: string[]       // Multi-role array
  loyaltyTier: string    // BRONZE | SILVER | GOLD | PLATINUM
  loyaltyPoints?: number
  isEmailVerified: boolean
  dateOfBirth?: string
  gender?: string
  profilePictureUrl?: string
}
```

**Actions:**

| Action | Description |
|---|---|
| `setCredentials({ user, accessToken, refreshToken })` | Login — persists to `localStorage` |
| `setTokens({ accessToken, refreshToken? })` | Token refresh — updates tokens only |
| `logout()` | Clears state and `localStorage` |
| `updateUser(partial)` | Update user fields (e.g., after profile edit) |

**Persistence:** Auth state is loaded from `localStorage` on store initialization via `loadFromStorage()`. Tokens and user object are stored under keys `accessToken`, `refreshToken`, `user`.

**`normalizeUser(raw)`** helper normalizes the backend response shape (handles both `AuthResponse.UserInfo` and `UserProfileDto` shapes, including `isEmailVerified` vs `emailVerified` field name differences).

### Search Slice

[`frontend/src/store/slices/searchSlice.ts`](frontend/src/store/slices/searchSlice.ts)

Stores the current hotel search parameters (city, checkIn, checkOut, adults, children) so they persist across navigation between search and hotel detail pages.

---

## 7. API Layer (RTK Query)

All server communication uses **RTK Query** endpoints defined in `src/store/api/`. Each API slice uses `fetchBaseQuery` with automatic JWT header injection.

### Common Pattern

```typescript
const someApi = createApi({
  reducerPath: 'someApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',  // or VITE_API_URL for non-proxied
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  tagTypes: ['Tag'],
  endpoints: (builder) => ({ ... }),
})
```

### authApi

[`frontend/src/store/api/authApi.ts`](frontend/src/store/api/authApi.ts)

| Hook | Method | Endpoint |
|---|---|---|
| `useLoginMutation` | POST | `/api/v1/auth/login` |
| `useRegisterMutation` | POST | `/api/v1/auth/register` |
| `useVerifyEmailMutation` | POST | `/api/v1/auth/verify-email` |
| `useForgotPasswordMutation` | POST | `/api/v1/auth/forgot-password` |
| `useResetPasswordMutation` | POST | `/api/v1/auth/reset-password` |
| `useRefreshTokenMutation` | POST | `/api/v1/auth/refresh` |
| `useLogoutMutation` | POST | `/api/v1/auth/logout` |

### hotelApi

[`frontend/src/store/api/hotelApi.ts`](frontend/src/store/api/hotelApi.ts)

| Hook | Method | Endpoint |
|---|---|---|
| `useSearchHotelsQuery` | GET | `/api/v1/hotels` |
| `useGetHotelBySlugQuery` | GET | `/api/v1/hotels/:city/:slug` |
| `useGetRoomTypesQuery` | GET | `/api/v1/hotels/:id/room-types` |
| `useGetHotelReviewsQuery` | GET | `/api/v1/hotels/:id/reviews` |
| `useSubmitReviewMutation` | POST | `/api/v1/hotels/:id/reviews` |
| `useGetWishlistQuery` | GET | `/api/v1/hotels/wishlist` |
| `useToggleWishlistMutation` | POST | `/api/v1/hotels/:id/wishlist` |

### bookingApi

[`frontend/src/store/api/bookingApi.ts`](frontend/src/store/api/bookingApi.ts)

| Hook | Method | Endpoint |
|---|---|---|
| `useInitiateBookingMutation` | POST | `/api/v1/bookings/initiate` |
| `useGetMyBookingsQuery` | GET | `/api/v1/bookings` |
| `useGetBookingDetailQuery` | GET | `/api/v1/bookings/:ref` |
| `useGetCancellationPreviewQuery` | GET | `/api/v1/bookings/:ref/cancel/preview` |
| `useCancelBookingMutation` | POST | `/api/v1/bookings/:ref/cancel` |
| `useValidateCouponMutation` | POST | `/api/v1/coupons/validate` |
| `useGetAvailableCouponsQuery` | GET | `/api/v1/coupons/available` |

**Coupon validation** is server-side only — the `discountAmount` in `CouponValidateResponse` is the only value the frontend uses. Client-side discount calculation is never trusted.

### notificationApi

[`frontend/src/store/api/notificationApi.ts`](frontend/src/store/api/notificationApi.ts)

| Hook | Method | Endpoint |
|---|---|---|
| `useGetNotificationsQuery` | GET | `/api/v1/notifications` |
| `useGetUnreadCountQuery` | GET | `/api/v1/notifications/unread-count` |
| `useMarkReadMutation` | PATCH | `/api/v1/notifications/:id/read` |
| `useMarkAllReadMutation` | PATCH | `/api/v1/notifications/read-all` |
| `useDeleteNotificationMutation` | DELETE | `/api/v1/notifications/:id` |
| `useGetCampaignsQuery` | GET | `/api/v1/admin/campaigns` |
| `useGetCampaignQuery` | GET | `/api/v1/admin/campaigns/:id` |
| `useCreateCampaignMutation` | POST | `/api/v1/admin/campaigns` |
| `useSendCampaignMutation` | POST | `/api/v1/admin/campaigns/:id/send` |
| `useCancelCampaignMutation` | POST | `/api/v1/admin/campaigns/:id/cancel` |

**Tag types:** `Notification`, `Campaign` — mutations invalidate these tags to trigger automatic refetch.

### Axios Instance

[`frontend/src/lib/axios.ts`](frontend/src/lib/axios.ts) — used for imperative calls (file uploads, PDF downloads, etc.):

**Request interceptor:** Attaches `Authorization: Bearer <token>` from Redux store.

**Response interceptor (401 handling):**
1. On `401`, checks if already retrying (`_retry` flag)
2. If `isRefreshing`, queues the request in `failedQueue`
3. Calls `POST /api/v1/auth/refresh` with stored refresh token
4. On success: dispatches `setTokens`, processes queue, retries original request
5. On failure: dispatches `logout()`, redirects to `/auth/login`

This implements the **token refresh queue pattern** — concurrent requests that fail with 401 are all queued and retried after a single refresh call, preventing multiple simultaneous refresh requests.

---

## 8. Authentication Flow

### Registration Flow

```
1. RegisterPage: user fills form (firstName, lastName, email, password)
   → useRegisterMutation → POST /api/v1/auth/register
   → Backend sends OTP email

2. OTP verification step shown inline
   → useVerifyEmailMutation → POST /api/v1/auth/verify-email { identifier, otp }
   → Backend returns AuthResponse (tokens + user)
   → dispatch(setCredentials({ user, accessToken, refreshToken }))
   → navigate('/') — user is logged in immediately
```

### Login Flow

```
1. LoginPage: email + password form
   → useLoginMutation → POST /api/v1/auth/login
   → Backend returns AuthResponse
   → dispatch(setCredentials(...))
   → navigate(from || '/')

2. Google OAuth2:
   → Click "Continue with Google"
   → Redirect to /oauth2/authorization/google (backend)
   → Google auth → backend callback → redirect to /auth/oauth2/callback?token=...&refreshToken=...
   → OAuth2CallbackPage extracts tokens from URL params
   → dispatch(setCredentials(...))
   → navigate('/')
```

### Token Refresh

Handled automatically by the Axios interceptor in [`lib/axios.ts`](frontend/src/lib/axios.ts). RTK Query endpoints use `fetchBaseQuery` which does NOT auto-refresh — for RTK Query calls, the access token must be valid. The 15-minute access token expiry means users rarely hit 401 on RTK Query calls during normal usage.

### Logout Flow

```
1. User clicks logout in Navbar dropdown
   → POST /api/v1/auth/logout (optional — clears server session)
   → dispatch(logout())
   → localStorage cleared
   → navigate('/auth/login')
```

### Route Protection

```typescript
// ProtectedRoute.tsx
const { isAuthenticated } = useSelector((s: RootState) => s.auth)
if (!isAuthenticated) return <Navigate to="/auth/login" state={{ from: location }} replace />
return <Outlet />

// AdminRoute.tsx
const { user, isAuthenticated } = useSelector((s: RootState) => s.auth)
const isAdmin = user?.roles?.includes('ADMIN') || user?.roles?.includes('HOTEL_MANAGER')
if (!isAuthenticated) return <Navigate to="/auth/login" replace />
if (!isAdmin) return <Navigate to="/" replace />
return <Outlet />
```

---

## 9. Component Reference

### Layout Components

#### [`Layout`](frontend/src/components/layout/Layout.tsx)
Wraps all public and user routes. Renders `<Navbar>` + `<Outlet>` + `<Footer>`.

#### [`AdminLayout`](frontend/src/components/layout/AdminLayout.tsx)
Full-height sidebar layout for admin routes. Sidebar contains navigation links to all admin pages. Uses `useLocation` to highlight the active nav item.

**Admin sidebar items:**
- Dashboard, Hotels, Bookings, Users, Reviews, Promotions, Pricing Rules, Tax Config, Audit Logs, Campaigns

#### [`Navbar`](frontend/src/components/layout/Navbar.tsx)
Sticky top navigation bar. Contains:
- Logo (link to `/`)
- Search tabs (Hotels, Flights, Trains — Hotels active)
- When authenticated: `NotificationBell`, Wishlist icon, User dropdown (Profile, My Bookings, Security, Wallet, Admin if applicable, Logout)
- When not authenticated: Login / Register links

#### [`NotificationBell`](frontend/src/components/layout/NotificationBell.tsx)
See [Section 10](#10-notification-system-frontend) for full details.

#### [`Footer`](frontend/src/components/layout/Footer.tsx)
Standard site footer with links and copyright.

### Common Components

#### [`ProtectedRoute`](frontend/src/components/common/ProtectedRoute.tsx)
Route guard for authenticated routes.

#### [`AdminRoute`](frontend/src/components/common/AdminRoute.tsx)
Route guard for admin routes (ADMIN or HOTEL_MANAGER role).

#### [`CityAutocomplete`](frontend/src/components/common/CityAutocomplete.tsx)
Debounced city search input that fetches suggestions from the backend as the user types. Used on the home page and search page.

#### [`ToastProvider`](frontend/src/components/common/ToastProvider.tsx)
Listens for `CustomEvent('toast', { detail: { type, message } })` on `window` and renders Radix UI toast notifications. Used by the `useToast` hook.

### Toast System

[`frontend/src/hooks/useToast.ts`](frontend/src/hooks/useToast.ts) — default export `toast` object:

```typescript
toast.success('Booking confirmed!')
toast.error('Payment failed. Please try again.')
toast.info('Your session will expire soon.')
```

Internally dispatches a `CustomEvent` on `window` which `ToastProvider` listens to. This decouples toast calls from React component context — can be called from Axios interceptors, RTK Query callbacks, or anywhere.

---

## 10. Notification System (Frontend)

### Overview

The notification system has two data sources that are merged and deduplicated:
1. **RTK Query** — fetches the last 10 notifications from REST API when the dropdown opens
2. **WebSocket** — receives real-time push notifications via STOMP/SockJS

### NotificationBell Component

[`frontend/src/components/layout/NotificationBell.tsx`](frontend/src/components/layout/NotificationBell.tsx)

**Rendered only when authenticated** (`isAuthenticated` from Redux).

**State:**
```typescript
const [open, setOpen] = useState(false)
const [wsNotifications, setWsNotifications] = useState<NotificationDto[]>([])
```

**RTK Query hooks:**
```typescript
// Always polling (60s interval) — provides unread badge count
const { data: unreadData, refetch: refetchCount } = useGetUnreadCountQuery(undefined, {
  skip: !isAuthenticated,
  pollingInterval: 60000,
})

// Only fetches when dropdown is open (skip: !open)
const { data: notifPage } = useGetNotificationsQuery(
  { page: 0, size: 10 },
  { skip: !isAuthenticated || !open }
)
```

**Notification merging (deduplication):**
```typescript
const notifications: NotificationDto[] = (() => {
  const fetched = notifPage?.content ?? []
  const ids = new Set(fetched.map((n) => n.id))
  const extra = wsNotifications.filter((n) => !ids.has(n.id))
  return [...extra, ...fetched]  // WS notifications appear first (newest)
})()
```

**Unread count** combines REST count + WS notifications not yet in the REST response:
```typescript
const unreadCount = (unreadData?.count ?? 0) + wsNotifications.filter((n) => n.status === 'UNREAD').length
```

### WebSocket Connection

The WebSocket client uses **dynamic imports** to avoid CJS/ESM issues with `sockjs-client`:

```typescript
useEffect(() => {
  if (!isAuthenticated || !accessToken || !user?.id) return
  let client: any = null
  let cancelled = false

  const connect = async () => {
    try {
      const { Client } = await import('@stomp/stompjs')
      const SockJS = (await import('sockjs-client')).default

      if (cancelled) return

      client = new Client({
        webSocketFactory: () => new SockJS('/ws'),
        connectHeaders: { Authorization: `Bearer ${accessToken}` },
        reconnectDelay: 5000,
        onConnect: () => {
          client.subscribe(`/user/${user.id}/queue/notifications`, (msg) => {
            const notif: NotificationDto = JSON.parse(msg.body)
            setWsNotifications((prev) => [notif, ...prev.slice(0, 49)])
            refetchCount()
          })
        },
      })
      client.activate()
    } catch {
      // WebSocket unavailable — fall back to polling only
    }
  }

  connect()
  return () => {
    cancelled = true
    if (client) try { client.deactivate() } catch { /* ignore */ }
  }
}, [isAuthenticated, accessToken, user?.id])
```

**Key design decisions:**
- Dynamic imports prevent the `global is not defined` error from `sockjs-client` CJS bundle
- `cancelled` flag prevents state updates after component unmount
- `reconnectDelay: 5000` — auto-reconnects after 5 seconds if connection drops
- STOMP errors are silently ignored — notifications still work via 60s polling fallback
- Max 50 WS notifications kept in state (`prev.slice(0, 49)`)

### NotificationsPage

[`frontend/src/pages/user/NotificationsPage.tsx`](frontend/src/pages/user/NotificationsPage.tsx)

Full-page notification center with:
- **Tab filter**: All / Bookings / Payments / Offers / Reminders / System
- **Infinite scroll**: `IntersectionObserver` on a sentinel element triggers `setPage(p => p + 1)`
- **Append-only state**: New pages are appended to `allNotifications` array
- **Deduplication guard**: `appendedRef` (`Set<string>`) tracks which `"tab:page"` keys have been appended to prevent double-appending on re-renders

**`appendedRef` pattern (prevents infinite re-render loop):**
```typescript
const appendedRef = useRef<Set<string>>(new Set())

useEffect(() => {
  if (!data || isFetching) return
  const key = `${activeTab}:${page}`
  if (appendedRef.current.has(key)) return  // Already processed this page
  appendedRef.current.add(key)

  const content = data.content ?? []
  if (page === 0) {
    setAllNotifications(content)
  } else {
    setAllNotifications((prev) => {
      const safePrev = prev ?? []
      const ids = new Set(safePrev.map((n) => n.id))
      const newItems = content.filter((n) => !ids.has(n.id))
      return newItems.length > 0 ? [...safePrev, ...newItems] : safePrev
    })
  }
  setHasMore(!data.last && content.length > 0)
}, [data, isFetching, activeTab, page])
```

**Tab reset:** When `activeTab` changes, `page` resets to 0 and `appendedRef.current.clear()` is called.

### Notification Type Colors & Icons

```typescript
const TYPE_COLORS = {
  BOOKING:  'bg-blue-100 text-blue-700',
  PAYMENT:  'bg-green-100 text-green-700',
  OFFER:    'bg-orange-100 text-orange-700',
  REMINDER: 'bg-yellow-100 text-yellow-700',
  SYSTEM:   'bg-gray-100 text-gray-600',
}

const TYPE_ICONS = {
  BOOKING:  '🏨',
  PAYMENT:  '💳',
  OFFER:    '🎁',
  REMINDER: '⏰',
  SYSTEM:   '🔔',
}
```

### NotificationDto TypeScript Interface

```typescript
interface NotificationDto {
  id: string
  type: 'BOOKING' | 'PAYMENT' | 'OFFER' | 'REMINDER' | 'SYSTEM'
  title: string
  message: string
  actionUrl?: string      // Navigate to this URL on click
  category?: string
  status: 'UNREAD' | 'READ'
  referenceId?: string
  referenceType?: string
  readAt?: string
  expiresAt?: string
  createdAt: string
}
```

---

## 11. Booking & Payment Flow

### Step 1: Initiate Booking

**Page:** [`BookingInitiatePage`](frontend/src/pages/booking/BookingInitiatePage.tsx)

1. User arrives from `HotelDetailPage` with `roomTypeId`, `checkIn`, `checkOut`, `adults`, `children` in navigation state
2. User fills in guest details (primary guest + additional guests)
3. User selects add-ons (Breakfast, Airport Transfer, Spa, etc.)
4. On submit: `useInitiateBookingMutation` → `POST /api/v1/bookings/initiate`
5. Backend creates booking with `PAYMENT_PENDING` status, creates Stripe PaymentIntent, returns `BookingResponse` with `clientSecret`
6. Navigate to `/booking/payment?bookingRef=<ref>`

### Step 2: Payment

**Page:** [`BookingPaymentPage`](frontend/src/pages/booking/BookingPaymentPage.tsx)

Payment method tabs:
- **Card** — Stripe `CardElement` via `@stripe/react-stripe-js`
- **UPI** — Mock UPI app selector (PhonePe, GPay, Paytm, BHIM)
- **Wallet** — Mock wallet selector (Paytm, PhonePe, Amazon Pay, Mobikwik)
- **Net Banking** — Mock bank selector with search
- **COD** — Cash on delivery (mock)

**Coupon flow:**
1. User enters coupon code → `useValidateCouponMutation` → `POST /api/v1/coupons/validate`
2. Server validates scope, payment method compatibility, usage limits
3. Returns `discountAmount` — frontend uses this value only (never calculates client-side)
4. "Available coupons" panel fetches `useGetAvailableCouponsQuery` for the booking

**Stripe card payment:**
```typescript
// StripeCardForm component (PaymentComponents.tsx)
const { stripe, elements } = useStripe(), useElements()

const result = await stripe.confirmCardPayment(clientSecret, {
  payment_method: { card: elements.getElement(CardElement) }
})

if (result.paymentIntent?.status === 'succeeded') {
  onSuccess()  // Navigate to confirmation page
}
```

**Non-Stripe payments (UPI/Wallet/NetBanking/COD):**
```typescript
// Simulate payment → call backend to confirm
await api.post(`/api/v1/payments/confirm`, { bookingRef, paymentMethod })
onSuccess()
```

**Price lock countdown:** A `CountdownTimer` component shows the 15-minute price lock expiry. On expiry, the page shows an error and the user must re-initiate the booking.

### Step 3: Confirmation

**Page:** [`BookingConfirmationPage`](frontend/src/pages/booking/BookingConfirmationPage.tsx)

- Displays booking summary (hotel, room, dates, guests, total)
- **Download Invoice** button: `GET /api/v1/bookings/:ref/invoice` → downloads PDF
- **Add to Calendar** button: generates `.ics` file for Google Calendar / Apple Calendar
- **Share** button: uses Web Share API (`navigator.share`) with fallback to clipboard copy
- Links to "My Bookings" and "Explore More Hotels"

### Booking Detail & Cancellation

**Page:** [`BookingDetailPage`](frontend/src/pages/user/BookingDetailPage.tsx)

- Shows full booking details
- **Cancel Booking** flow:
  1. Click Cancel → fetch `useGetCancellationPreviewQuery` → shows refund amount
  2. Confirm → `useCancelBookingMutation` → `POST /api/v1/bookings/:ref/cancel`
  3. Booking status updates to `CANCELLED`

### PaymentComponents

[`frontend/src/pages/booking/PaymentComponents.tsx`](frontend/src/pages/booking/PaymentComponents.tsx) exports:

| Component | Description |
|---|---|
| `CardPreview` | Animated 3D card flip preview showing card details |
| `StripeCardForm` | Stripe Elements card form with `confirmCardPayment` |
| `UpiForm` | UPI app selector + mock payment |
| `WalletForm` | Wallet selector + mock payment |
| `NetBankingForm` | Bank selector with search + mock payment |
| `CodForm` | Cash on delivery confirmation |

---

## 12. Admin Panel

### Access Control

Admin routes are protected by [`AdminRoute`](frontend/src/components/common/AdminRoute.tsx) which checks:
```typescript
user?.roles?.includes('ADMIN') || user?.roles?.includes('HOTEL_MANAGER')
```

### Admin Layout

[`AdminLayout`](frontend/src/components/layout/AdminLayout.tsx) provides a fixed sidebar with navigation to all admin pages. The active route is highlighted using `useLocation().pathname`.

### Admin Pages

| Page | Path | Description |
|---|---|---|
| [`AdminDashboard`](frontend/src/pages/admin/AdminDashboard.tsx) | `/admin/dashboard` | KPI cards, booking charts (Recharts), recent bookings |
| [`AdminHotels`](frontend/src/pages/admin/AdminHotels.tsx) | `/admin/hotels` | Hotel CRUD, image upload, status toggle |
| [`AdminRoomTypes`](frontend/src/pages/admin/AdminRoomTypes.tsx) | `/admin/hotels/:id/room-types` | Room type management per hotel |
| [`AdminRooms`](frontend/src/pages/admin/AdminRooms.tsx) | `/admin/hotels/:id/rooms` | Individual room management |
| [`AdminInventory`](frontend/src/pages/admin/AdminInventory.tsx) | `/admin/hotels/:id/inventory` | Room availability calendar editor |
| [`AdminBookings`](frontend/src/pages/admin/AdminBookings.tsx) | `/admin/bookings` | All bookings with status filter, search |
| [`AdminUsers`](frontend/src/pages/admin/AdminUsers.tsx) | `/admin/users` | User list, role management, activate/deactivate |
| [`AdminReviews`](frontend/src/pages/admin/AdminReviews.tsx) | `/admin/reviews` | Review moderation (approve/reject) |
| [`AdminPromotions`](frontend/src/pages/admin/AdminPromotions.tsx) | `/admin/promotions` | Promotion & coupon code management |
| [`AdminPricingRules`](frontend/src/pages/admin/AdminPricingRules.tsx) | `/admin/pricing-rules` | Dynamic pricing rule editor |
| [`AdminTaxConfig`](frontend/src/pages/admin/AdminTaxConfig.tsx) | `/admin/tax-config` | Tax rate configuration |
| [`AdminAuditLogs`](frontend/src/pages/admin/AdminAuditLogs.tsx) | `/admin/audit-logs` | Admin action audit trail |
| [`AdminCampaigns`](frontend/src/pages/admin/AdminCampaigns.tsx) | `/admin/campaigns` | Promotional email campaign management |

### AdminCampaigns

[`frontend/src/pages/admin/AdminCampaigns.tsx`](frontend/src/pages/admin/AdminCampaigns.tsx)

Features:
- **Create campaign form** (react-hook-form + zod validation):
  - Name, subject, email body
  - CTA text + URL
  - Discount code
  - Expiry date
  - Target type: ALL / CITY / SPECIFIC / CONDITION
  - Conditional fields based on target type (cities, user IDs, condition + value)
  - Schedule date/time (optional — if blank, sends immediately)
- **Campaign cards** with expandable details showing target info, status badge, sent count
- **Send now** button: `useSendCampaignMutation`
- **Cancel** button: `useCancelCampaignMutation`

**Toast calls use default export:**
```typescript
import toast from '@/hooks/useToast'
// NOT: import { useToast } from '@/hooks/useToast'

toast.success('Campaign created successfully!')
toast.error('Failed to send campaign')
```

---

## 13. Styling System

### Tailwind CSS

All styling uses Tailwind utility classes. Configuration in [`frontend/tailwind.config.ts`](frontend/tailwind.config.ts):

**Brand colors:**
```typescript
colors: {
  'brand-blue': '#1e3a8a',   // Primary blue (navbar, buttons)
  // Standard Tailwind palette for everything else
}
```

### Utility Functions

[`frontend/src/lib/utils.ts`](frontend/src/lib/utils.ts):

```typescript
// Merge Tailwind classes safely (handles conflicts)
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Radix UI Primitives

Radix UI components used:
- `@radix-ui/react-accordion` — FAQ sections on hotel detail
- `@radix-ui/react-dialog` — Modal dialogs
- `@radix-ui/react-dropdown-menu` — Dropdown menus
- `@radix-ui/react-label` — Form labels
- `@radix-ui/react-select` — Select dropdowns
- `@radix-ui/react-separator` — Visual dividers
- `@radix-ui/react-slider` — Price range filter
- `@radix-ui/react-slot` — Component composition
- `@radix-ui/react-tabs` — Tab navigation
- `@radix-ui/react-toast` — Toast notifications (via ToastProvider)

### Framer Motion Patterns

**Page transition:**
```typescript
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -16 }}
  transition={{ duration: 0.2 }}
>
  {/* page content */}
</motion.div>
```

**List item animation:**
```typescript
<AnimatePresence initial={false}>
  {items.map((item, i) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ delay: i * 0.05 }}
    />
  ))}
</AnimatePresence>
```

**Notification badge:**
```typescript
<AnimatePresence>
  {unreadCount > 0 && (
    <motion.span
      key="badge"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className="..."
    >
      {unreadCount}
    </motion.span>
  )}
</AnimatePresence>
```

### SEO with React Helmet

Pages use `react-helmet-async` for `<head>` management:
```typescript
import { Helmet } from 'react-helmet-async'

<Helmet>
  <title>MakeMyCrip — Find & Book Hotels</title>
  <meta name="description" content="..." />
</Helmet>
```

---

## 14. Developer Workflow & Tooling

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18+ |
| npm | 9+ |

### Setup & Run

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Type check (no emit)
npx tsc --noEmit

# Production build
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

### Dev Server Features

- **Hot Module Replacement (HMR)** — React Fast Refresh via `@vitejs/plugin-react`
- **Vite proxy** — `/api` and `/ws` requests forwarded to `http://localhost:8081`
- **Path alias** — `@/` resolves to `src/`

### Build Output

```bash
npm run build
# → tsc (type check) + vite build
# Output: frontend/dist/
```

The `dist/` folder contains:
- `index.html` — entry point
- `assets/` — hashed JS/CSS bundles

### Docker Deployment

```bash
# Build image
docker build -t makemycrip-frontend ./frontend

# The Dockerfile uses nginx to serve the built SPA
# nginx.conf handles SPA routing (all paths → index.html)
```

[`frontend/nginx.conf`](frontend/nginx.conf) key config:
```nginx
location / {
  try_files $uri $uri/ /index.html;  # SPA fallback
}
location /api {
  proxy_pass http://backend:8081;    # Proxy to backend in Docker
}
location /ws {
  proxy_pass http://backend:8081;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
```

### Common Issues & Solutions

| Issue | Cause | Fix |
|---|---|---|
| `global is not defined` | sockjs-client CJS bundle | Ensure `define: { global: 'globalThis' }` in vite.config.ts and `window.global` polyfill in index.html |
| `Cannot refetch a query that has not been started yet` | Calling `refetch()` on a skipped RTK Query | Remove `refetch` call or ensure query is not skipped |
| Infinite re-render / flickering | `useEffect` with unstable deps causing loop | Use `appendedRef` pattern to track processed pages |
| `TypeError: data.content is undefined` | RTK Query returns error shape | Guard with `data?.content ?? []` |
| Blank white page on load | Named import from default-only export | Check import style matches export style |
| WebSocket not connecting | Vite proxy missing `ws: true` | Add `ws: true` to `/ws` proxy in vite.config.ts |
| CORS error in production | Frontend served from different origin | Configure `app.cors.allowed-origins` in backend |
| Stripe card not loading | Missing `Elements` provider | Wrap payment page in `<Elements stripe={stripePromise}>` |
| `useSelector` returns stale data | Component not re-rendering | Ensure action was dispatched and reducer handles it |

### Adding a New Page

1. Create `src/pages/[section]/NewPage.tsx`
2. Add route in [`App.tsx`](frontend/src/App.tsx) inside the appropriate route group
3. If admin page, add nav item to [`AdminLayout.tsx`](frontend/src/components/layout/AdminLayout.tsx) `navItems` array
4. If it needs API data, add endpoint to the relevant API slice in `src/store/api/`

### Adding a New RTK Query Endpoint

```typescript
// In src/store/api/someApi.ts
endpoints: (builder) => ({
  // Query (GET)
  getItems: builder.query<ItemType[], void>({
    query: () => '/items',
    providesTags: ['Item'],
  }),
  // Mutation (POST/PUT/DELETE)
  createItem: builder.mutation<ItemType, CreateItemRequest>({
    query: (body) => ({ url: '/items', method: 'POST', body }),
    invalidatesTags: ['Item'],  // Triggers refetch of getItems
  }),
})

// Export hooks
export const { useGetItemsQuery, useCreateItemMutation } = someApi
```

### TypeScript Tips

**Accessing Redux state in components:**
```typescript
import { useSelector } from 'react-redux'
import { RootState } from '@/store'

const { user, isAuthenticated } = useSelector((s: RootState) => s.auth)
```

**Dispatching actions:**
```typescript
import { useDispatch } from 'react-redux'
import { AppDispatch } from '@/store'
import { setCredentials, logout } from '@/store/slices/authSlice'

const dispatch = useDispatch<AppDispatch>()
dispatch(setCredentials({ user, accessToken, refreshToken }))
```

**Using RTK Query mutations:**
```typescript
const [createItem, { isLoading, error }] = useCreateItemMutation()

const handleSubmit = async (data: FormData) => {
  try {
    const result = await createItem(data).unwrap()
    toast.success('Item created!')
  } catch (err: any) {
    toast.error(err?.data?.message || 'Failed to create item')
  }
}
```

---

*Last updated: May 2026 — MakeMyCrip Frontend v1.0.0*