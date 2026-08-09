# 🏨 MakeMyTrip Clone

> A full-stack, production-grade OTA (Online Travel Agency) style hotel booking platform — search hotels, book rooms, pay securely, and manage everything from a powerful admin dashboard.

Built as a complete end-to-end system covering authentication, dynamic pricing, real-time notifications, and payment processing — modeled after real-world platforms like MakeMyTrip and Booking.com.

---

## ✨ Features

**For Users**
- 🔍 Hotel search with filters (city, dates, guests, price)
- 🏨 Detailed hotel pages — rooms, amenities, reviews, nearby places, policies
- 💳 Secure booking & payment via Stripe
- 🎟️ Coupon codes & promotions
- ⭐ Reviews & ratings
- ❤️ Wishlist
- 📧 Email notifications (booking confirmation, reminders, cancellations)
- 👤 Profile management, booking history, loyalty tiers
- 🔐 JWT auth + Google OAuth2 login
- 📱 New-device login security alerts

**For Admins**
- 📊 Dashboard with booking & revenue stats
- 🏢 Hotel, room, and room-type management
- 📦 Inventory management
- 💰 Dynamic pricing rules & tax configuration
- 🎁 Promotions & coupon management
- 📝 Review moderation
- 📣 Marketing campaigns
- 🧾 Audit logs for all admin actions

---

## 🛠️ Tech Stack

**Backend**
![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?style=for-the-badge&logo=springsecurity&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Kafka](https://img.shields.io/badge/Apache_Kafka-231F20?style=for-the-badge&logo=apachekafka&logoColor=white)

**Frontend**
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Redux](https://img.shields.io/badge/Redux_Toolkit-764ABC?style=for-the-badge&logo=redux&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

**Infra & Integrations**
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=stripe&logoColor=white)
![OAuth2](https://img.shields.io/badge/OAuth2-4285F4?style=for-the-badge&logo=google&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

---

## 🏗️ Architecture

```
┌──────────────────────┐
│   React + TypeScript  │
│      Frontend         │
└──────────┬─────────────┘
           │ REST + WebSocket
┌──────────▼─────────────┐
│    Spring Boot API      │
│  ┌────────┬───────────┐ │
│  │  Auth   │  Hotel    │ │
│  │  Module │  Module   │ │
│  ├────────┼───────────┤ │
│  │ Booking │  Payment  │ │
│  │ Module  │  Module   │ │
│  ├────────┼───────────┤ │
│  │ Pricing │ Promotion │ │
│  │ Engine  │  Module   │ │
│  ├────────┴───────────┤ │
│  │  Notification Module │ │
│  └──────────────────────┘ │
└──────┬───────┬─────────┘
       │       │
 ┌─────▼──┐ ┌──▼─────┐   ┌────────┐   ┌────────┐
 │Postgres│ │ Redis  │   │ Kafka  │   │ Stripe │
 └────────┘ └────────┘   └────────┘   └────────┘
```

---

## 🧩 Backend Modules

| Module | Responsibility |
|---|---|
| `auth` | JWT + Google OAuth2 login, OTP verification, session management |
| `user` | User profiles, loyalty tiers, device tracking |
| `hotel` | Hotel/room catalog, search, reviews, wishlist |
| `booking` | Booking lifecycle, cancellation, guest management |
| `payment` | Stripe integration, webhooks, refunds |
| `pricing` | Rule-based dynamic pricing engine (taxes, seasonal adjustments) |
| `promotion` | Coupons & promotional campaigns |
| `notification` | Kafka-driven async email/SMS notifications, WebSocket real-time updates |
| `admin` | Dashboard, hotel/inventory/user management, audit logging |
| `common` | Shared exceptions, response wrappers, utilities |

---

## 🔐 Key Engineering Highlights

- ✅ **JWT + Google OAuth2** dual authentication with refresh tokens
- ✅ **Email OTP verification** for signup & password reset
- ✅ **Stripe payments** secured via signature-verified webhooks
- ✅ **Rule-based dynamic pricing engine** — taxes, seasonal adjustments, coupon stacking
- ✅ **Redis** for checkout price-locking and API rate limiting
- ✅ **Kafka + WebSocket** for asynchronous, real-time booking notifications
- ✅ **Flyway migrations** — versioned, auditable database schema evolution
- ✅ **Dockerized** full stack (Postgres, Redis, Kafka, backend, frontend) via Docker Compose
- ✅ **CI pipeline** configured via GitHub Actions

---

## 🚀 Getting Started

### Prerequisites
- Java 17+
- Node.js & npm
- Docker & Docker Compose

### Run with Docker Compose (recommended)
```bash
cd makemycrip
docker-compose up --build
```
This spins up PostgreSQL, Redis, Kafka, the backend, and the frontend together.

### Run manually

**Backend:**
```bash
cd makemycrip/backend
./mvnw spring-boot:run
```

**Frontend:**
```bash
cd makemycrip/frontend
npm install
npm run dev
```

### Environment Variables
Copy `.env.example` to `.env` in both `backend/` and `frontend/` and fill in your own values (database credentials, JWT secret, Stripe keys, Redis/Kafka config). **Never commit your `.env` file.**

---

## 📌 Roadmap

- [ ] Multi-currency support
- [ ] Flight booking module
- [ ] Mobile app (React Native)
- [ ] AI-based hotel recommendations
- [ ] Kubernetes deployment manifests

---

## 👤 Author

**Saurav Kumar**
Java Full Stack Developer | Spring Boot · React · Docker
📫 [LinkedIn](https://www.linkedin.com/in/saurav-kumar-560875284) · [LeetCode](https://leetcode.com/u/___saurav___244/)

---

⭐ If you find this project interesting, consider giving it a star!
