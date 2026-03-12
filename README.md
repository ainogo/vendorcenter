# VendorCenter

VendorCenter is a scalable location-based vendor marketplace platform for service discovery, booking, onboarding, and operations.

## Project Status
- System architecture blueprint approved
- Modular workspace scaffold created
- External API integrations intentionally not connected yet

## Top-Level Modules
- frontend
- backend
- database
- api
- auth
- services
- bookings
- payments
- emails
- notifications
- uploads
- analytics
- zones
- maps
- admin
- vendor
- customer
- employee
- logs
- config

## Architecture Direction
- Frontend: marketplace web app with role-based dashboards
- Backend: modular domain services with event-driven notifications and analytics
- Data: PostgreSQL + Redis + object storage
- Maps: OpenStreetMap + Leaflet
- Email: Brevo SMTP
- Deploy: Docker-ready, environment-driven configuration

## Local Database (PostgreSQL)
- Default port: 5432
- App defaults are already aligned to PostgreSQL on localhost:5432
- Schema bootstrap file: database/schema.sql

## Production Hosting (vendorcenter.in)
- Reverse proxy and TLS: deploy/Caddyfile
- Production compose stack: deploy/docker-compose.prod.yml
- Production env template: .env.production.example
- Deploy scripts: deploy/deploy.ps1 and deploy/deploy.sh
- Hosting runbook: deploy/HOSTING.md

## DB Quick Fix Scripts
- Sync PostgreSQL credentials into env files:
	- `./deploy/set-db-credentials.ps1 -DbUser <user> -DbPassword <password>`
- Verify local DB connectivity:
	- `./deploy/verify-local-db.ps1`
	- `npm run db:health`

## Cloudflare DNS Validation
- DNS checklist: deploy/CLOUDFLARE-DNS-CHECKLIST.md
- Preflight command:
	- `./deploy/cloudflare-preflight.ps1 -ExpectedIp <server-ip>`
- Full go-live validation:
	- `./deploy/go-live-check.ps1 -EnvFile .env.production -ExpectedIp <server-ip>`

## Next Implementation Milestones
1. Vendor documents and media object storage pipeline
2. Review and ratings persistence with aggregate updater
3. Map and geo-distance queries for nearby vendor discovery
4. Notification worker queue and email templates
5. Admin and employee operational UI workflows
6. AI-ready event stream and feature flags

## External Credentials Policy
Before connecting external APIs (payment, SMTP, SMS, map premium providers), credentials must be provided by the owner.

## Credential-Gated Integrations
- Payments (Razorpay, Stripe, UPI, Wallets): credentials required before adapter activation
- Brevo SMTP production mode: credentials required before live email delivery
- SMS providers for OTP fallback: credentials required before integration
- Third-party map APIs beyond OpenStreetMap: credentials required before integration
