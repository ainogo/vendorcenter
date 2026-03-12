import { Router } from "express";
import crypto from "node:crypto";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireRole } from "../../middleware/auth.js";
import { AuthRequest } from "../../middleware/auth.js";
import { createBooking, listBookingsByRole, updateBookingStatus, getBookingById, updateBookingFinalAmount, setCompletionOtp, getCompletionOtp, clearCompletionOtp } from "./bookings.repository.js";
import { trackActivity } from "../activity/activity.service.js";
import { sendBookingConfirmation, sendPaymentReceipt, sendNotificationEmail } from "../../services/emailService.js";
import { findUserById } from "../auth/auth.repository.js";
import { generateBookingReceipt } from "../../services/pdfService.js";
import { getVendorProfile } from "../vendors/vendors.repository.js";
import { env } from "../../config/env.js";

const statusSchema = z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]);

export const bookingsRouter = Router();

bookingsRouter.post("/", requireRole(["customer"]), async (req: AuthRequest, res) => {
  const parsed = z
    .object({
      vendorId: z.string().min(3),
      serviceName: z.string().min(2),
      scheduledDate: z.string().optional(),
      scheduledTime: z.string().optional(),
      notes: z.string().max(500).optional()
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const booking = await createBooking({
    customerId: req.actor!.id,
    vendorId: parsed.data.vendorId,
    serviceName: parsed.data.serviceName,
    transactionId: `txn_${nanoid(12)}`,
    scheduledDate: parsed.data.scheduledDate,
    scheduledTime: parsed.data.scheduledTime,
    notes: parsed.data.notes
  });
  trackActivity({
    actorId: req.actor!.id,
    role: req.actor!.role,
    action: "booking.created",
    entity: "booking",
    metadata: { bookingId: booking.id, vendorId: booking.vendorId }
  });

  // Send booking confirmation email
  const customer = await findUserById(req.actor!.id);
  if (customer?.email) {
    sendBookingConfirmation({
      recipientEmail: customer.email,
      bookingId: booking.id,
      serviceName: booking.serviceName,
      transactionId: booking.transactionId,
      status: booking.status,
      createdAt: new Date(booking.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    }).catch((err) => console.error("[booking] failed to queue confirmation email", err));
  }

  res.status(201).json({ success: true, data: booking });
});

bookingsRouter.patch("/:bookingId/status", requireRole(["vendor", "admin", "employee"]), async (req: AuthRequest, res) => {
  const parsed = z.object({ status: statusSchema }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const booking = await updateBookingStatus(req.params.bookingId, parsed.data.status);
  if (!booking) {
    res.status(404).json({ success: false, error: "Booking not found" });
    return;
  }

  trackActivity({
    actorId: req.actor!.id,
    role: req.actor!.role,
    action: "booking.status_updated",
    entity: "booking",
    metadata: { bookingId: booking.id, status: booking.status }
  });

  // Send confirmation email to customer when vendor confirms the booking
  if (parsed.data.status === "confirmed") {
    const customer = await findUserById(booking.customerId);
    const vendorProfile = await getVendorProfile(booking.vendorId);
    if (customer?.email) {
      sendBookingConfirmation({
        recipientEmail: customer.email,
        bookingId: booking.id,
        serviceName: booking.serviceName,
        vendorName: vendorProfile?.businessName || undefined,
        transactionId: booking.transactionId,
        status: "confirmed",
        createdAt: new Date(booking.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        location: vendorProfile?.zone || undefined,
      }).catch((err) => console.error("[booking] failed to send acceptance email", err));
    }
  }

  res.json({ success: true, data: booking });
});

bookingsRouter.get("/", requireRole(["customer", "vendor", "admin", "employee"]), async (req: AuthRequest, res) => {
  const bookings = await listBookingsByRole(req.actor!.role, req.actor!.id);
  res.json({ success: true, data: bookings });
});

bookingsRouter.get("/:bookingId/receipt", requireRole(["customer", "vendor", "admin", "employee"]), async (req: AuthRequest, res) => {
  const booking = await getBookingById(req.params.bookingId);
  if (!booking) {
    res.status(404).json({ success: false, error: "Booking not found" });
    return;
  }

  // Only allow the customer or vendor of this booking (or admin/employee) to download
  if (req.actor!.role === "customer" && booking.customerId !== req.actor!.id) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }
  if (req.actor!.role === "vendor" && booking.vendorId !== req.actor!.id) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }

  const customer = await findUserById(booking.customerId);
  const vendorProfile = await getVendorProfile(booking.vendorId);

  const pdfBuffer = await generateBookingReceipt({
    bookingId: booking.id,
    transactionId: booking.transactionId,
    serviceName: booking.serviceName,
    customerEmail: customer?.email || "",
    customerName: customer?.name || undefined,
    vendorName: vendorProfile?.businessName || undefined,
    paymentStatus: booking.paymentStatus,
    date: new Date(booking.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="receipt-${booking.id.slice(0, 8)}.pdf"`);
  res.send(pdfBuffer);
});

// ── Vendor adjusts final amount ──
bookingsRouter.patch("/:bookingId/final-amount", requireRole(["vendor"]), async (req: AuthRequest, res) => {
  const parsed = z.object({ amount: z.number().min(0) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const booking = await getBookingById(req.params.bookingId);
  if (!booking) {
    res.status(404).json({ success: false, error: "Booking not found" });
    return;
  }
  if (booking.vendorId !== req.actor!.id) {
    res.status(403).json({ success: false, error: "Not your booking" });
    return;
  }
  if (booking.status === "completed" || booking.status === "cancelled") {
    res.status(400).json({ success: false, error: "Cannot adjust amount for this booking status" });
    return;
  }

  const updated = await updateBookingFinalAmount(req.params.bookingId, parsed.data.amount);
  res.json({ success: true, data: updated });
});

// ── Vendor marks work done → sends completion OTP + payment link to customer ──
bookingsRouter.post("/:bookingId/complete", requireRole(["vendor"]), async (req: AuthRequest, res) => {
  const booking = await getBookingById(req.params.bookingId);
  if (!booking) {
    res.status(404).json({ success: false, error: "Booking not found" });
    return;
  }
  if (booking.vendorId !== req.actor!.id) {
    res.status(403).json({ success: false, error: "Not your booking" });
    return;
  }
  if (booking.status !== "in_progress") {
    res.status(400).json({ success: false, error: "Booking must be in progress to mark complete" });
    return;
  }

  // Generate 6-digit OTP
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = crypto.createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await setCompletionOtp(booking.id, otpHash, expiresAt);

  const customer = await findUserById(booking.customerId);
  const vendorProfile = await getVendorProfile(booking.vendorId);
  const amountStr = booking.finalAmount ? (booking.finalAmount / 100).toFixed(2) : undefined;

  // Demo payment link
  const paymentLink = `https://vendorcenter.in/pay/${booking.id}?amount=${booking.finalAmount ?? 0}&txn=${booking.transactionId}`;

  if (customer?.email) {
    // Send OTP + payment link email from payments@vendorcenter.in
    const { sendCompletionOtpEmail } = await import("../../services/emailService.js");
    sendCompletionOtpEmail({
      recipientEmail: customer.email,
      code,
      serviceName: booking.serviceName,
      vendorName: vendorProfile?.businessName || undefined,
      amount: amountStr,
      paymentLink,
    }).catch((err) => console.error("[booking] failed to send completion OTP email", err));

    // Also send payment receipt from payments@vendorcenter.in
    const { sendPaymentReceipt: sendReceipt } = await import("../../services/emailService.js");
    const pdfBuffer = await generateBookingReceipt({
      bookingId: booking.id,
      transactionId: booking.transactionId,
      serviceName: booking.serviceName,
      customerEmail: customer.email,
      customerName: customer.name || undefined,
      vendorName: vendorProfile?.businessName || undefined,
      paymentStatus: "pending",
      date: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      amount: amountStr,
    });

    sendReceipt({
      recipientEmail: customer.email,
      bookingId: booking.id,
      transactionId: booking.transactionId,
      serviceName: booking.serviceName,
      amount: amountStr,
      paymentStatus: "pending",
      paidAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      vendorName: vendorProfile?.businessName || undefined,
      pdfBuffer,
    }).catch((err) => console.error("[booking] failed to send payment receipt email", err));
  }

  trackActivity({
    actorId: req.actor!.id,
    role: "vendor",
    action: "booking.completion_requested",
    entity: "booking",
    metadata: { bookingId: booking.id }
  });

  res.json({ success: true, data: { message: "Completion OTP sent to customer", bookingId: booking.id } });
});

// ── Vendor verifies completion OTP from customer → marks booking completed ──
bookingsRouter.post("/:bookingId/verify-completion", requireRole(["vendor"]), async (req: AuthRequest, res) => {
  const parsed = z.object({ code: z.string().length(6) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const booking = await getBookingById(req.params.bookingId);
  if (!booking) {
    res.status(404).json({ success: false, error: "Booking not found" });
    return;
  }
  if (booking.vendorId !== req.actor!.id) {
    res.status(403).json({ success: false, error: "Not your booking" });
    return;
  }

  const otp = await getCompletionOtp(booking.id);
  if (!otp || !otp.otpHash) {
    res.status(400).json({ success: false, error: "No completion OTP pending. Request one first." });
    return;
  }
  if (otp.expiresAt && Date.now() > new Date(otp.expiresAt).getTime()) {
    await clearCompletionOtp(booking.id);
    res.status(410).json({ success: false, error: "OTP expired. Please request a new one." });
    return;
  }

  const inputHash = crypto.createHash("sha256").update(parsed.data.code).digest("hex");
  if (inputHash !== otp.otpHash) {
    res.status(401).json({ success: false, error: "Invalid OTP code" });
    return;
  }

  // OTP valid — mark completed
  await clearCompletionOtp(booking.id);
  const updated = await updateBookingStatus(booking.id, "completed");

  // Send work completion email to customer from payments@vendorcenter.in
  const customer = await findUserById(booking.customerId);
  const vendorProfile = await getVendorProfile(booking.vendorId);
  const amountStr = booking.finalAmount ? (booking.finalAmount / 100).toFixed(2) : undefined;

  if (customer?.email) {
    const { sendWorkCompletionEmail } = await import("../../services/emailService.js");
    const pdfBuffer = await generateBookingReceipt({
      bookingId: booking.id,
      transactionId: booking.transactionId,
      serviceName: booking.serviceName,
      customerEmail: customer.email,
      customerName: customer.name || undefined,
      vendorName: vendorProfile?.businessName || undefined,
      paymentStatus: "success",
      date: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      amount: amountStr,
    });

    sendWorkCompletionEmail({
      recipientEmail: customer.email,
      bookingId: booking.id,
      serviceName: booking.serviceName,
      vendorName: vendorProfile?.businessName || undefined,
      amount: amountStr,
      completedAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      pdfBuffer,
    }).catch((err) => console.error("[booking] failed to send completion email", err));
  }

  trackActivity({
    actorId: req.actor!.id,
    role: "vendor",
    action: "booking.completed_verified",
    entity: "booking",
    metadata: { bookingId: booking.id }
  });

  res.json({ success: true, data: updated });
});
