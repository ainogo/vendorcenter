import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../middleware/auth.js";
import { AuthRequest } from "../../middleware/auth.js";
import { trackActivity } from "../activity/activity.service.js";
import {
  createNotification,
  listNotifications,
  listEmailJobs,
  processQueuedEmailJobs,
  queueEmailJob
} from "./notifications.repository.js";
import { sendOtpEmail, sendBookingConfirmation, sendPaymentReceipt } from "../../services/emailService.js";
import { generateBookingReceipt } from "../../services/pdfService.js";

export const notificationsRouter = Router();

notificationsRouter.get("/templates", requireRole(["admin", "employee"]), (_req, res) => {
  res.json({
    success: true,
    data: {
      emailProvider: "Brevo SMTP",
      identities: [
        "noreply@vendorcenter.in",
        "otp@vendorcenter.in",
        "payments@vendorcenter.in",
        "bookings@vendorcenter.in",
        "support@vendorcenter.in",
        "vendors@vendorcenter.in",
        "admin@vendorcenter.in"
      ],
      triggers: {
        otp_verification: "otp@vendorcenter.in",
        booking_confirmations: "bookings@vendorcenter.in",
        payment_receipts: "payments@vendorcenter.in",
        system_notifications: "noreply@vendorcenter.in",
        vendor_communication: "vendors@vendorcenter.in",
        customer_support: "support@vendorcenter.in",
        admin_alerts: "admin@vendorcenter.in"
      }
    }
  });
});

notificationsRouter.post("/emit", requireRole(["admin", "employee", "vendor", "customer"]), async (req: AuthRequest, res) => {
  const parsed = z
    .object({
      recipientId: z.string().min(2),
      recipientRole: z.enum(["customer", "vendor", "admin", "employee"]),
      category: z.string().min(2),
      title: z.string().min(2),
      message: z.string().min(2),
      payload: z.record(z.unknown()).optional(),
      email: z
        .object({
          recipientEmail: z.string().email(),
          senderEmail: z.string().email(),
          subject: z.string().min(2),
          bodyHtml: z.string().min(2)
        })
        .optional()
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const notification = await createNotification(parsed.data);

  let emailJob = null;
  if (parsed.data.email) {
    emailJob = await queueEmailJob(parsed.data.email);
  }

  trackActivity({
    actorId: req.actor!.id,
    role: req.actor!.role,
    action: "notification.emitted",
    entity: "notification",
    metadata: { category: parsed.data.category, recipientId: parsed.data.recipientId }
  });

  res.status(201).json({ success: true, data: { notification, emailJob } });
});

notificationsRouter.get("/my", requireRole(["customer", "vendor", "admin", "employee"]), async (req: AuthRequest, res) => {
  res.json({ success: true, data: await listNotifications(req.actor!.id) });
});

notificationsRouter.get("/email-jobs", requireRole(["admin", "employee"]), async (_req, res) => {
  res.json({ success: true, data: await listEmailJobs() });
});

notificationsRouter.post("/email-jobs/process", requireRole(["admin"]), async (_req, res) => {
  const processed = await processQueuedEmailJobs();
  res.json({ success: true, data: { processed } });
});

// ── Test email endpoints (admin only, dev/staging) ──

notificationsRouter.post("/test/otp-email", requireRole(["admin"]), async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }
  const job = await sendOtpEmail({
    recipientEmail: parsed.data.email,
    code: "123456",
    purpose: "signup",
    expiryMinutes: 5,
  });
  res.status(201).json({ success: true, data: { emailJob: job, note: "Test OTP email queued with code 123456" } });
});

notificationsRouter.post("/test/booking-email", requireRole(["admin"]), async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }
  const job = await sendBookingConfirmation({
    recipientEmail: parsed.data.email,
    bookingId: "00000000-test-booking",
    serviceName: "Test AC Repair Service",
    vendorName: "Demo Vendor",
    transactionId: "txn_test12345",
    status: "pending",
    createdAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
  });
  res.status(201).json({ success: true, data: { emailJob: job, note: "Test booking confirmation email queued" } });
});

notificationsRouter.post("/test/receipt-email", requireRole(["admin"]), async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const pdfBuffer = await generateBookingReceipt({
    bookingId: "00000000-test-receipt",
    transactionId: "txn_test12345",
    serviceName: "Test AC Repair Service",
    customerEmail: parsed.data.email,
    vendorName: "Demo Vendor",
    amount: "1,500.00",
    paymentStatus: "success",
    date: now,
  });
  const job = await sendPaymentReceipt({
    recipientEmail: parsed.data.email,
    bookingId: "00000000-test-receipt",
    transactionId: "txn_test12345",
    serviceName: "Test AC Repair Service",
    amount: "1,500.00",
    paymentStatus: "success",
    paidAt: now,
    vendorName: "Demo Vendor",
    pdfBuffer,
  });
  res.status(201).json({ success: true, data: { emailJob: job, note: "Test payment receipt email with PDF attachment queued" } });
});
