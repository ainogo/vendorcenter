import { Router } from "express";
import { z } from "zod";
import { requireRole, AuthRequest } from "../../middleware/auth.js";
import { checkServiceability } from "../service-zones/service-zones.repository.js";
import {
  listAddresses, getAddress, createAddress, updateAddress, deleteAddress, setDefaultAddress,
} from "./customer-addresses.repository.js";

export const customerAddressesRouter = Router();

// List my addresses
customerAddressesRouter.get("/", requireRole(["customer"]), async (req: AuthRequest, res, next) => {
  try {
    const addresses = await listAddresses(req.actor!.id);
    res.json({ success: true, data: addresses });
  } catch (err) { next(err); }
});

// Get single address
customerAddressesRouter.get("/:id", requireRole(["customer"]), async (req: AuthRequest, res, next) => {
  try {
    const address = await getAddress(req.params.id, req.actor!.id);
    if (!address) {
      res.status(404).json({ success: false, error: "Address not found" });
      return;
    }
    res.json({ success: true, data: address });
  } catch (err) { next(err); }
});

// Create address
const createSchema = z.object({
  label: z.enum(["Home", "Work", "Other"]).default("Home"),
  fullAddress: z.string().min(5).max(500),
  landmark: z.string().max(200).optional(),
  pincode: z.string().regex(/^\d{6}$/, "Valid 6-digit pincode required"),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().default(false),
});

customerAddressesRouter.post("/", requireRole(["customer"]), async (req: AuthRequest, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    // Check serviceability (warn but don't block — user may save for future)
    const serviceCheck = await checkServiceability(parsed.data.pincode);
    const serviceable = serviceCheck?.serviceable ?? false;

    const address = await createAddress(req.actor!.id, parsed.data);
    res.status(201).json({ success: true, data: { ...address, serviceable } });
  } catch (err: any) {
    if (err.message === "MAX_ADDRESSES") {
      res.status(400).json({ success: false, error: "Maximum 10 addresses allowed. Delete an existing address first." });
      return;
    }
    next(err);
  }
});

// Update address
customerAddressesRouter.patch("/:id", requireRole(["customer"]), async (req: AuthRequest, res, next) => {
  try {
    const parsed = z.object({
      label: z.enum(["Home", "Work", "Other"]).optional(),
      fullAddress: z.string().min(5).max(500).optional(),
      landmark: z.string().max(200).optional(),
      pincode: z.string().regex(/^\d{6}$/).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
    }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }
    const updated = await updateAddress(req.params.id, req.actor!.id, parsed.data);
    if (!updated) {
      res.status(404).json({ success: false, error: "Address not found" });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// Delete address
customerAddressesRouter.delete("/:id", requireRole(["customer"]), async (req: AuthRequest, res, next) => {
  try {
    const deleted = await deleteAddress(req.params.id, req.actor!.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: "Address not found" });
      return;
    }
    res.json({ success: true, data: { deleted: true } });
  } catch (err) { next(err); }
});

// Set default
customerAddressesRouter.patch("/:id/default", requireRole(["customer"]), async (req: AuthRequest, res, next) => {
  try {
    const address = await setDefaultAddress(req.params.id, req.actor!.id);
    if (!address) {
      res.status(404).json({ success: false, error: "Address not found" });
      return;
    }
    res.json({ success: true, data: address });
  } catch (err) { next(err); }
});
