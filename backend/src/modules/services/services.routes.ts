import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../middleware/auth.js";
import { AuthRequest } from "../../middleware/auth.js";
import { trackActivity } from "../activity/activity.service.js";
import { createService, listServices, listServicesByVendor } from "./services.repository.js";

export const servicesRouter = Router();

// Vendor: get own services
servicesRouter.get("/mine", requireRole(["vendor"]), async (req: AuthRequest, res) => {
  const services = await listServicesByVendor(req.actor!.id);
  res.json({ success: true, data: services });
});

servicesRouter.post("/", requireRole(["vendor"]), async (req: AuthRequest, res) => {
  const parsed = z
    .object({
      name: z.string().min(2),
      price: z.number().nonnegative(),
      availability: z.enum(["available", "unavailable"]),
      locations: z.array(z.string()).default([]),
      images: z.array(z.string().url()).default([])
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const service = await createService({
    vendorId: req.actor!.id,
    ...parsed.data
  });

  trackActivity({
    actorId: req.actor!.id,
    role: req.actor!.role,
    action: "service.created",
    entity: "service",
    metadata: parsed.data
  });

  res.status(201).json({ success: true, data: service });
});

servicesRouter.get("/", async (_req, res) => {
  res.json({ success: true, data: await listServices() });
});
