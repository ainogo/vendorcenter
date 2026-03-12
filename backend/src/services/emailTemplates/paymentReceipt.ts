import { baseTemplate } from "./baseTemplate.js";

export function paymentReceiptHtml(opts: {
  bookingId: string;
  transactionId: string;
  serviceName: string;
  amount?: string;
  paymentStatus: string;
  paidAt: string;
  vendorName?: string;
}) {
  const vendorLine = opts.vendorName
    ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Vendor</td><td style="padding:6px 0;color:#1a1a2e;font-size:14px;text-align:right;font-weight:500">${opts.vendorName}</td></tr>`
    : "";
  const amountLine = opts.amount
    ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;font-weight:600">Amount</td><td style="padding:6px 0;color:#1a1a2e;font-size:18px;text-align:right;font-weight:700">&#8377; ${opts.amount}</td></tr>`
    : "";

  const statusColor = opts.paymentStatus === "success" ? "#166534" : "#92400e";
  const statusBg = opts.paymentStatus === "success" ? "#f0fdf4" : "#fef3c7";

  const content = `
    <h2 style="text-align:center;color:#1a1a2e;margin:0 0 4px;font-size:22px">Payment Receipt</h2>
    <p style="text-align:center;color:#6b7280;margin:0 0 24px;font-size:14px">Here's your payment confirmation and receipt.</p>

    <div style="background:${statusBg};border-radius:10px;padding:16px;text-align:center;margin-bottom:24px">
      <span style="font-size:28px">${opts.paymentStatus === "success" ? "&#10004;" : "&#9888;"}</span>
      <p style="margin:4px 0 0;color:${statusColor};font-weight:600;font-size:15px">Payment ${opts.paymentStatus === "success" ? "Successful" : opts.paymentStatus.charAt(0).toUpperCase() + opts.paymentStatus.slice(1)}</p>
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr>
        <td style="padding:6px 0;color:#6b7280;font-size:14px">Booking</td>
        <td style="padding:6px 0;color:#1a1a2e;font-size:14px;text-align:right;font-weight:500">#${opts.bookingId.slice(0, 8).toUpperCase()}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#6b7280;font-size:14px">Transaction ID</td>
        <td style="padding:6px 0;color:#1a1a2e;text-align:right;font-family:monospace;font-size:13px">${opts.transactionId}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#6b7280;font-size:14px">Service</td>
        <td style="padding:6px 0;color:#1a1a2e;font-size:14px;text-align:right;font-weight:500">${opts.serviceName}</td>
      </tr>
      ${vendorLine}
      ${amountLine}
      <tr>
        <td style="padding:6px 0;color:#6b7280;font-size:14px">Date</td>
        <td style="padding:6px 0;color:#1a1a2e;font-size:14px;text-align:right">${opts.paidAt}</td>
      </tr>
    </table>

    <p style="text-align:center;color:#9ca3af;font-size:13px">A PDF receipt is attached to this email for your records.</p>`;

  return baseTemplate(content, { preheader: `Payment receipt for booking #${opts.bookingId.slice(0, 8).toUpperCase()}` });
}
