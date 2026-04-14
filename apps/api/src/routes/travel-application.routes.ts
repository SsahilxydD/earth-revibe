import { Router, type IRouter } from 'express';
import { travelApplicationController } from '../controllers/travel-application.controller';
import { validate } from '../middleware/validate';
import { optionalAuthenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { travelApplicationSubmitSchema } from '@earth-revibe/shared';

const router: IRouter = Router();

router.post(
  '/',
  optionalAuthenticate,
  validate({ body: travelApplicationSubmitSchema }),
  asyncHandler(travelApplicationController.submit)
);

export { router as travelApplicationRouter };
