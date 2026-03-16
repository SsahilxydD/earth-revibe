import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import { UserRole } from "@earth-revibe/shared";
import { prisma } from "@earth-revibe/db";

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

// GET /api/v1/admin/homepage — list all sections
router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const sections = await prisma.homepageSection.findMany({
      orderBy: { sortOrder: "asc" },
    });
    res.json({ success: true, data: sections });
  })
);

// PATCH /api/v1/admin/homepage/:id — update imageUrl (and optionally label/href/sortOrder/isActive)
router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { imageUrl, label, href, sortOrder, isActive } = req.body;

    const section = await prisma.homepageSection.update({
      where: { id },
      data: {
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(label !== undefined ? { label } : {}),
        ...(href !== undefined ? { href } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    res.json({ success: true, data: section });
  })
);

export { router as adminHomepageRouter };
