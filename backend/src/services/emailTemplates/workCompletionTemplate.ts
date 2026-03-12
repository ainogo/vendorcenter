import { baseTemplate } from "./baseTemplate.js";

export function workCompletionHtml(opts: {
  bookingId: string;
  serviceName: string;
  vendorName?: string;
  amount?: string;
  completedAt: string;
}) {
  const vendorLine = opts.vendorName
    ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Vendor</td><td style="padding:6px 0;color:#1a1a2e;font-size:14px;text-align:right;font-weight:500">${opts.vendorName}</td></tr>`
    : "";
  const amountLine = opts.amount
    ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;font-weight:600">Amount</td><td style="padding:6px 0;color:#1a1a2e;font-size:18px;text-align:right;font-weight:700">&#8377; ${opts.amount}</td></tr>`
    : "";

  const content = `
    <h2 style="text-align:center;color:#1a1a2e;margin:0 0 4px;font-size:22px">Work Completed! &#127881;</h2>
    <p style="text-align:center;color:#6b7280;margin:0 0 24px;font-size:14px">Your service has been successfully completed and verified.</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px">
      <span style="font-size:36px">&#10004;</span>
      <p style="margin:8px 0 0;color:#166534;font-weight:600;font-size:16px">Service Completed Successfully</p>
      <p style="margin:4px 0 0;color:#15803d;font-size:13px">Booking #${opts.bookingId.slice(0, 8).toUpperCase()}</p>
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr>
        <td style="padding:6px 0;color:#6b7280;font-size:14px">Service</td>
        <td style="padding:6px 0;color:#1a1a2e;font-size:14px;text-align:right;font-weight:500">${opts.serviceName}</td>
      </tr>
      ${vendorLine}
      ${amountLine}
      <tr>
        <td style="padding:6px 0;color:#6b7280;font-size:14px">Completed On</td>
        <td style="padding:6px 0;color:#1a1a2e;font-size:14px;text-align:right">${opts.completedAt}</td>
      </tr>
    </table>

    <p style="text-align:center;color:#6b7280;font-size:14px">Thank you for using VendorCenter. We hope you had a great experience!</p>
    <p style="text-align:center;color:#9ca3af;font-size:13px">You can view the receipt and booking details in your VendorCenter dashboard.</p>`;

  return baseTemplate(content, { preheader: `Your ${opts.serviceName} service has been completed successfully!` });
}
