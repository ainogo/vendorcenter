/**
 * Dev/test endpoints for verifying transactional email delivery.
 * Only available when NODE_ENV === "development".
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { sendOtpEmail, sendBookingConfirmation, sendPaymentReceipt } from "../../services/emailService.js";
import { generateBookingReceipt } from "../../services/pdfService.js";
import { processQueuedEmailJobs } from "../notifications/notifications.repository.js";

export const emailTestRouter = Router();

// Guard: only in development
emailTestRouter.use((_req: Request, res: Response, next) => {
  if (env.nodeEnv !== "development") {
    res.status(403).json({ success: false, error: "Test endpoints disabled in production" });
    return;
  }
  next();
});

emailTestRouter.post("/otp", async (req, res) => {
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
  // Immediately process to send via SMTP right now
  const sent = await processQueuedEmailJobs(5);
  res.status(201).json({
    success: true,
    data: { emailJob: job, processedNow: sent, note: "Test OTP email sent with code 123456" },
  });
});

emailTestRouter.post("/booking", async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }
  const job = await sendBookingConfirmation({
    recipientEmail: parsed.data.email,
    bookingId: "00000000-test-booking",
    serviceName: "AC Repair & Service",
    vendorName: "QuickFix Services",
    transactionId: "txn_testABC123",
    status: "confirmed",
    createdAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    location: "Sector 62, Noida",
    amount: "1,499.00",
  });
  const sent = await processQueuedEmailJobs(5);
  res.status(201).json({
    success: true,
    data: { emailJob: job, processedNow: sent, note: "Test booking confirmation email sent" },
  });
});

emailTestRouter.post("/receipt", async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const pdfBuffer = await generateBookingReceipt({
    bookingId: "00000000-test-receipt",
    transactionId: "txn_testABC123",
    serviceName: "AC Repair & Service",
    customerEmail: parsed.data.email,
    customerName: "Test Customer",
    vendorName: "QuickFix Services",
    amount: "1,499.00",
    paymentStatus: "success",
    date: now,
  });
  const job = await sendPaymentReceipt({
    recipientEmail: parsed.data.email,
    bookingId: "00000000-test-receipt",
    transactionId: "txn_testABC123",
    serviceName: "AC Repair & Service",
    amount: "1,499.00",
    paymentStatus: "success",
    paidAt: now,
    vendorName: "QuickFix Services",
    pdfBuffer,
  });
  const sent = await processQueuedEmailJobs(5);
  res.status(201).json({
    success: true,
    data: { emailJob: job, processedNow: sent, note: "Test payment receipt email with PDF attachment sent" },
  });
});

emailTestRouter.get("/status", async (_req, res) => {
  res.json({
    success: true,
    data: {
      smtpHost: env.smtpHost,
      smtpPort: env.smtpPort,
      smtpUser: env.smtpUser ? `${env.smtpUser.slice(0, 6)}...` : "(not set)",
      smtpPassSet: !!env.smtpPass,
      transportMode: env.emailTransportMode,
      senders: {
        otp: "otp@vendorcenter.in",
        noreply: env.emailFromNoreply,
        payments: "payments@vendorcenter.in",
        vendors: "vendors@vendorcenter.in",
        support: "support@vendorcenter.in",
      },
    },
  });
});
