import { Router, type IRouter } from "express";
import { blogController } from "../controllers/blog.controller";
import { asyncHandler } from "../utils/async-handler";

const router: IRouter = Router();

router.get("/", asyncHandler(blogController.listPublished));
router.get("/categories", asyncHandler(blogController.listCategories));
router.get("/:slug", asyncHandler(blogController.getBySlug));

export { router as blogRouter };
