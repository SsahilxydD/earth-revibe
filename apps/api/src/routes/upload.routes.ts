import { Router, type IRouter } from "express";
import multer from "multer";
import type { Request, Response } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import { uploadImage, imageProvider } from "../services/upload.service";
import { UserRole } from "@earth-revibe/shared";
import { logger } from "../config/logger";
import { ApiError } from "../utils/api-error";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`));
    }
  },
});

router.post(
  "/image",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  upload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "No file provided" } });
      return;
    }
    logger.info({ provider: imageProvider, filename: req.file.originalname, size: req.file.size }, "Uploading image");
    const result = await uploadImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    logger.info({ provider: result.provider, id: result.id }, "Image uploaded successfully");
    res.json({
      success: true,
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      id: result.id,
      provider: result.provider,
    });
  })
);

// ── Upload image from URL ───────────────────────────────────────────────────

const MAX_URL_IMAGE_SIZE = 100 * 1024 * 1024; // 100 MB

router.post(
  "/image-from-url",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      throw ApiError.badRequest("Missing or invalid 'url' field");
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw ApiError.badRequest("Invalid URL");
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw ApiError.badRequest("Only HTTP and HTTPS URLs are supported");
    }

    logger.info({ provider: imageProvider, url }, "Fetching image from URL");

    const fetchRes = await fetch(url, {
      headers: { "User-Agent": "EarthRevibe-ImageFetcher/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });

    if (!fetchRes.ok) {
      throw ApiError.badRequest(`Failed to fetch image: HTTP ${fetchRes.status}`);
    }

    const contentType = fetchRes.headers.get("content-type")?.split(";")[0]?.trim() || "";
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      throw ApiError.badRequest(
        `Unsupported content type: ${contentType}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`
      );
    }

    const contentLength = fetchRes.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_URL_IMAGE_SIZE) {
      throw ApiError.badRequest("Image exceeds 100 MB size limit");
    }

    const buffer = Buffer.from(await fetchRes.arrayBuffer());

    if (buffer.length > MAX_URL_IMAGE_SIZE) {
      throw ApiError.badRequest("Image exceeds 100 MB size limit");
    }

    // Derive a filename from the URL path
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const filename = pathSegments[pathSegments.length - 1] || "image.jpg";

    const result = await uploadImage(buffer, filename, contentType);
    logger.info({ provider: result.provider, id: result.id }, "URL image uploaded successfully");

    res.json({
      success: true,
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      id: result.id,
      provider: result.provider,
    });
  })
);

export { router as uploadRouter };
