# VendorCenter Hosting on vendorcenter.in

## Production Topology
- Caddy reverse proxy handles HTTPS for vendorcenter.in
- Frontend served behind Caddy
- Backend API proxied at /api/*
- PostgreSQL, Redis, MinIO run in private Docker network

## One-Time Server Setup
1. Install Docker and Docker Compose plugin on Linux VPS.
2. Open firewall ports 80 and 443.
3. Point DNS A records:
   - vendorcenter.in -> VPS public IP
   - www.vendorcenter.in -> VPS public IP

## Local Machine Note
- If `docker --version` is not available, deployment cannot be started from that machine.
- Deploy can still be executed directly on your VPS terminal using the same files.

## Fast Local DB Alignment
- Sync DB credentials to env files:
   - `./deploy/set-db-credentials.ps1 -DbUser <user> -DbPassword <password>`
- Verify local DB connection:
   - `./deploy/verify-local-db.ps1`

## Deploy Steps
1. Copy `.env.production.example` to `.env.production` and fill secrets.
2. Run preflight checks:
   - PowerShell: `./deploy/preflight.ps1`
   - Shell: `sh ./deploy/preflight.sh`
3. Run:
   - PowerShell: `./deploy/deploy.ps1`
   - Shell: `sh ./deploy/deploy.sh`
4. Verify:
   - `https://vendorcenter.in`
   - `https://vendorcenter.in/health`

## Operations
- Check service status: `docker compose --env-file .env.production -f deploy/docker-compose.prod.yml ps`
- Follow logs: `docker compose --env-file .env.production -f deploy/docker-compose.prod.yml logs -f`
- Backup database:
   - PowerShell: `./deploy/backup.ps1`
   - Shell: `sh ./deploy/backup.sh`
- One-command go-live check:
   - PowerShell: `./deploy/go-live-check.ps1 -EnvFile .env.production -ExpectedIp <server-ip>`
   - Shell: `sh ./deploy/go-live-check.sh .env.production <server-ip> vendorcenter.in`

## Notes
- SSL certs are managed automatically by Caddy.
- Keep JWT and DB secrets strong and private.
- For zero-downtime updates, redeploy with the same command.
- Cloudflare DNS checklist: `deploy/CLOUDFLARE-DNS-CHECKLIST.md`
