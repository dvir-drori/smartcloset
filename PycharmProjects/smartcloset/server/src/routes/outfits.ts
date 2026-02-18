import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createOutfit,
  getOutfits,
  getOutfit,
  updateOutfit,
  deleteOutfit,
  createOutfitSchema,
  updateOutfitSchema,
} from '../controllers/outfitController';

const router = Router();

router.post('/', authenticate, validate(createOutfitSchema), createOutfit);
router.get('/', authenticate, getOutfits);
router.get('/:id', authenticate, getOutfit);
router.put('/:id', authenticate, validate(updateOutfitSchema), updateOutfit);
router.delete('/:id', authenticate, deleteOutfit);

export default router;
