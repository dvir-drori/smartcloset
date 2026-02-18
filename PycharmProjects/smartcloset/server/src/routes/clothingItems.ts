import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import {
  createClothingItem,
  getClothingItems,
  getClothingItem,
  updateClothingItem,
  deleteClothingItem,
  toggleFavorite,
  createClothingItemSchema,
  updateClothingItemSchema,
} from '../controllers/clothingItemController';

const router = Router();

router.post('/', authenticate, upload.single('image'), validate(createClothingItemSchema), createClothingItem);
router.get('/', authenticate, getClothingItems);
router.get('/:id', authenticate, getClothingItem);
router.put('/:id', authenticate, upload.single('image'), validate(updateClothingItemSchema), updateClothingItem);
router.delete('/:id', authenticate, deleteClothingItem);
router.patch('/:id/favorite', authenticate, toggleFavorite);

export default router;
