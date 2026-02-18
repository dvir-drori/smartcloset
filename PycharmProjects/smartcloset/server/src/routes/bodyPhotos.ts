import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { uploadBodyPhoto, getBodyPhotos, deleteBodyPhoto, angleSchema } from '../controllers/bodyPhotoController';

const router = Router();

// Multer runs before validate so req.body.angle is populated from multipart data
router.post('/', authenticate, upload.single('image'), validate(angleSchema), uploadBodyPhoto);
router.get('/', authenticate, getBodyPhotos);
router.delete('/:id', authenticate, deleteBodyPhoto);

export default router;
