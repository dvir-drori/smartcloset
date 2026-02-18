import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createWearLog, getWearLogs, deleteWearLog, createWearLogSchema } from '../controllers/wearLogController';

const router = Router();

router.post('/', authenticate, validate(createWearLogSchema), createWearLog);
router.get('/', authenticate, getWearLogs);
router.delete('/:id', authenticate, deleteWearLog);

export default router;
