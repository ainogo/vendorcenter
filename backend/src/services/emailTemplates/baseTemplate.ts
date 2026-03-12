/**
 * Base HTML email template wrapper for VendorCenter.
 * All transactional emails use this consistent layout.
 */

export function baseTemplate(content: string, options?: { preheader?: string }) {
  const preheader = options?.preheader
    ? `<span style="display:none;font-size:1px;color:#fff;max-height:0;overflow:hidden">${options.preheader}</span>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>VendorCenter</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 16px;text-align:center;border-bottom:1px solid #f0f0f0">
              <div style="display:inline-block;width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#f97316,#ef4444);line-height:44px;color:#fff;font-weight:bold;font-size:20px;text-align:center">V</div>
              <div style="margin-top:8px;font-size:18px;font-weight:600;color:#1a1a2e">VendorCenter</div>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:28px 32px">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center">
              <p style="margin:0;font-size:12px;color:#9ca3af">&copy; ${new Date().getFullYear()} VendorCenter &middot; vendorcenter.in</p>
              <p style="margin:4px 0 0;font-size:11px;color:#c0c0c0">This is an automated message. Please do not reply directly.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
