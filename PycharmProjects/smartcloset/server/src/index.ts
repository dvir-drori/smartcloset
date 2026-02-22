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
import recommendationRoutes from './routes/recommendations';
import tryonRoutes from './routes/tryon';
import { ensureUploadDirs } from './services/imageService';
import prisma from './utils/prisma';

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
  max: 200,
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
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/tryon', tryonRoutes);

// Global error handler — catches unhandled errors from async routes
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Clean up expired refresh tokens periodically
async function cleanupExpiredTokens() {
  try {
    const { count } = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (count > 0) {
      console.log(`Cleaned up ${count} expired refresh tokens`);
    }
  } catch (err) {
    console.error('Token cleanup error:', err);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Run cleanup on startup and every hour
  cleanupExpiredTokens();
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
});

export default app;
