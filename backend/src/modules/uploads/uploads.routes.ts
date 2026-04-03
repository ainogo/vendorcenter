import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { requireRole, AuthRequest, getActorFromBearerToken } from "../../middleware/auth.js";
import { AppRole } from "../../shared/types.js";
import { trackActivity } from "../activity/activity.service.js";
import { createMediaAsset, getUploadFileAccessContext, listMediaAssets } from "./uploads.repository.js";
import { useCloudStorage, uploadToCloud } from "../../services/storageService.js";

const UPLOAD_DIR = path.resolve("uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

const ROLE_ALLOWED_MIME: Record<AppRole, string[]> = {
  customer: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  vendor: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"],
  admin: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"],
  employee: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"],
};

const PUBLIC_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const PROTECTED_FILE_EXTENSIONS = new Set([".pdf"]);

function detectMimeFromSignature(fileBuffer: Buffer): string | null {
  if (fileBuffer.length >= 3 && fileBuffer[0] === 0xff && fileBuffer[1] === 0xd8 && fileBuffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    fileBuffer.length >= 8 &&
    fileBuffer[0] === 0x89 &&
    fileBuffer[1] === 0x50 &&
    fileBuffer[2] === 0x4e &&
    fileBuffer[3] === 0x47 &&
    fileBuffer[4] === 0x0d &&
    fileBuffer[5] === 0x0a &&
    fileBuffer[6] === 0x1a &&
    fileBuffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    fileBuffer.length >= 12 &&
    fileBuffer.toString("ascii", 0, 4) === "RIFF" &&
    fileBuffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  if (fileBuffer.length >= 4 && fileBuffer.toString("ascii", 0, 4) === "GIF8") {
    return "image/gif";
  }

  if (fileBuffer.length >= 5 && fileBuffer.toString("ascii", 0, 5) === "%PDF-") {
    return "application/pdf";
  }

  return null;
}

async function getUploadBuffer(file: Express.Multer.File): Promise<Buffer> {
  if (file.buffer) {
    return file.buffer;
  }
  if (file.path) {
    return fs.promises.readFile(file.path);
  }
  throw new Error("Unable to validate uploaded file content");
}

async function cleanupDiskFile(file: Express.Multer.File) {
  if (file.path && fs.existsSync(file.path)) {
    await fs.promises.unlink(file.path).catch(() => undefined);
  }
}

async function validateUploadedFile(file: Express.Multer.File, role: AppRole): Promise<{ mimeType: string }> {
  const contentBuffer = await getUploadBuffer(file);
  const detectedMime = detectMimeFromSignature(contentBuffer);
  const allowedMime = ROLE_ALLOWED_MIME[role];

  if (!detectedMime || !allowedMime.includes(detectedMime)) {
    await cleanupDiskFile(file);
    throw new Error("File type is not allowed for this role");
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const expectedMime = EXTENSION_TO_MIME[ext];
  if (!expectedMime || expectedMime !== detectedMime) {
    await cleanupDiskFile(file);
    throw new Error("Uploaded file extension does not match file content");
  }

  return { mimeType: detectedMime };
}

const uploadSingleLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many upload attempts, please try again shortly" },
});

const uploadBatchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many bulk uploads, please try again shortly" },
});

// Use memory storage in production (for S3 upload), disk in dev
const storage = useCloudStorage()
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = crypto.randomBytes(16).toString("hex") + ext;
        cb(null, name);
      },
    });

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp|gif|pdf)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only allowed image or document file types are accepted"));
    }
  },
});

export const uploadsRouter = Router();

uploadsRouter.post("/metadata", requireRole(["customer", "vendor", "admin", "employee"]), async (req: AuthRequest, res) => {
  const parsed = z
    .object({
      mediaType: z.enum(["profile_picture", "service_image", "portfolio_image", "document"]),
      url: z.string().url(),
      metadata: z.record(z.unknown()).optional()
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const media = await createMediaAsset({
    ownerId: req.actor!.id,
    ownerRole: req.actor!.role,
    mediaType: parsed.data.mediaType,
    url: parsed.data.url,
    metadata: parsed.data.metadata
  });

  trackActivity({
    actorId: req.actor!.id,
    role: req.actor!.role,
    action: "upload.metadata_created",
    entity: "media_asset",
    metadata: { mediaType: parsed.data.mediaType, url: parsed.data.url }
  });

  res.status(201).json({ success: true, data: media });
});

uploadsRouter.get("/my", requireRole(["customer", "vendor", "admin", "employee"]), async (req: AuthRequest, res) => {
  res.json({ success: true, data: await listMediaAssets(req.actor!.id) });
});

// File upload endpoint — saves to disk, returns URL
uploadsRouter.post("/file", uploadSingleLimiter, requireRole(["customer", "vendor", "admin", "employee"]), (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      const safeMsg = err.code === "LIMIT_FILE_SIZE" ? "File too large (max 5MB)" : "File upload failed";
      res.status(400).json({ success: false, error: safeMsg });
      return;
    }
    next();
  });
}, async (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: "No file uploaded" });
    return;
  }

  try {
    const validated = await validateUploadedFile(req.file, req.actor!.role);

    let url: string;
    if (useCloudStorage()) {
      url = await uploadToCloud(req.file.buffer, req.file.originalname, validated.mimeType);
    } else {
      url = `/api/uploads/files/${req.file.filename}`;
    }

    res.json({ success: true, data: { url, filename: req.file.originalname } });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Upload failed" });
  }
});

// Multiple files upload
uploadsRouter.post("/files", uploadBatchLimiter, requireRole(["customer", "vendor", "admin", "employee"]), (req, res, next) => {
  upload.array("files", 6)(req, res, (err) => {
    if (err) {
      const safeMsg = err.code === "LIMIT_FILE_SIZE" ? "File too large (max 5MB)"
        : err.code === "LIMIT_FILE_COUNT" ? "Too many files (max 6)"
        : "File upload failed";
      res.status(400).json({ success: false, error: safeMsg });
      return;
    }
    next();
  });
}, async (req: AuthRequest, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ success: false, error: "No files uploaded" });
    return;
  }

  try {
    const validatedFiles = await Promise.all(files.map((file) => validateUploadedFile(file, req.actor!.role)));

    let urls: string[];
    if (useCloudStorage()) {
      urls = await Promise.all(
        files.map((file, index) => uploadToCloud(file.buffer, file.originalname, validatedFiles[index].mimeType))
      );
    } else {
      urls = files.map((f) => `/api/uploads/files/${f.filename}`);
    }

    res.json({ success: true, data: { urls } });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : "Upload failed" });
  }
});

// Serve uploaded files
uploadsRouter.get("/files/:filename", async (req, res) => {
  const filename = path.basename(req.params.filename); // prevent directory traversal
  const filePath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, error: "File not found" });
    return;
  }

  const ext = path.extname(filename).toLowerCase();

  if (PUBLIC_IMAGE_EXTENSIONS.has(ext)) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type(ext);
    res.sendFile(filePath);
    return;
  }

  if (!PROTECTED_FILE_EXTENSIONS.has(ext)) {
    res.status(404).json({ success: false, error: "File not found" });
    return;
  }

  const actor = getActorFromBearerToken(req.header("authorization"));
  const access = await getUploadFileAccessContext(filename);
  const canReadProtected = Boolean(
    actor && (actor.role === "admin" || actor.role === "employee" || access.ownerIds.includes(actor.id))
  );

  if (!canReadProtected) {
    res.status(404).json({ success: false, error: "File not found" });
    return;
  }

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  res.type(ext);
  res.sendFile(filePath);
});
