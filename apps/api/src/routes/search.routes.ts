import { Router } from "express";
import { searchController } from "../controllers/search.controller";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

router.get("/", asyncHandler(searchController.search));
router.get("/autocomplete", asyncHandler(searchController.autocomplete));

export { router as searchRouter };
