# IMOVIES 19 — Premium Cinema Booking Platform

An ultra-modern, high-performance, full-stack MERN cinema ticketing application featuring a luxury dark-mode user experience, live seat synchronisation via Socket.IO, atomic seat locking, and online payment integration with Razorpay (supporting live test keys and built-in offline test sandbox simulation).

---

## 🌟 Key Features

### 🎬 Ultra-Modern & Classy Frontend
- **Design System**: Luxurious dark aesthetic (Obsidian & Crimson/Gold), glassmorphism cards, Google Fonts (*Outfit* and *Plus Jakarta Sans*), and Lucide icons.
- **Hero Spotlight Banner**: Dynamic cinematic featured showcase with ratings, tags, and quick-booking CTAs.
- **Dynamic City & Filter Controls**: Browse by city (Indore, Mumbai, Delhi, Bengaluru), genre tags, language chips, and instant debounce search.
- **Immersive Seat Selector**: Realistic curved 3D cinema screen, tiered seating (VIP Recliners, Premium Club, Classic Standard), live occupancy counters, and real-time Socket.IO synchronization.
- **Digital Cinema Boarding Pass**: Confetti celebration, tear-away ticket pass with perforation, scannable QR code, and print/PDF support.

### 💳 Online Payment with Razorpay (Test & Simulation)
- Seamless integration with **Razorpay Checkout SDK**.
- **Dual Flow**: Works with real Razorpay test credentials or automatically falls back to the **Built-in Razorpay Test Simulator** (UPI, Google Pay, PhonePe, Cards, NetBanking) with authentic transaction IDs and signature verification.
- **Coupon Codes**: Built-in coupons `CINEMA50` (₹50 discount) and `FESTIVE100` (₹100 discount).

### ⚡ Lightning-Fast Backend Architecture
- **In-Memory Query Cache** (`server/src/cache.js`) for sub-millisecond movie and theatre response times.
- **Gzip/Deflate Compression** middleware for compact payloads.
- **Atomic MongoDB Seat Reservation** using conditional array filters to prevent double booking.
- **Response Time Metrics** with `X-Response-Time` header.

### 🛡️ Full Admin Management Suite
- Real-time revenue, ticket count, and catalog analytics.
- CRUD operations for Movies, Theatres, and Screens.
- Custom show scheduler with automatic VIP/Premium/Classic seat matrix generation.
- Full live customer booking transactions log.

---

## 🚀 Quick Setup & Run

### 1. Backend Setup
```bash
cd server
cp .env.example .env
npm install
npm run seed     # Seeds demo movies, luxury theatres, and showtimes
npm run dev      # Starts API on http://localhost:5000
```

### 2. Frontend Setup
In a second terminal:
```bash
cd client
cp .env.example .env
npm install
npm run dev      # Starts client on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Demo Customer** | `rehan@example.com` | `User123!` |
| **Demo Admin** | `admin@imovies.local` | `Admin123!` |

*(Note: The login page includes **1-Click Demo Login** buttons for instant access!)*

---

## 🎟️ Active Promo Codes
- `CINEMA50` — ₹50 OFF instant discount
- `FESTIVE100` — ₹100 OFF instant discount

---

## 💳 Razorpay Configuration
Set in `server/.env`:
```env
RAZORPAY_KEY_ID=rzp_test_imoviesDemo2026
RAZORPAY_KEY_SECRET=imoviesTestSecretKey2026
RAZORPAY_CURRENCY=INR
```
If you have your own Razorpay test API keys from [dashboard.razorpay.com](https://dashboard.razorpay.com), paste them here. If left as demo keys, the built-in simulator provides an authentic Razorpay experience out-of-the-box!
