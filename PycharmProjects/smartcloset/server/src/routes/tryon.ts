import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import { generateTryOnResult, generateTryOnStream, getTryOnResults, getTryOnResultForItem } from '../controllers/tryonController';

const router = Router();

const tryonRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many try-on requests. Please wait before trying again.' },
});

router.post('/generate', authenticate, tryonRateLimit, generateTryOnResult);
router.get('/generate/stream', authenticate, tryonRateLimit, generateTryOnStream);
router.get('/results', authenticate, getTryOnResults);
router.get('/result/:clothingItemId', authenticate, getTryOnResultForItem);

export default router;
