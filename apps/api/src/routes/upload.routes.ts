import { Router, type IRouter } from "express";
import multer from "multer";
import type { Request, Response } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import { uploadImage, imageProvider } from "../services/upload.service";
import { UserRole } from "@earth-revibe/shared";
import { logger } from "../config/logger";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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

export { router as uploadRouter };
