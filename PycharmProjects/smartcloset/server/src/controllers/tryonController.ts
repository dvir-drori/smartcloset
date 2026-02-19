import { Response } from 'express';
import path from 'path';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../types/auth';
import { generateTryOn } from '../services/tryonService';
import { deleteTryOnImage } from '../services/imageService';

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

function resolveAbsolutePath(imageUrl: string): string {
  // imageUrl is like /uploads/filename.jpg
  const relativePath = imageUrl.replace(/^\/uploads\//, '');
  return path.join(UPLOAD_DIR, relativePath);
}

export async function generateTryOnResult(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { clothingItemId } = req.body;

    if (!clothingItemId) {
      res.status(400).json({ error: 'clothingItemId is required' });
      return;
    }

    // Find user's FRONT body photo
    const bodyPhoto = await prisma.bodyPhoto.findUnique({
      where: { userId_angle: { userId, angle: 'FRONT' } },
    });

    if (!bodyPhoto) {
      res.status(400).json({ error: 'Upload a front body photo first' });
      return;
    }

    // Find clothing item and verify ownership
    const clothingItem = await prisma.clothingItem.findUnique({
      where: { id: clothingItemId },
    });

    if (!clothingItem) {
      res.status(404).json({ error: 'Clothing item not found' });
      return;
    }
    if (clothingItem.userId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    // Check cache
    const cached = await prisma.tryOnResult.findUnique({
      where: {
        bodyPhotoId_clothingItemId: {
          bodyPhotoId: bodyPhoto.id,
          clothingItemId,
        },
      },
    });

    if (cached) {
      res.json(cached);
      return;
    }

    // Generate try-on
    const bodyPhotoPath = resolveAbsolutePath(bodyPhoto.imageUrl);
    const garmentPath = resolveAbsolutePath(clothingItem.imageUrl);
    const description = `${clothingItem.color} ${clothingItem.subcategory}`.trim();

    const resultImageUrl = await generateTryOn(bodyPhotoPath, garmentPath, description);

    const tryOnResult = await prisma.tryOnResult.create({
      data: {
        userId,
        bodyPhotoId: bodyPhoto.id,
        clothingItemId,
        resultImageUrl,
      },
    });

    res.status(201).json(tryOnResult);
  } catch (error) {
    console.error('Generate try-on error:', error);
    res.status(500).json({ error: 'Failed to generate try-on. Please try again.' });
  }
}

export async function getTryOnResults(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const results = await prisma.tryOnResult.findMany({
      where: { userId },
      include: {
        clothingItem: {
          select: { id: true, name: true, category: true, color: true, thumbnailUrl: true, imageUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json(results);
  } catch (error) {
    console.error('Get try-on results error:', error);
    res.status(500).json({ error: 'Failed to get try-on results' });
  }
}

export async function getTryOnResultForItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const clothingItemId = req.params.clothingItemId as string;

    const bodyPhoto = await prisma.bodyPhoto.findUnique({
      where: { userId_angle: { userId, angle: 'FRONT' } },
    });

    if (!bodyPhoto) {
      res.json({ hasBodyPhoto: false, result: null });
      return;
    }

    const result = await prisma.tryOnResult.findUnique({
      where: {
        bodyPhotoId_clothingItemId: {
          bodyPhotoId: bodyPhoto.id,
          clothingItemId,
        },
      },
    });

    res.json({ hasBodyPhoto: true, result });
  } catch (error) {
    console.error('Get try-on result error:', error);
    res.status(500).json({ error: 'Failed to get try-on result' });
  }
}

export async function invalidateTryOnForBodyPhoto(bodyPhotoId: string): Promise<void> {
  const results = await prisma.tryOnResult.findMany({
    where: { bodyPhotoId },
  });

  for (const result of results) {
    deleteTryOnImage(result.resultImageUrl);
  }

  await prisma.tryOnResult.deleteMany({
    where: { bodyPhotoId },
  });
}

export async function invalidateTryOnForClothingItem(clothingItemId: string): Promise<void> {
  const results = await prisma.tryOnResult.findMany({
    where: { clothingItemId },
  });

  for (const result of results) {
    deleteTryOnImage(result.resultImageUrl);
  }

  await prisma.tryOnResult.deleteMany({
    where: { clothingItemId },
  });
}
