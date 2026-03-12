import { Router } from "express";
import { requireRole, type AuthRequest } from "../../middleware/auth.js";
import { pool } from "../../db/pool.js";

export const adminRouter = Router();

adminRouter.get("/dashboard", requireRole(["admin"]), (_req, res) => {
  res.json({
    success: true,
    data: {
      manage: ["vendors", "zones", "services", "bookings", "payments", "users", "employees", "analytics"]
    }
  });
});

// Live platform stats for dashboard cards
adminRouter.get("/stats", requireRole(["admin"]), async (_req, res, next) => {
  try {
    const [usersR, vendorsR, bookingsR, pendingR, revenueR] = await Promise.all([
      pool.query("SELECT count(*)::int AS total FROM users WHERE role = 'customer'"),
      pool.query("SELECT count(*)::int AS total FROM users WHERE role = 'vendor'"),
      pool.query("SELECT count(*)::int AS total FROM bookings"),
      pool.query("SELECT count(*)::int AS total FROM vendor_profiles WHERE verification_status = 'under_review'"),
      pool.query("SELECT coalesce(sum(final_amount),0)::numeric AS total FROM bookings WHERE status = 'completed'"),
    ]);
    res.json({
      success: true,
      data: {
        totalCustomers: usersR.rows[0].total,
        totalVendors: vendorsR.rows[0].total,
        totalBookings: bookingsR.rows[0].total,
        pendingApprovals: pendingR.rows[0].total,
        totalRevenue: Number(revenueR.rows[0].total),
      },
    });
  } catch (err) { next(err); }
});

// All users list for admin user management
adminRouter.get("/users", requireRole(["admin"]), async (req, res, next) => {
  try {
    const role = req.query.role as string | undefined;
    let query = "SELECT id, email, role, name, phone, verified, created_at FROM users";
    const params: string[] = [];
    if (role && ["customer", "vendor", "admin", "employee"].includes(role)) {
      query += " WHERE role = $1";
      params.push(role);
    }
    query += " ORDER BY created_at DESC LIMIT 500";
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// All bookings list for admin
adminRouter.get("/bookings", requireRole(["admin", "employee"]), async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT b.id, b.customer_id, b.vendor_id, b.service_name, b.status,
             b.scheduled_date, b.scheduled_time, b.final_amount, b.notes, b.created_at,
             cu.email AS customer_email, cu.name AS customer_name,
             vu.email AS vendor_email, vp.business_name
      FROM bookings b
      LEFT JOIN users cu ON cu.id = b.customer_id
      LEFT JOIN users vu ON vu.id = b.vendor_id
      LEFT JOIN vendor_profiles vp ON vp.vendor_id = b.vendor_id
      ORDER BY b.created_at DESC
      LIMIT 500
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// Recent activity for admin dashboard
adminRouter.get("/recent-activity", requireRole(["admin"]), async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT id, actor_id, role, action, entity, metadata, created_at
      FROM activity_logs
      ORDER BY created_at DESC
      LIMIT 20
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});
