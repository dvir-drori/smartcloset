import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import bodyPhotoRoutes from './routes/bodyPhotos';
import clothingItemRoutes from './routes/clothingItems';
import profileRoutes from './routes/profile';
import outfitRoutes from './routes/outfits';
import wearLogRoutes from './routes/wearLogs';
import { ensureUploadDirs } from './services/imageService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files - serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Ensure upload directories exist
ensureUploadDirs();

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/body-photos', bodyPhotoRoutes);
app.use('/api/clothing-items', clothingItemRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/outfits', outfitRoutes);
app.use('/api/wear-logs', wearLogRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
