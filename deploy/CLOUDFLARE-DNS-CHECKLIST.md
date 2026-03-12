# Cloudflare DNS Checklist for vendorcenter.in

## Zone Setup
- Add domain vendorcenter.in in Cloudflare.
- Nameservers from Cloudflare must be set at domain registrar.

## DNS Records
- A record: vendorcenter.in -> <YOUR_SERVER_PUBLIC_IP>
- A record: www -> <YOUR_SERVER_PUBLIC_IP>

## Proxy Mode
- Keep proxy ON (orange cloud) for website records.

## SSL/TLS
- Cloudflare SSL mode: Full (strict) after origin cert is active.
- Automatic HTTPS Rewrites: ON.
- Always Use HTTPS: ON.

## Validation
- Run PowerShell check:
  - ./deploy/cloudflare-preflight.ps1 -ExpectedIp <YOUR_SERVER_PUBLIC_IP>
- Verify in browser:
  - https://vendorcenter.in
  - https://vendorcenter.in/health

## Common Fixes
- If DNS still old, wait for propagation and clear local DNS cache.
- If HTTPS loops, confirm Cloudflare SSL mode and origin cert setup.
