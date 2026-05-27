import { Router, type IRouter } from 'express';
import { reviewController } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router: IRouter = Router();

// Public — anyone can read approved reviews for a product.
router.get('/products/:productId', asyncHandler(reviewController.listByProduct));

// Authenticated — only logged-in customers can submit a review.
router.post('/', authenticate, asyncHandler(reviewController.create));

export { router as reviewRouter };
