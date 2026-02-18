import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getProfile, upsertProfile, updateUser, getStats, upsertProfileSchema, updateUserSchema } from '../controllers/profileController';

const router = Router();

router.get('/', authenticate, getProfile);
router.put('/', authenticate, validate(upsertProfileSchema), upsertProfile);
router.patch('/user', authenticate, validate(updateUserSchema), updateUser);
router.get('/stats', authenticate, getStats);

export default router;
