import { Router } from "express";
import { z } from "zod";
import { requireRole, AuthRequest } from "../../middleware/auth.js";
import { trackActivity } from "../activity/activity.service.js";
import { lookupPincode, bulkLookupPincodes } from "../../services/indiaPostService.js";
import {
  listStates, createState, toggleStateActive,
  listZonesByState, createZone, toggleZoneActive,
  listAreasByZone, createArea, toggleAreaActive,
  listPincodesByArea, createPincode, togglePincodeActive,
  checkServiceability,
  getFullHierarchy,
  findVendorsByPincode,
  countActiveStates, countActiveServiceZones, countActiveServicePincodes,
  findOrCreateZone, findOrCreateArea,
  deleteState, deleteZone, deleteArea, deletePincode,
  isValidIndianState,
} from "./service-zones.repository.js";

export const serviceZonesRouter = Router();

// ── Public ─────────────────────────────────────────────────────

// Check if a pincode is serviceable
serviceZonesRouter.get("/check", async (req, res, next) => {
  try {
    const parsed = z.object({ pincode: z.string().regex(/^\d{6}$/) }).safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Valid 6-digit pincode required" });
      return;
    }
    const result = await checkServiceability(parsed.data.pincode);
    res.json({ success: true, data: result ?? { serviceable: false, pincode: parsed.data.pincode } });
  } catch (err) { next(err); }
});

// Full hierarchy for dropdowns (vendor onboarding)
serviceZonesRouter.get("/hierarchy", async (_req, res, next) => {
  try {
    const hierarchy = await getFullHierarchy();
    res.json({ success: true, data: hierarchy });
  } catch (err) { next(err); }
});

// Active states list
serviceZonesRouter.get("/states", async (_req, res, next) => {
  try {
    const states = await listStates();
    res.json({ success: true, data: states });
  } catch (err) { next(err); }
});

// Zones in a state
serviceZonesRouter.get("/states/:stateId/zones", async (req, res, next) => {
  try {
    const zones = await listZonesByState(req.params.stateId);
    res.json({ success: true, data: zones });
  } catch (err) { next(err); }
});

// Areas in a zone
serviceZonesRouter.get("/zones/:zoneId/areas", async (req, res, next) => {
  try {
    const areas = await listAreasByZone(req.params.zoneId);
    res.json({ success: true, data: areas });
  } catch (err) { next(err); }
});

// Pincodes in an area
serviceZonesRouter.get("/areas/:areaId/pincodes", async (req, res, next) => {
  try {
    const pincodes = await listPincodesByArea(req.params.areaId);
    res.json({ success: true, data: pincodes });
  } catch (err) { next(err); }
});

// Vendors serving a pincode
serviceZonesRouter.get("/vendors-by-pincode", async (req, res, next) => {
  try {
    const parsed = z.object({ pincode: z.string().regex(/^\d{6}$/) }).safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Valid 6-digit pincode required" });
      return;
    }
    const vendors = await findVendorsByPincode(parsed.data.pincode);
    res.json({ success: true, data: vendors });
  } catch (err) { next(err); }
});

// Counts
serviceZonesRouter.get("/counts", async (_req, res, next) => {
  try {
    const [states, zones, pincodes] = await Promise.all([
      countActiveStates(),
      countActiveServiceZones(),
      countActiveServicePincodes(),
    ]);
    res.json({ success: true, data: { states, zones, pincodes } });
  } catch (err) { next(err); }
});

// ── Admin ──────────────────────────────────────────────────────

// India Post API proxy for admin UI auto-fill
serviceZonesRouter.get("/lookup-pincode/:pincode", requireRole(["admin", "employee"]), async (req, res, next) => {
  try {
    const result = await lookupPincode(req.params.pincode);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// Bulk lookup
serviceZonesRouter.post("/lookup-pincodes", requireRole(["admin", "employee"]), async (req: AuthRequest, res, next) => {
  try {
    const parsed = z.object({ pincodes: z.array(z.string().regex(/^\d{6}$/)).min(1).max(50) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }
    const results = await bulkLookupPincodes(parsed.data.pincodes);
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
});

// Quick add pincode — auto-creates full hierarchy from India Post lookup
serviceZonesRouter.post("/quick-add-pincode", requireRole(["admin"]), async (req: AuthRequest, res, next) => {
  try {
    const parsed = z.object({
      pincode: z.string().regex(/^\d{6}$/),
      areaName: z.string().min(1).max(100).optional(),
    }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }
    const { pincode, areaName } = parsed.data;

    // Lookup via India Post
    const lookup = await lookupPincode(pincode);
    if (!lookup.valid) {
      res.status(400).json({ success: false, error: `Pincode ${pincode} not found in India Post database` });
      return;
    }

    // Auto-create hierarchy: State → Zone (District) → Area → Pincode
    const state = await createState(lookup.state, lookup.country || "India");
    const zone = await findOrCreateZone(state.id, lookup.district);
    const finalAreaName = areaName?.trim() || lookup.postOffices[0]?.name || lookup.district;
    const area = await findOrCreateArea(zone.id, finalAreaName);
    const pin = await createPincode(area.id, pincode, lookup.postOffices[0]?.name, lookup.district);

    trackActivity({ actorId: req.actor!.id, role: req.actor!.role, action: "service_zone.quick_add", entity: "service_pincode", metadata: { pincode, state: state.name, zone: zone.name, area: area.name } });

    res.status(201).json({
      success: true,
      data: {
        pincode: pin,
        area: { id: area.id, name: area.name },
        zone: { id: zone.id, name: zone.name },
        state: { id: state.id, name: state.name },
        indiaPostData: lookup,
      },
    });
  } catch (err) { next(err); }
});

// Create state — validated against known Indian states
serviceZonesRouter.post("/states", requireRole(["admin"]), async (req: AuthRequest, res, next) => {
  try {
    const parsed = z.object({ name: z.string().min(2).max(100), country: z.string().default("India") }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }
    if (!isValidIndianState(parsed.data.name)) {
      res.status(400).json({ success: false, error: `"${parsed.data.name}" is not a valid Indian state or union territory` });
      return;
    }
    const state = await createState(parsed.data.name, parsed.data.country);
    trackActivity({ actorId: req.actor!.id, role: req.actor!.role, action: "service_zone.state_created", entity: "service_state", metadata: { stateId: state.id, name: state.name } });
    res.status(201).json({ success: true, data: state });
  } catch (err) { next(err); }
});

// Create zone
serviceZonesRouter.post("/zones", requireRole(["admin"]), async (req: AuthRequest, res, next) => {
  try {
    const parsed = z.object({ stateId: z.string().uuid(), name: z.string().min(2).max(100), description: z.string().max(500).optional() }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }
    const zone = await createZone(parsed.data.stateId, parsed.data.name, parsed.data.description);
    trackActivity({ actorId: req.actor!.id, role: req.actor!.role, action: "service_zone.zone_created", entity: "service_zone", metadata: { zoneId: zone.id, name: zone.name } });
    res.status(201).json({ success: true, data: zone });
  } catch (err) { next(err); }
});

// Create area
serviceZonesRouter.post("/areas", requireRole(["admin"]), async (req: AuthRequest, res, next) => {
  try {
    const parsed = z.object({ zoneId: z.string().uuid(), name: z.string().min(2).max(100) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }
    const area = await createArea(parsed.data.zoneId, parsed.data.name);
    trackActivity({ actorId: req.actor!.id, role: req.actor!.role, action: "service_zone.area_created", entity: "service_area", metadata: { areaId: area.id, name: area.name } });
    res.status(201).json({ success: true, data: area });
  } catch (err) { next(err); }
});

// Create pincode(s)
serviceZonesRouter.post("/pincodes", requireRole(["admin"]), async (req: AuthRequest, res, next) => {
  try {
    const parsed = z.object({
      areaId: z.string().uuid(),
      pincodes: z.array(z.string().regex(/^\d{6}$/)).min(1).max(50),
      autoLookup: z.boolean().default(true),
    }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const created: any[] = [];
    for (const pin of parsed.data.pincodes) {
      let localityName: string | undefined;
      let district: string | undefined;
      if (parsed.data.autoLookup) {
        const lookup = await lookupPincode(pin);
        if (lookup.valid) {
          localityName = lookup.postOffices[0]?.name;
          district = lookup.district;
        }
      }
      const pincode = await createPincode(parsed.data.areaId, pin, localityName, district);
      created.push(pincode);
    }

    trackActivity({ actorId: req.actor!.id, role: req.actor!.role, action: "service_zone.pincodes_created", entity: "service_pincode", metadata: { areaId: parsed.data.areaId, count: created.length } });
    res.status(201).json({ success: true, data: created });
  } catch (err) { next(err); }
});

// Toggle active at any level
serviceZonesRouter.patch("/:level/:id/toggle", requireRole(["admin"]), async (req: AuthRequest, res, next) => {
  try {
    const { level, id } = req.params;
    let result: any;
    switch (level) {
      case "states": result = await toggleStateActive(id); break;
      case "zones": result = await toggleZoneActive(id); break;
      case "areas": result = await toggleAreaActive(id); break;
      case "pincodes": result = await togglePincodeActive(id); break;
      default:
        res.status(400).json({ success: false, error: "Invalid level. Use: states, zones, areas, pincodes" });
        return;
    }
    if (!result) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    trackActivity({ actorId: req.actor!.id, role: req.actor!.role, action: `service_zone.${level}_toggled`, entity: `service_${level}`, metadata: { id, active: result.active } });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// Delete at any level — admin only (hard delete, cascades)
serviceZonesRouter.delete("/:level/:id", requireRole(["admin"]), async (req: AuthRequest, res, next) => {
  try {
    const { level, id } = req.params;
    let result: any;
    switch (level) {
      case "states": result = await deleteState(id); break;
      case "zones": result = await deleteZone(id); break;
      case "areas": result = await deleteArea(id); break;
      case "pincodes": result = await deletePincode(id); break;
      default:
        res.status(400).json({ success: false, error: "Invalid level. Use: states, zones, areas, pincodes" });
        return;
    }
    if (!result) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    trackActivity({ actorId: req.actor!.id, role: req.actor!.role, action: `service_zone.${level}_deleted`, entity: `service_${level}`, metadata: { id, name: result.name || result.pincode } });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});
