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

// POST /api/v1/admin/homepage — create a new section
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { label, href, sortOrder } = req.body;
    if (!label || !href) {
      res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "label and href are required" } });
      return;
    }
    const section = await prisma.homepageSection.create({
      data: {
        label,
        href,
        sortOrder: sortOrder ?? 0,
        isActive: true,
      },
    });
    res.status(201).json({ success: true, data: section });
  })
);

// PUT /api/v1/admin/homepage/reorder — MUST be before /:id routes
router.put(
  "/reorder",
  asyncHandler(async (req: Request, res: Response) => {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "orderedIds array is required" } });
      return;
    }

    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.homepageSection.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    res.json({ success: true });
  })
);

// DELETE /api/v1/admin/homepage/:id — remove a section
router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.homepageSection.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  })
);

// PATCH /api/v1/admin/homepage/:id — update imageUrl (and optionally label/href/sortOrder/isActive)
router.patch(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
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
