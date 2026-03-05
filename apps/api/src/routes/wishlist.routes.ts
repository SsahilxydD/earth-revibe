import { Router, type IRouter } from "express";
import { wishlistController } from "../controllers/wishlist.controller";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

const router: IRouter = Router();

router.use(authenticate);

router.get("/", asyncHandler(wishlistController.getWishlist));
router.post("/", asyncHandler(wishlistController.addToWishlist));
router.delete("/:productId", asyncHandler(wishlistController.removeFromWishlist));
router.get("/:productId/check", asyncHandler(wishlistController.checkWishlist));

export { router as wishlistRouter };
