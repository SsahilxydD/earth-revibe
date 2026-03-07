import { Router, type IRouter } from "express";
import multer from "multer";
import type { Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import { uploadToCloudflare } from "../services/upload.service";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post(
  "/image",
  authenticate,
  upload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file provided" });
      return;
    }
    const result = await uploadToCloudflare(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    res.json({ success: true, url: result.url, id: result.id });
  })
);

export { router as uploadRouter };
