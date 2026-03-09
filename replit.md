# replit.md

## Overview

TransportGo is a transport/logistics mobile application built with React Native (Expo) and an Express backend, similar to Rapido/Porter. It connects customers who need goods transported with drivers who operate vehicles (Auto, Tempo, Truck). The app features three user roles: **customers** who create bookings and track rides, **drivers** who receive ride requests, verify pickups via OTP, and complete deliveries, and **admins** who manage the entire platform via a web dashboard. The app is focused on the Indore, India region with mock locations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Mobile App)
- **Framework**: React Native with Expo SDK 54, using expo-router for file-based routing
- **Language**: TypeScript throughout
- **App Mode**: Controlled by `EXPO_PUBLIC_APP_MODE` env var (`customer` or `driver`). Each mode acts as a separate app with its own branding, login flow (no role selector), and screens.
- **Navigation**: File-based routing via `expo-router` with nested layouts:
  - `app/index.tsx` — Phone + OTP login screen (role auto-assigned from APP_MODE, no role selector)
  - `app/register.tsx` — Profile completion (name for customers, name + vehicle details for drivers)
  - `app/customer/` — Customer screens (home, new-booking, track-ride, history, rate-ride)
  - `app/driver/` — Driver screens (dashboard, requests, active-ride)
- **App Config**: `lib/app-config.ts` — getAppMode(), getAppName(), getAppSubtitle() utilities
- **State Management**: React Context API with two main contexts:
  - `AuthContext` — Phone+OTP authentication via backend API, JWT token storage in AsyncStorage
  - `BookingContext` — Full booking lifecycle via backend API (create, accept, start, complete, cancel, rate)
- **Data Fetching**: Direct fetch calls to Express backend with JWT Authorization headers
- **Animations**: React Native Animated API for entrance animations, spring effects
- **Fonts**: Inter font family via `@expo-google-fonts/inter`

### Backend (Express Server)
- **Framework**: Express 5 running on Node.js, port 5000
- **Entry point**: `server/index.ts`
- **Auth**: `server/auth.ts` — JWT token generation/verification, auth middleware, role-based access middleware
- **Routes**: `server/routes.ts` — 20+ REST API endpoints for auth, users, bookings, vehicles, admin
- **Database**: MongoDB Atlas via Mongoose (`server/models.ts` for schemas, `server/storage.ts` for data access layer)
- **Storage**: `server/storage.ts` — MongoStorage class wrapping Mongoose models with async methods
- **Real-time**: Socket.IO for driver location updates, booking notifications
- **Templates**: Landing page at `/` and admin panel at `/admin` (HTML served from Express)
- **CORS**: Configured for Replit domains and localhost

### Data Models
- **User**: id, name, phone, role (customer/driver/admin), vehicleType, vehicleNumber, isOnline, isApproved, rating, totalTrips, totalEarnings, location
- **Booking**: id, customerId, driverId, pickup/delivery locations, vehicleType, distance, pricing (base+distance), status (pending/accepted/in_progress/completed/cancelled), otp, rating
- **VehiclePricing**: type, name, baseFare, perKmCharge, capacity
- **OtpRecord**: phone, otp, expiresAt, verified (5-minute expiry)

### Web Admin Panel
- **URL**: `/admin` on port 5000
- **Auth**: Admin login with phone 9999999999, password admin123
- **Features**: Dashboard stats, user management, booking management, vehicle pricing editor, live driver tracking
- **Tech**: Pure HTML/CSS/JavaScript, no frameworks, served as template from Express

### API Endpoints
**Auth:**
- POST `/api/auth/send-otp` — Send OTP (returns OTP in dev mode)
- POST `/api/auth/verify-otp` — Verify OTP, create user if new, return JWT
- POST `/api/auth/register` — Complete user registration
- POST `/api/auth/admin-login` — Admin login with phone+password
- GET `/api/auth/me` — Get current user (requires auth)

**Users:**
- PUT `/api/users/profile` — Update profile
- PUT `/api/users/toggle-online` — Toggle driver online/offline status

**Bookings:**
- POST `/api/bookings` — Create booking (customer only)
- GET `/api/bookings` — Get user's bookings
- GET `/api/bookings/pending` — Get pending bookings (driver only)
- GET `/api/bookings/:id` — Get booking by ID
- PUT `/api/bookings/:id/accept` — Accept booking (driver)
- PUT `/api/bookings/:id/start` — Start trip with OTP verification (driver)
- PUT `/api/bookings/:id/complete` — Complete delivery (driver)
- PUT `/api/bookings/:id/cancel` — Cancel booking with reason
- PUT `/api/bookings/:id/rate` — Rate completed booking (customer)

**Vehicles:**
- GET `/api/vehicles` — List active vehicle types with pricing

**Admin:**
- GET `/api/admin/stats` — Dashboard statistics
- GET `/api/admin/users` — List all users
- PUT `/api/admin/users/:id/approve` — Approve driver
- DELETE `/api/admin/users/:id` — Delete user
- GET `/api/admin/bookings` — All bookings
- GET `/api/admin/vehicles` — All vehicles
- PUT `/api/admin/vehicles/:id` — Update vehicle pricing
- GET `/api/admin/drivers/online` — Online drivers

### Socket.IO Events
- `driver:location` — Driver sends location update
- `driver:online` / `driver:offline` — Driver status change
- `booking:new` — New booking created (broadcast to drivers)
- `booking:updated` — Booking status changed (broadcast to all)
- `driver:location:update` — Server broadcasts driver location

### Key Design Decisions
1. **MongoDB Atlas**: Persistent storage via Mongoose ODM, auto-seeds default vehicles and admin on first run
2. **Mock OTP**: OTP is returned in API response during development, logged to console
3. **Mock locations**: 10 predefined Indore locations used instead of real geocoding
4. **Flat pricing**: Auto (₹50 + ₹12/km), Tempo (₹150 + ₹18/km), Truck (₹300 + ₹25/km)
5. **OTP verification**: 4-digit OTP generated at booking, driver must enter to start trip
6. **JWT auth**: 7-day token expiry, role-based access control
7. **Admin panel**: Pure HTML/CSS/JS served from Express, no build step needed

### Build & Run
- **Development**: Two workflows — `Start Backend` (Express on port 5000) and `Start Frontend` (Expo Metro bundler)
- **Backend**: `npm run server:dev` — runs Express with tsx
- **Frontend**: `npm run expo:dev` — runs Expo with environment variables for Replit proxy

## External Dependencies
- **Socket.IO**: Real-time communication (socket.io + socket.io-client)
- **jsonwebtoken**: JWT token generation and verification
- **Expo Services**: Expo SDK for build tooling, splash screen, fonts, vector icons
- **No external APIs currently**: Locations are mocked, pricing is calculated locally, OTP is mock
- **Future integrations**: MongoDB Atlas, Google Maps API, Twilio SMS (connection strings/API keys to be added later)
