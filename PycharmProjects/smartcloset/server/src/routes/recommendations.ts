import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  getOutfitRecommendations,
  saveRecommendation,
  saveRecommendationSchema,
} from '../controllers/recommendationController';

const router = Router();

router.get('/', authenticate, getOutfitRecommendations);
router.post('/save', authenticate, validate(saveRecommendationSchema), saveRecommendation);

export default router;
