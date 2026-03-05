import { Router, type IRouter } from "express";
import { adminBlogController } from "../controllers/admin-blog.controller";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import { createBlogPostSchema, updateBlogPostSchema, createBlogCategorySchema, createBlogTagSchema, UserRole } from "@earth-revibe/shared";

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

// Posts
router.get("/", asyncHandler(adminBlogController.listAll));
router.get("/:id", asyncHandler(adminBlogController.getById));
router.post("/", validate({ body: createBlogPostSchema }), asyncHandler(adminBlogController.create));
router.put("/:id", validate({ body: updateBlogPostSchema }), asyncHandler(adminBlogController.update));
router.delete("/:id", asyncHandler(adminBlogController.delete));

// Categories
router.get("/categories/list", asyncHandler(adminBlogController.listCategories));
router.post("/categories", validate({ body: createBlogCategorySchema }), asyncHandler(adminBlogController.createCategory));
router.delete("/categories/:id", asyncHandler(adminBlogController.deleteCategory));

// Tags
router.get("/tags/list", asyncHandler(adminBlogController.listTags));
router.post("/tags", validate({ body: createBlogTagSchema }), asyncHandler(adminBlogController.createTag));
router.delete("/tags/:id", asyncHandler(adminBlogController.deleteTag));

export { router as adminBlogRouter };
