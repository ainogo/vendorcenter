import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../middleware/auth.js";
import { listActivities } from "./activity.service.js";

export const activityRouter = Router();

activityRouter.get("/", requireRole(["admin", "employee"]), async (req, res) => {
  const parsed = z
    .object({
      requestId: z.string().optional(),
      actorId: z.string().optional(),
      action: z.string().optional(),
      limit: z.coerce.number().int().positive().max(500).optional()
    })
    .safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  res.json({ success: true, data: await listActivities(parsed.data) });
});
