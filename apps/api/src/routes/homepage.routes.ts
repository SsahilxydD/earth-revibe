import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { prisma } from "@earth-revibe/db";

const router: IRouter = Router();

// GET /api/v1/homepage — public, no auth required
router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const sections = await prisma.homepageSection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    res.json({ success: true, data: sections });
  })
);

export { router as homepageRouter };
