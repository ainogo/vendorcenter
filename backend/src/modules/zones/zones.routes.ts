import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../middleware/auth.js";
import { AuthRequest } from "../../middleware/auth.js";
import { createZone, listZones, toggleZoneActive } from "./zones.repository.js";
import { trackActivity } from "../activity/activity.service.js";

export const zonesRouter = Router();

zonesRouter.get("/", async (_req, res) => {
  res.json({ success: true, data: await listZones() });
});

zonesRouter.post("/", requireRole(["admin"]), async (req: AuthRequest, res) => {
  const parsed = z
    .object({
      country: z.string().min(2),
      state: z.string().min(2),
      city: z.string().min(2),
      zone: z.string().min(2),
      pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits").optional()
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const zone = await createZone(parsed.data);
  trackActivity({
    actorId: req.actor!.id,
    role: req.actor!.role,
    action: "zone.created",
    entity: "zone",
    metadata: parsed.data
  });

  res.status(201).json({ success: true, data: zone });
});

zonesRouter.patch("/:id/toggle", requireRole(["admin"]), async (req: AuthRequest, res) => {
  const zone = await toggleZoneActive(req.params.id);
  if (!zone) {
    res.status(404).json({ success: false, error: "Zone not found" });
    return;
  }
  trackActivity({
    actorId: req.actor!.id,
    role: req.actor!.role,
    action: zone.active ? "zone.activated" : "zone.deactivated",
    entity: "zone",
    metadata: { zoneId: zone.id, zone: zone.zone }
  });
  res.json({ success: true, data: zone });
});
