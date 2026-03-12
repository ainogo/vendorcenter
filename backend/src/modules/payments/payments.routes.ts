import { Router } from "express";
import { requireRole } from "../../middleware/auth.js";
import { listTransactions } from "../bookings/bookings.repository.js";

export const paymentsRouter = Router();

paymentsRouter.get("/transactions", requireRole(["customer", "vendor", "admin", "employee"]), async (_req, res) => {
  const transactions = (await listTransactions()).map((t) => ({
    bookingId: t.bookingId,
    transactionId: t.transactionId,
    paymentStatus: t.paymentStatus,
    receiptId: `rcpt_${t.transactionId}`
  }));

  res.json({
    success: true,
    data: {
      providerMode: "abstraction_only",
      futureGateways: ["Razorpay", "Stripe", "UPI", "Wallets"],
      transactions
    }
  });
});
