import { Router, type IRouter } from "express";
import { z } from "zod";
import { wishlistController } from "../controllers/wishlist.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";

const addToWishlistSchema = z.object({
  productId: z.string().cuid(),
});

const router: IRouter = Router();

router.use(authenticate);

router.get("/", asyncHandler(wishlistController.getWishlist));
router.post("/", validate({ body: addToWishlistSchema }), asyncHandler(wishlistController.addToWishlist));
router.delete("/:productId", asyncHandler(wishlistController.removeFromWishlist));
router.get("/:productId/check", asyncHandler(wishlistController.checkWishlist));

export { router as wishlistRouter };
