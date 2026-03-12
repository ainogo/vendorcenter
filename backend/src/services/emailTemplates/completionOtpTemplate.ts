import { baseTemplate } from "./baseTemplate.js";

export function completionOtpHtml(opts: {
  code: string;
  serviceName: string;
  vendorName?: string;
  amount?: string;
  paymentLink?: string;
}) {
  const vendorLine = opts.vendorName
    ? `<p style="color:#6b7280;font-size:14px;margin:0 0 4px">Vendor: <strong style="color:#1a1a2e">${opts.vendorName}</strong></p>`
    : "";
  const amountLine = opts.amount
    ? `<p style="color:#6b7280;font-size:14px;margin:0 0 4px">Final Amount: <strong style="color:#1a1a2e;font-size:18px">&#8377; ${opts.amount}</strong></p>`
    : "";
  const paymentSection = opts.paymentLink
    ? `<div style="text-align:center;margin:20px 0">
        <a href="${opts.paymentLink}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#f97316,#ef4444);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">Pay Now</a>
        <p style="color:#9ca3af;font-size:12px;margin:8px 0 0">Click the button above to complete your payment</p>
      </div>`
    : "";

  const content = `
    <h2 style="text-align:center;color:#1a1a2e;margin:0 0 4px;font-size:22px">Work Completion Verification</h2>
    <p style="text-align:center;color:#6b7280;margin:0 0 24px;font-size:14px">Your vendor has completed the work. Please share this OTP with your vendor to confirm.</p>

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:20px;text-align:center;margin-bottom:20px">
      <p style="margin:0 0 8px;color:#9a3412;font-size:13px;font-weight:500">Your Verification Code</p>
      <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#ea580c;font-family:monospace">${opts.code}</div>
      <p style="margin:8px 0 0;color:#c2410c;font-size:12px">Valid for 10 minutes. Do not share unless work is satisfactory.</p>
    </div>

    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:20px">
      <p style="color:#6b7280;font-size:14px;margin:0 0 4px">Service: <strong style="color:#1a1a2e">${opts.serviceName}</strong></p>
      ${vendorLine}
      ${amountLine}
    </div>

    ${paymentSection}

    <p style="text-align:center;color:#9ca3af;font-size:13px">Only share this OTP with your vendor once you are satisfied with the work completed.</p>`;

  return baseTemplate(content, { preheader: `${opts.code} is your work completion verification code` });
}
