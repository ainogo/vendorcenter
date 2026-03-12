import { Router } from "express";
import { z } from "zod";
import { nearbyVendors } from "./maps.repository.js";

export const mapsRouter = Router();

mapsRouter.get("/nearby-vendors", async (req, res) => {
  const parsed = z
    .object({
      lat: z.coerce.number(),
      lng: z.coerce.number(),
      radiusKm: z.coerce.number().positive().default(10)
    })
    .safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const data = await nearbyVendors(parsed.data.lat, parsed.data.lng, parsed.data.radiusKm);
  res.json({ success: true, data });
});
