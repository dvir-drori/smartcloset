import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../types/auth';
import { createThumbnail, getImageUrl, deleteImage } from '../services/imageService';

export const angleSchema = z.object({
  angle: z.enum(['FRONT', 'SIDE', 'BACK']),
});

export async function uploadBodyPhoto(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { angle } = req.body as z.infer<typeof angleSchema>;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'Image file is required' });
      return;
    }

    const imageUrl = getImageUrl(file.filename);
    const thumbnailUrl = await createThumbnail(file.filename);

    // Check for existing photo at this angle to delete old file after DB write
    const existing = await prisma.bodyPhoto.findUnique({
      where: { userId_angle: { userId, angle } },
    });

    const photo = await prisma.bodyPhoto.upsert({
      where: { userId_angle: { userId, angle } },
      update: { imageUrl },
      create: { userId, angle, imageUrl },
    });

    // Delete old file only after DB write succeeds
    if (existing && existing.imageUrl !== imageUrl) {
      deleteImage(existing.imageUrl);
    }

    res.status(201).json({ ...photo, thumbnailUrl });
  } catch (error) {
    console.error('Upload body photo error:', error);
    res.status(500).json({ error: 'Failed to upload body photo' });
  }
}

export async function getBodyPhotos(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const photos = await prisma.bodyPhoto.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    res.json(photos);
  } catch (error) {
    console.error('Get body photos error:', error);
    res.status(500).json({ error: 'Failed to get body photos' });
  }
}

export async function deleteBodyPhoto(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const photo = await prisma.bodyPhoto.findUnique({ where: { id } });

    if (!photo) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }

    if (photo.userId !== userId) {
      res.status(403).json({ error: 'Not authorized to delete this photo' });
      return;
    }

    await prisma.bodyPhoto.delete({ where: { id } });
    deleteImage(photo.imageUrl);

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Delete body photo error:', error);
    res.status(500).json({ error: 'Failed to delete body photo' });
  }
}
