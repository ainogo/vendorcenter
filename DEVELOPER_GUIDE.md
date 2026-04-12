# VendorCenter — Developer Onboarding Guide

> For any developer taking over this project. Covers full setup, architecture, conventions, and operational knowledge.

---

## 1. Project Overview

VendorCenter is a multi-portal local services marketplace:

| Portal | Web Route | Mobile Flavor | Package Name |
|--------|-----------|---------------|--------------|
| Customer | `/` | `customer` | `com.vendorcenter.customer` |
| Vendor | `/vendor` | `vendor` | `com.vendorcenter.vendor` |
| Admin/Company | `/company` | — | — |

**Stack:** React 18 + Vite + Tailwind (frontend), Express + TypeScript + PostgreSQL (backend), Flutter 3.41 + Dart 3.11 (mobile), Firebase (auth/push/crashlytics/analytics).

**Deployment:** Vercel (frontend), Railway (backend + PostgreSQL), Hugging Face Space (self-hosted LLM), GitHub Releases (APK distribution).

---

## 2. Repository Structure

```
vendorcenter/
├── backend/           # Express API server
│   └── src/
│       ├── config/    # env.ts (all env vars), database config
│       ├── db/        # schema.sql, pool.ts
│       ├── middleware/ # auth, xss-sanitize, rate-limit, uploads
│       ├── modules/   # 20 feature modules (auth, bookings, vendors, etc.)
│       ├── services/  # email, embedding, provider-chain services
│       ├── scripts/   # db-bootstrap, db-health, seed-admin
│       └── workers/   # email worker
├── frontend/          # Vite multi-entry React app
│   └── src/
│       ├── pages/     # Customer portal pages
│       ├── vendor/    # Vendor portal pages
│       ├── admin/     # Company/admin portal pages
│       ├── services/  # api.ts, vendorApi.ts, adminApi.ts
│       ├── components/# Shared UI (Radix + shadcn/ui)
│       └── i18n/      # EN, MR, HI translations
├── mobile/            # Flutter apps (customer + vendor flavors)
│   └── lib/
│       ├── config/    # api_config, router, vendor_router, theme
│       ├── screens/   # 15 feature dirs, 34+ screens
│       ├── services/  # api_service, auth_service, location, notifications
│       ├── widgets/   # Reusable UI components
│       └── i18n/      # Translations
├── deploy/            # Hosting scripts, Docker, Caddy, DNS checklists
├── docs/              # Architecture docs, reports (gitignored — local only)
├── model/             # HF Space Dockerfile, notebooks, training data
└── infra/             # Docker Compose for local PostgreSQL
```

---

## 3. First-Time Setup

### Prerequisites

- **Node.js** 20+ and npm 10+
- **Flutter** 3.41+ and Dart 3.11+
- **Android SDK** API 35 with Java 17
- **PostgreSQL** 15+ with `pgvector` extension
- **Firebase CLI** (for mobile config updates only — do NOT deploy functions)

### Step 1: Clone and Install

```bash
git clone https://github.com/timesprimeaj1/vendorcenter.git
cd vendorcenter
npm install        # Installs backend + frontend workspaces
cd mobile
flutter pub get    # Install Flutter dependencies
cd ..
```

### Step 2: Environment Variables

Create `backend/.env` with these variables:

```env
# Required — App
NODE_ENV=development
PORT=4000
APP_NAME=VendorCenter
APP_URL=http://localhost:3000
API_URL=http://localhost:4000

# Required — Database
DATABASE_URL=postgresql://user:pass@localhost:5432/vendorcenter

# Required — JWT (MUST NOT be defaults in production)
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Required — CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173

# Required — Firebase (for phone auth)
FIREBASE_PROJECT_ID=vendorcenter-staging
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@vendorcenter-staging.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Email (Brevo)
BREVO_API_KEY=your-brevo-key
EMAIL_TRANSPORT_MODE=brevo
EMAIL_FROM_NOREPLY=noreply@vendorcenter.in

# AI Providers (optional for dev)
GEMINI_API_KEY=
GROQ_API_KEY=
SELF_HOSTED_LLM_URL=

# Admin Seed
ADMIN_PASSWORD=your-admin-password

# Security
SECURITY_STRICT_MODE=false

# APK Distribution
CUSTOMER_APK_URL=
VENDOR_APK_URL=
APP_CURRENT_VERSION=1.0.0
APP_FORCE_UPDATE=false
```

### Step 3: Database Setup

```bash
npm run db:bootstrap   # Creates all 24 tables + pgvector + indexes
npm run db:health      # Verify connection and table count
npm run db:seed-admin  # Create admin user (requires ADMIN_PASSWORD env)
```

### Step 4: Run Development Servers

In separate terminals:

```bash
npm run dev:backend    # Express on http://localhost:4000
npm run dev:frontend   # Vite on http://localhost:3000 (all 3 portals)
```

### Step 5: Run Mobile

```bash
cd mobile
flutter run --flavor customer -t lib/main.dart       # Customer app
flutter run --flavor vendor -t lib/vendor_main.dart   # Vendor app
```

Mobile API target: edit `mobile/lib/config/api_config.dart` to point to your local backend IP.

---

## 4. Backend Architecture

### Module Pattern

Every backend module follows this structure:

```
modules/<name>/
  ├── <name>.routes.ts      # Express router with Zod validation
  ├── <name>.repository.ts  # SQL queries (raw pg, no ORM)
  └── <name>.service.ts     # Business logic (optional)
```

### 20 Backend Modules

| Module | Key Endpoints | Notes |
|--------|--------------|-------|
| `auth` | POST /login, /signup, /phone-login, /phone-otp-gate, /forgot-password | Firebase phone + email auth |
| `bookings` | CRUD + status workflow + OTP completion | vendor_id ownership checks |
| `vendors` | Profile CRUD, public search, onboarding | LEFT JOINs use `::text` cast for UUID |
| `services` | Vendor service CRUD | Linked to vendor_profiles |
| `reviews` | Public list, create, vendor stats | Rating aggregates cached |
| `zones` | Legacy flat zones | See service-zones for new system |
| `service-zones` | 4-level hierarchy (State→Zone→Area→Pincode) | India Post API integration |
| `customer-addresses` | Address CRUD, max 10 per user | Serviceability check |
| `notifications` | In-app notifications | FCM push is separate |
| `uploads` | Image/doc upload to local disk | Multer middleware |
| `admin` | User management, vendor approval | requireRole('admin') |
| `analytics` | Install tracking | Device + version breakdown |
| `ai-assistant` | Chat endpoint, semantic search | Provider chain fallback |
| `payments` | Payment status tracking | No payment gateway yet |
| `employee` | Employee management | Zone-based assignments |
| `otp` | OTP events logging | Platform-wide rate limits |

### Middleware Stack

1. `helmet` — Security headers
2. `cors` — Configurable per env
3. `xss-sanitize` — Strips HTML/script from all input
4. `express-rate-limit` — API rate limiting
5. `auth` middleware — JWT verification, `requireRole()`, `optionalAuth()`

### Database

- **24 tables** — see `backend/src/db/schema.sql`
- **Raw SQL** — no ORM, uses `pg` pool directly
- **pgvector** — for AI semantic search (service_category_embeddings, faq_embeddings)
- **Key constraints:** `users_phone_role_unique` (phone+role), email+role unique indexes

---

## 5. Frontend Architecture

### Multi-Entry Vite App

Three HTML entry points, one Vite config:

| Entry | HTML | React Root | API Service |
|-------|------|------------|-------------|
| Customer | `index.html` | `main.tsx` → `App.tsx` | `services/api.ts` |
| Vendor | `vendor.html` | `vendor-main.tsx` | `services/vendorApi.ts` |
| Company | `company.html` | `company-main.tsx` | `admin/services/adminApi.ts` |

### Key Libraries

- **UI:** Radix UI + shadcn/ui components, Tailwind CSS
- **State:** React Query (`@tanstack/react-query`) for server state
- **Forms:** react-hook-form + Zod validation
- **Maps:** Leaflet + react-leaflet
- **i18n:** i18next (EN, MR, HI)
- **Animations:** GSAP ScrollTrigger, Framer Motion

### API Proxy

`vercel.json` proxies `/api/*` to Railway backend in production. In dev, Vite proxy handles it.

---

## 6. Mobile Architecture (Flutter)

### Two Flavors, One Codebase

| Flavor | Entry | Router | App Name | Package |
|--------|-------|--------|----------|---------|
| Customer | `lib/main.dart` | `config/router.dart` | VendorCenter | `com.vendorcenter.customer` |
| Vendor | `lib/vendor_main.dart` | `config/vendor_router.dart` | VendorPortal | `com.vendorcenter.vendor` |

### Key Services

| Service | File | Purpose |
|---------|------|---------|
| `ApiService` | `services/api_service.dart` | Singleton Dio client, JWT auto-refresh |
| `AuthService` | `services/auth_service.dart` | Login state, role validation |
| `LocationService` | `services/location_service.dart` | GPS + reverse geocoding |
| `NotificationService` | `services/notification_service.dart` | FCM + local notifications |
| `UpdateService` | `services/update_service.dart` | APK version check + download |
| `PermissionService` | `services/permission_service.dart` | Centralized permission requests |

### Screen Count

- **Customer screens:** 18 dirs, ~24 screens (home, explore, search, bookings, reviews, addresses, chat, favorites, profile, etc.)
- **Vendor screens:** 14 screens (dashboard, bookings, booking detail, services, reviews, earnings, profile, onboarding, availability, etc.)

### Firebase Config

- `google-services.json` per flavor: `android/app/src/customer/` and `android/app/src/vendor/`
- Firebase project: `vendorcenter-staging`
- Crashlytics + Analytics: active in release builds only
- App Check: Play Integrity provider

---

## 7. Critical Conventions (MUST READ)

### Backend Returns camelCase — ALWAYS

The backend converts all SQL snake_case columns to camelCase in JSON responses. Every mobile/frontend consumer MUST read camelCase keys first:

```dart
// CORRECT — camelCase first, snake_case fallback
final name = data['customerName'] ?? data['customer_name'] ?? 'Unknown';
final date = data['scheduledDate'] ?? data['scheduled_date'] ?? '';

// WRONG — will miss most data
final name = data['customer_name'];
```

**This is the #1 recurring bug pattern in this project.** Every new screen must follow this convention.

### Role-Scoped Auth

- Every auth endpoint MUST send `role` parameter
- Every mobile router MUST validate user role matches app flavor
- Phone login already enforced — email login was added later (verify both)

### OTP Billing Protection

- `POST /auth/phone-otp-gate` — hard 3/phone/day + 9/platform/day limit
- Firebase Blaze plan charges per SMS beyond free tier
- Gate is **fail-closed** — errors block OTP, never allow
- NEVER modify OTP gate limits without explicit owner approval

### Security Rules

- JWT defaults blocked in production (`process.exit(1)`)
- `password_hash` NEVER in RETURNING clauses (except auth comparison)
- XSS sanitization active on all routes
- Upload errors sanitized (no filesystem paths leaked)
- CORS: explicit origins only, no wildcards in production
- Admin seed requires `ADMIN_PASSWORD` env var (no hardcoded fallback)

---

## 8. Database Schema (24 Tables)

| Table | Purpose |
|-------|---------|
| `users` | All user accounts (customer, vendor, employee, admin) |
| `user_roles` | Role assignments |
| `auth_sessions` | JWT refresh token tracking |
| `otp_events` | OTP rate limiting and audit |
| `device_tokens` | FCM push tokens |
| `activity_logs` | User activity audit |
| `vendor_profiles` | Business info, ratings, zone |
| `vendor_services` | Services offered by vendors |
| `vendor_service_history` | Service edit audit trail |
| `vendor_weekly_slots` | Recurring availability schedule |
| `vendor_blocked_dates` | Vendor blackout dates |
| `bookings` | Core booking records |
| `reviews` | Customer reviews and ratings |
| `vendor_rating_aggregates` | Cached rating statistics |
| `zones` | Legacy geographic zones |
| `employee_zone_assignments` | Employee coverage areas |
| `media_assets` | Upload metadata |
| `notifications` | In-app notification records |
| `email_jobs` | Email queue |
| `employee_support_tasks` | Support tickets |
| `ai_query_logs` | AI chat logging |
| `service_category_embeddings` | pgvector semantic search |
| `faq_embeddings` | FAQ semantic search |
| `app_installs` | Mobile install tracking |

### Key Constraints

- `users_phone_role_unique ON users (phone, role) WHERE phone IS NOT NULL AND phone != ''`
- Email+role unique indexes (per-role, not global)
- Firebase UID+role unique indexes
- `vendor_profiles.vendor_id` is TEXT (cast with `::text` when joining to `users.id` UUID)

---

## 9. Deployment

### Production URLs

| Service | Platform | URL |
|---------|----------|-----|
| Backend API | Railway | `vendorcenter-production.up.railway.app` |
| Customer Web | Vercel | `vendorcenter.in` |
| Vendor Web | Vercel | `vendorcenter.in/vendor` |
| Admin Web | Vercel | `vendorcenter.in/company` |
| Self-hosted LLM | HF Space | `timesprimeaj/vendorcenter-assistant` |

### Deployment Triggers

- **Railway:** Auto-deploys on push to `main` branch (linked to GitHub repo)
- **Vercel:** Auto-deploys on push to `main` branch (linked to GitHub repo)
- **HF Space:** Manual push to Hugging Face model repo

### Railway Environment Variables

Required on Railway (backend):

```
NODE_ENV=production
DATABASE_URL=<railway-postgres-url>
JWT_ACCESS_SECRET=<real-secret>
JWT_REFRESH_SECRET=<real-secret>
CORS_ORIGINS=https://vendorcenter.in,https://www.vendorcenter.in
FIREBASE_PROJECT_ID=vendorcenter-staging
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY=<service-account-key>
BREVO_API_KEY=<brevo-key>
EMAIL_TRANSPORT_MODE=brevo
SECURITY_STRICT_MODE=false
ADMIN_PASSWORD=<admin-password>
GEMINI_API_KEY=<key>
GROQ_API_KEY=<key>
CUSTOMER_APK_URL=<github-release-url>
VENDOR_APK_URL=<github-release-url>
APP_CURRENT_VERSION=1.0.0
```

### Build Commands

```bash
# Full validation before push
npm run build                    # Backend tsc + Frontend Vite

# Mobile release APKs
cd mobile
flutter build apk --release --flavor customer -t lib/main.dart
flutter build apk --release --flavor vendor -t lib/vendor_main.dart
```

---

## 10. Common Patterns

### Adding a New Backend Module

1. Create `backend/src/modules/<name>/`
2. Add `<name>.routes.ts` with Express router + Zod schemas
3. Add `<name>.repository.ts` with raw SQL queries
4. Register routes in `backend/src/app.ts`
5. Add migration SQL to `backend/src/db/schema.sql`

### Adding a New Mobile Screen

1. Create screen file in `mobile/lib/screens/<feature>/`
2. Add route in `config/router.dart` (customer) or `config/vendor_router.dart` (vendor)
3. Add API method in `services/api_service.dart`
4. **Read backend data with camelCase keys first, snake_case fallback**
5. Run `flutter analyze` before committing

### Adding a New Frontend Page

1. Create page in `frontend/src/pages/` (customer), `frontend/src/vendor/` (vendor), or `frontend/src/admin/` (admin)
2. Add route in the corresponding router
3. Add API method in the corresponding API service file
4. Use existing Radix/shadcn components from `frontend/src/components/ui/`

---

## 11. Testing and Validation

Currently no automated test suite. Validation is manual:

```bash
npm run build          # Must pass clean (tsc + vite)
cd mobile
flutter analyze        # Must show 0 issues
flutter build apk --release --flavor customer -t lib/main.dart   # Must succeed
flutter build apk --release --flavor vendor -t lib/vendor_main.dart   # Must succeed
```

### Before Every Push

1. `npm run build` passes
2. `flutter analyze` shows 0 issues
3. Both APKs build successfully
4. No `.env` or secrets in diff
5. Changed files are intentional (no stray edits)

---

## 12. Known Technical Debt

1. **No automated tests** — validation is manual build + analyze
2. **No ORM** — raw SQL everywhere, migrations are manual schema.sql edits
3. **UUID/TEXT mismatch** — `vendor_profiles.vendor_id` is TEXT, `users.id` is UUID; requires `::text` casts
4. **Legacy zones** — old `zones` table coexists with new `service_zones` hierarchy
5. **No payment gateway** — payment tracking is manual status updates
6. **Debug signing** — mobile apps use debug keystore, no release signing configured yet
7. **Self-hosted LLM** — HF Space free tier may be unreliable; Groq/Gemini fallback handles this

---

## 13. Contacts and Accounts

| Service | Account/Project |
|---------|----------------|
| GitHub | `timesprimeaj1/vendorcenter` |
| Firebase | Project: `vendorcenter-staging` |
| Railway | VendorCenter backend + PostgreSQL |
| Vercel | Frontend deployment |
| Brevo | Email transactional API |
| HF Space | `timesprimeaj/vendorcenter-assistant` |

---

## 14. Quick Reference Commands

```bash
# Development
npm run dev:backend              # Start backend
npm run dev:frontend             # Start frontend (all portals)
npm run dev:company              # Start company portal only

# Database
npm run db:bootstrap             # Create/migrate schema
npm run db:health                # Check DB connection
npm run db:seed-admin            # Seed admin (needs ADMIN_PASSWORD)

# Build
npm run build                    # Full build validation

# Mobile
cd mobile
flutter pub get                  # Install deps
flutter run --flavor customer -t lib/main.dart
flutter run --flavor vendor -t lib/vendor_main.dart
flutter build apk --release --flavor customer -t lib/main.dart
flutter build apk --release --flavor vendor -t lib/vendor_main.dart
flutter analyze                  # Static analysis
```
