import { Router, type IRouter } from "express";
import { searchController } from "../controllers/search.controller";
import { asyncHandler } from "../utils/async-handler";

const router: IRouter = Router();

router.get("/", asyncHandler(searchController.search));
router.get("/autocomplete", asyncHandler(searchController.autocomplete));

export { router as searchRouter };
