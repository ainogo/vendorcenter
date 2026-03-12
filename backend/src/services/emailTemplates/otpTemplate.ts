import { baseTemplate } from "./baseTemplate.js";

export function otpEmailHtml(opts: {
  code: string;
  purposeLabel: string;
  expiryMinutes: number;
}) {
  const content = `
    <h2 style="text-align:center;color:#1a1a2e;margin:0 0 8px;font-size:22px">${opts.purposeLabel} Code</h2>
    <p style="text-align:center;color:#6b7280;margin:0 0 24px;font-size:14px">Use this code to verify your identity on VendorCenter</p>
    <div style="background:#f3f4f6;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
      <span style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#1a1a2e;font-family:monospace">${opts.code}</span>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:13px">
      This code expires in <strong>${opts.expiryMinutes} minutes</strong>.<br>
      If you didn&rsquo;t request this, please ignore this email.
    </p>`;

  return baseTemplate(content, { preheader: `${opts.code} is your VendorCenter ${opts.purposeLabel} code` });
}
