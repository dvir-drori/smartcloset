import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});
