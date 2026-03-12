# VendorCenter Marketplace — AI Agent Instructions

> **Last Updated**: March 12, 2026 | **Update this file every 4 hours or when user says "update"**

---

## Your Role

You are a **senior full-stack architect** building a **scalable location-based marketplace system** called **VendorCenter Marketplace**. You work for Anuj (the owner). Always think at production level — clean architecture, security best practices, and scalable patterns.

---

## Project Overview

**VendorCenter** is a location-based service marketplace (like Urban Company / TaskRabbit) where:
- **Customers** discover nearby service vendors, book services, pay, and leave reviews
- **Vendors** onboard their business, list services, manage bookings
- **Admins** manage users, vendors, bookings, zones, and view analytics
- **Employees** handle support tasks and zone assignments

**Domain**: vendorcenter.in

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | npm workspaces (`frontend` + `backend`) |
| Frontend | React 18 + TypeScript + Vite 5 + SWC |
| UI Library | shadcn/ui (47 Radix UI components) + Tailwind CSS 3 |
| State | React Context (auth, location) + React Query (server state) |
| Maps | Leaflet + React-Leaflet (OpenStreetMap) |
| Charts | Recharts |
| Forms | React Hook Form + Zod validation |
| Backend | Express.js 4 + TypeScript (ESM modules) |
| Runtime | Node.js 20 (tsx for dev, tsc for build) |
| Database | PostgreSQL 16 (Supabase, pooler port 6543) |
| Storage | Supabase Storage (REST API, bucket: vendorcenter-media) |
| Auth | JWT (access 15m + refresh 7d) + bcrypt + OTP (6-digit, SHA-256) |
| Email | Nodemailer (mock in dev, SMTP in prod) + background worker |
| PDF | PDFKit (booking receipts) |
| Validation | Zod (both frontend and backend) |

---

## Deployment Architecture

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | https://vendorcenter.in (Cloudflare DNS) |
| Backend | Railway | https://vendorcenterbackend-production.up.railway.app |
| Database | Supabase | PostgreSQL pooler (port 6543, ap-south-1) |
| Storage | Supabase | Storage bucket `vendorcenter-media` |
| Git Repo | GitHub | timesprimeaj/vendorcenter (branch: main) |

### Environment Variables

**Vercel (Frontend)**:
- `VITE_API_BASE_URL` = `https://vendorcenterbackend-production.up.railway.app`

**Railway (Backend)**:
- `DATABASE_URL` = Supabase pooler connection string
- `SUPABASE_URL` = `https://zulcddzffczxzuxvemjc.supabase.co`
- `SUPABASE_SERVICE_KEY` = Supabase service_role key
- `CORS_ORIGINS` = `https://vendorcenter.in,https://www.vendorcenter.in`
- `APP_URL` = `https://vendorcenter.in`
- `API_URL` = `https://vendorcenterbackend-production.up.railway.app`
- `NODE_ENV` = `production`
- JWT secrets, SMTP, OTP, email from addresses

**Local Dev**:
- `VITE_API_BASE_URL` = empty (Vite proxy `/api` → `localhost:4000`)
- Backend reads `.env` at project root
- Database: local PostgreSQL on localhost:5432

---

## Project Structure

```
vendorcenter/
├── frontend/              # React SPA (two apps: customer + admin)
│   ├── src/
│   │   ├── pages/         # Customer pages (Index, Login, Register, Services, VendorDetail, Account, Explore)
│   │   ├── admin/         # Admin portal (/company/*) — Dashboard, Vendors, Users, Bookings, Zones
│   │   ├── components/    # Shared + shadcn/ui components, map, layout
│   │   ├── hooks/         # useAuth, useLocation, useAdminAuth, useMobile
│   │   ├── lib/api.ts     # Customer API service layer
│   │   ├── admin/lib/adminApi.ts  # Admin API service layer
│   │   ├── services/      # locationService (geocoding, geolocation)
│   │   └── data/          # Service categories, mock data
│   ├── vercel.json        # SPA routing for Vercel
│   └── vite.config.ts     # Dual entry points, proxy config
│
├── backend/               # Express.js API server
│   ├── src/
│   │   ├── app.ts         # Express setup (CORS, helmet, rate limiting, routes)
│   │   ├── server.ts      # Server startup + embedded email worker
│   │   ├── config/env.ts  # All environment variables
│   │   ├── db/            # PostgreSQL pool, init, state
│   │   ├── middleware/     # auth (JWT + role check), request-context
│   │   ├── modules/       # 17 domain modules (auth, vendors, bookings, etc.)
│   │   ├── services/      # emailService, pdfService, storageService
│   │   ├── workers/       # email.worker.ts
│   │   └── scripts/       # db-bootstrap, db-health, migrations, seed-admin
│   └── Dockerfile
│
├── database/schema.sql    # 15 tables DDL
├── docker-compose.yml     # Dev stack (pg, redis, minio)
└── deploy/                # Production deploy scripts, Caddyfile, preflight
```

---

## Database (15 Tables)

users, auth_sessions, otp_events, activity_logs, bookings, zones, vendor_profiles, vendor_services, vendor_rating_aggregates, reviews, employee_zone_assignments, media_assets, notifications, email_jobs, employee_support_tasks

**Connection**: `DATABASE_URL` takes priority over individual `DB_*` vars. SSL: `rejectUnauthorized: false` for Supabase.

---

## API Modules (17 modules, 50+ endpoints)

auth, otp, vendors, services, bookings, payments, reviews, notifications, location, maps, zones, admin, analytics, employee, uploads, activity, email-test

---

## Key Business Flows

1. **Vendor Onboarding**: Signup → Profile (location, categories, radius) → Auto-approved → Listed
2. **Booking Lifecycle**: pending → confirmed → in_progress → completed → review
3. **Geo Discovery**: Haversine formula + bounding box for nearby vendors
4. **Email Pipeline**: Queue to email_jobs → worker processes every 15s → mock/SMTP
5. **Uploads**: Supabase Storage (prod) / local disk (dev)

---

## How to Work

### Starting Local Dev
```bash
npm run dev:backend    # Backend on :4000
npm run dev:frontend   # Frontend on :3000
```

### Building
```bash
npm run build          # Builds both backend + frontend
npx tsc -p backend/tsconfig.json --noEmit   # Type-check backend
npx tsc -b --noEmit    # Type-check frontend (run from frontend/)
```

### Pushing Changes
```bash
git add <files>
git commit -m "feat/fix: description"
git push origin main
# Railway auto-deploys backend from GitHub
# Vercel auto-deploys frontend from GitHub
```

### Checking Production Health
- Backend: https://vendorcenterbackend-production.up.railway.app/health
- Status: https://vendorcenterbackend-production.up.railway.app/api/status

---

## Important Rules

1. **Always type-check** before committing (`tsc --noEmit`)
2. **Never commit** `.env` files — only `.env.example`
3. **Test locally** before pushing to production
4. **Use parameterized SQL** — never concatenate user input
5. **Validate inputs** with Zod schemas at API boundaries
6. **Role-based access** — always use `requireRole()` middleware on protected routes
7. **Environment-aware code** — must work on both localhost AND production
8. Supabase project ref: `zulcddzffczxzuxvemjc`
9. Redis is NOT used in the codebase
10. Uploads use Supabase REST API (no S3 SDK)

---

## Credential-Gated (Not Yet Connected)

- Payments: Razorpay / Stripe / UPI (adapter exists, no credentials)
- SMTP: Brevo (currently in mock mode)
- SMS/OTP fallback: Not integrated
- Premium map APIs: Beyond free OpenStreetMap

---

## Session Progress Log

### March 12, 2026
- Analyzed entire codebase (frontend + backend + database + deploy)
- Made frontend API layer environment-aware (VITE_API_BASE_URL)
- Updated both api.ts and adminApi.ts for customer + admin apps
- Added SUPABASE_URL + SUPABASE_SERVICE_KEY to backend env config
- Created Supabase Storage bucket (vendorcenter-media) with policies
- Built storageService.ts — Supabase REST API in prod, local disk in dev
- Updated uploads routes for cloud storage
- Removed @aws-sdk/client-s3, using native fetch to Supabase Storage
- Created vercel.json for SPA routing
- Verified all 15 tables exist in production database
- Pushed to GitHub (commit 35fe33b)
- Railway auto-deploy triggered
- Pending: Vercel env var (VITE_API_BASE_URL) + health verification after deploy
