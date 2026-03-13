import { Router } from "express";
import { z } from "zod";
import { requireRole, type AuthRequest } from "../../middleware/auth.js";
import { trackActivity } from "../activity/activity.service.js";
import {
  findNearbyVendors,
  getZonesWithPolygons,
  updateZonePolygon,
  findZonesContainingPoint,
  getTopCategoriesForLocation,
} from "./location.service.js";

export const locationRouter = Router();

/**
 * GET /api/location/vendors-nearby?lat=&lng=&radiusKm=&limit=
 * Public endpoint. Returns vendors near the given coordinates.
 */
locationRouter.get("/vendors-nearby", async (req, res) => {
  const parsed = z
    .object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
      radiusKm: z.coerce.number().positive().max(100).default(10),
      limit: z.coerce.number().int().positive().max(200).default(50),
    })
    .safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const vendors = await findNearbyVendors(
    parsed.data.lat,
    parsed.data.lng,
    parsed.data.radiusKm,
    parsed.data.limit
  );

  res.json({ success: true, data: vendors });
});

/**
 * GET /api/location/zones
 * Public. Returns all zones with polygon data for map rendering.
 */
locationRouter.get("/zones", async (_req, res) => {
  const zones = await getZonesWithPolygons();
  res.json({ success: true, data: zones });
});

/**
 * GET /api/location/top-categories?lat=&lng=&radiusKm=&limit=
 * Public. Returns top categories for a specific location.
 */
locationRouter.get("/top-categories", async (req, res) => {
  const parsed = z
    .object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
      radiusKm: z.coerce.number().positive().max(100).default(25),
      limit: z.coerce.number().int().positive().max(20).default(6),
    })
    .safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const categories = await getTopCategoriesForLocation(
    parsed.data.lat,
    parsed.data.lng,
    parsed.data.radiusKm,
    parsed.data.limit
  );

  res.json({ success: true, data: categories });
});

/**
 * GET /api/location/zone-check?lat=&lng=
 * Public. Returns zone(s) that contain the given point.
 */
locationRouter.get("/zone-check", async (req, res) => {
  const parsed = z
    .object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
    })
    .safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const zones = await findZonesContainingPoint(parsed.data.lat, parsed.data.lng);
  res.json({
    success: true,
    data: {
      inZone: zones.length > 0,
      zones,
    },
  });
});

/**
 * PATCH /api/location/zones/:zoneId/polygon
 * Admin only. Set or update a zone's polygon boundary.
 */
locationRouter.patch(
  "/zones/:zoneId/polygon",
  requireRole(["admin"]),
  async (req: AuthRequest, res) => {
    const parsed = z
      .object({
        polygonCoordinates: z
          .array(z.tuple([z.number(), z.number()]))
          .min(3, "Polygon must have at least 3 points"),
        active: z.boolean().optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const updated = await updateZonePolygon(
      req.params.zoneId,
      parsed.data.polygonCoordinates,
      parsed.data.active
    );

    if (!updated) {
      res.status(404).json({ success: false, error: "Zone not found" });
      return;
    }

    trackActivity({
      actorId: req.actor!.id,
      role: req.actor!.role,
      action: "zone.polygon_updated",
      entity: "zone",
      metadata: { zoneId: req.params.zoneId },
    });

    res.json({ success: true, data: { updated: true } });
  }
);
